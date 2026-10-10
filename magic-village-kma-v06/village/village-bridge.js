import * as Progress from '../platform/progress.js';
import * as Rewards from '../platform/rewards.js';
import * as Settings from '../platform/settings.js';
import {recommendVillageRoutes} from '../platform/village-adaptive.js';
import {validateCatalog, validateGame} from '../platform/catalog.js';
import {addVillageCompletion, loadVillage, saveVillage, villageSummary} from './village-state.js';

const BEBSU_GAMES = ['g1','g2','g3','g4','g5','g6','m1','m2','m3']
  .map(grade=>'bebsu-'+grade+'-original');
const ALLOWED = new Set(['snack-count', 'measure-lab', 'kind-dialogue', ...BEBSU_GAMES]);
const safeBebsuImage = value => typeof value === 'string' &&
  /^\.\/assets\/bebsu\/math\/[a-f0-9]{16}\.png$/.test(value) ? '../../' + value.slice(2) : '';
const CHILDREN = {tae: '태희', se: '세희'};
const respond = (action, requestId, values = {}) =>
  ({action, requestId, ok: true, ...values});

export function createVillageHost(emit) {
  if (typeof emit !== 'function') throw new TypeError('emit is required');
  let catalog;
  let challenges;
  let currentGame;
  let currentGameId = '';
  let currentWho = '';
  let preparation = null;
  const receipts = new Map();
  const cache = new Map();

  async function prepare() {
    if (catalog) return catalog;
    if (preparation) return preparation;
    preparation = initialize().finally(() => { preparation = null; });
    return preparation;
  }

  async function initialize() {
    const url = new URL('../games/catalog.json', import.meta.url);
    const result = await fetch(url);
    if (!result.ok) throw new Error('학습 게임 목록을 불러오지 못했어요.');
    const entries = validateCatalog(await result.json());
    Progress.configureCatalog(entries);
    try {
      const bankResponse = await fetch(new URL('../games/irt-bank.json', import.meta.url));
      if (!bankResponse.ok) throw new Error('문항 색인을 불러오지 못했어요.');
      Progress.configureIrtBank(await bankResponse.json());
    } catch (error) {
      console.warn('마법마을 기본 출제 방식 사용:', error);
    }
    const challengeResponse = await fetch(new URL('../games/bebsu-challenges.json', import.meta.url));
    if (!challengeResponse.ok) throw new Error('경시대회 25문항 시험지 목록을 불러오지 못했어요.');
    challenges = await challengeResponse.json();
    if (challenges?.version !== 1 || !Array.isArray(challenges.grades) || challenges.grades.length !== 9)
      throw new Error('경시대회 문제은행 구성을 확인해 주세요.');
    Rewards.syncRewards(entries, Progress.learner());
    catalog = entries;
    return catalog;
  }

  async function loadGame(gameId) {
    const entries = await prepare();
    if (!ALLOWED.has(gameId)) throw new Error('이 마을에서는 아직 열리지 않은 놀이예요.');
    const entry = entries.find(item => item.id === gameId && item.status === 'published');
    if (!entry || entry.kind !== 'quiz') throw new Error('학습 게임 정보를 확인해 주세요.');
    if (cache.has(gameId)) return cache.get(gameId);
    const path = entry.source.replace(/^\.\//, '');
    const response = await fetch(new URL('../' + path, import.meta.url));
    if (!response.ok) throw new Error('학습 문제를 불러오지 못했어요.');
    const game = validateGame(await response.json(), entry);
    cache.set(gameId, game);
    return game;
  }

  function decorate(text, who) {
    return Settings.personalize(String(text ?? ''), who, CHILDREN[who]);
  }

  function hintFor(item, game) {
    if(typeof item.hint==='string'&&item.hint.trim())return item.hint;
    if(game.id==='measure-lab')return '무엇을 재는지와 숫자 뒤의 단위를 먼저 살펴봐요. 단위가 다르면 같은 단위로 바꾼 뒤 비교해요.';
    if(game.id==='kind-dialogue')return '이야기의 친구가 원하는 일을 먼저 생각해요. 각 말이 어떤 뜻을 전하는지 하나씩 비교해요.';
    const mode=item.interaction?.type??'choice';
    if(mode==='build')return '이야기에서 필요한 개수를 찾아요. 하나씩 담거나 덜면서 손가락으로 세어 봐요.';
    if(item.visual?.kind==='groups')return '그림의 물건을 하나씩 짚어 세어요. 물어본 것이 전체 개수인지, 더 많은 쪽인지도 확인해요.';
    if(item.visual?.kind==='counters')return '처음에 몇 개였는지 찾아요. 더하는지 덜어 내는지 살펴보고 한 개씩 세어 봐요.';
    return '이야기에서 물어본 것을 찾아요. 그림과 보기를 하나씩 살펴보고 내 생각을 말해 봐요.';
  }

  function publicQuestion(game, round, who) {
    if (!round || round.finished) throw new Error('진행 중인 문제가 없어요.');
    const item = game.questions.find(q => q.id === round.ids[round.index]);
    if (!item) throw new Error('현재 문제를 찾지 못했어요.');
    const mode = item.interaction?.type ?? 'choice';
    return {
      gameId: game.id,
      questionId: item.id,
      title: decorate(item.title, who),
      story: decorate(item.story, who),
      prompt: decorate(item.prompt, who),
      interactionType: mode,
      choices: item.choices ?? [],
      left: item.interaction?.left ?? [],
      right: item.interaction?.rightLabels ?? item.interaction?.right ?? [],
      items: item.interaction?.itemLabels ?? item.interaction?.items ?? [],
      emoji: item.interaction?.emoji ?? item.visual?.emoji ?? '⭐',
      unit: item.interaction?.unit ?? '',
      target: mode === 'build' ? item.interaction.target : 0,
      max: mode === 'build' ? item.interaction.max : 0,
      hintAvailable: Boolean(hintFor(item, game)),
      visual: item.visual ?? null,
      hinted: round.hinted === true,
      index: round.index + 1,
      total: round.ids.length,
      paperId: round.paperId || '',
      problemImage: safeBebsuImage(item.problemImage),
      solutionImage: safeBebsuImage(item.solutionImage)
    };
  }

  function snapshot(action, requestId, extras = {}) {
    const who = Progress.learner();
    const wallet = Rewards.wallet(catalog, who);
    const flowers = villageSummary(loadVillage(), who);
    const equipment = wallet.look || {};
    return respond(action, requestId, {
      cosmetics: {
        light: wallet.equipped || '',
        background: equipment.background?.id || '',
        friend: equipment.friend?.id || '',
        mark: equipment.mark?.id || '',
        title: equipment.title?.id || ''
      },
      who,
      displayName: CHILDREN[who],
      available: wallet.available,
      lifetime: wallet.lifetime,
      reinforcementStars: wallet.reinforcementStars,
      explanationStars: wallet.explanationStars,
      recoveryStars: wallet.recoveryStars,
      flowers: flowers.flowers,
      familyFlowers: flowers.familyFlowers,
      ...extras
    });
  }

  async function execute(request) {
    if (!request || typeof request !== 'object' || Array.isArray(request))
      throw new Error('Unity 요청 형식이 올바르지 않아요.');
    const {action, requestId, gameId = '', response = '', roundId = '', paperId = '',
      itemId = '', category = '', subject = 'math', grade = '',strategy = ''} = request;
    if (typeof action !== 'string' || typeof requestId !== 'string' ||
        requestId.length > 100) throw new Error('Unity 요청 식별자를 확인해 주세요.');
    await prepare();
    const who = Progress.learner();

    if (action === 'INIT') return snapshot(action, requestId);
    const shopState = () => {
      const wallet = Rewards.wallet(catalog,who);
      return {available:wallet.available,look:wallet.look,
        items:wallet.items.filter(item=>item.kind==='cosmetic').map(item=>({
          id:item.id,category:item.category,title:item.title,description:item.description,
          emoji:item.emoji,cost:item.cost,owned:item.owned,equipped:item.equipped,
          canPurchase:item.canPurchase
        }))};
    };
    if (action === 'SHOP_OPEN') return snapshot(action, requestId, {shop:shopState()});
    if (action === 'SHOP_BUY') {
      if (typeof itemId!=='string' || itemId.length>80) throw new Error('선물 이름을 확인해 주세요.');
      const outcome=Rewards.purchaseReward(itemId,catalog,who);
      if (!outcome.ok) throw new Error(outcome.reason==='insufficient-stars'?
        '별이 조금 더 필요해요. 학습을 하며 모아 볼까요?': '별 상점의 결제를 기록하지 못했어요.');
      return snapshot(action, requestId, {shop:shopState(),itemChanged:itemId});
    }
    if (action === 'SHOP_EQUIP') {
      if (typeof itemId!=='string' || itemId.length>80) throw new Error('장착할 선물을 확인해 주세요.');
      Rewards.equipReward(itemId,who);
      return snapshot(action, requestId, {shop:shopState(),itemChanged:itemId});
    }
    if (action === 'SHOP_UNEQUIP') {
      if (!['light','background','friend','mark','title'].includes(category))
        throw new Error('장착 해제할 부위를 확인해 주세요.');
      Rewards.unequipCategory(category,who);
      return snapshot(action, requestId, {shop:shopState(),itemChanged:category});
    }
    if (action === 'ADAPTIVE_OFFER') {
      return snapshot(action, requestId, {adaptive:recommendVillageRoutes(catalog, {
        who,subject,grade:grade||(who==='se'?'K':'G1')
      })});
    }
    if (action === 'SHOW_BEBSU') return snapshot(action, requestId, {
      challenges: challenges.grades.map(({grade,title,gameId,papers})=>({
        grade,title,gameId,papers:papers.map(({paperId,difficulty,label,title})=>({paperId,difficulty,label,title}))
      })),
      difficultyNote: challenges.accuracyNote
    });
    if (action === 'CANCEL') {
      currentGame = null; currentGameId = ''; currentWho = '';
      return snapshot(action, requestId);
    }
    if (action === 'START') {
      const game = await loadGame(gameId);
      if (Progress.learner() !== who)
        throw new Error('아이가 바뀌었어요. 새로 미션을 열어 주세요.');
      let round;
      if (BEBSU_GAMES.includes(gameId)) {
        const grade=challenges.grades.find(row=>row.gameId===gameId);
        if (!grade || !grade.papers.some(row=>row.paperId===paperId))
          throw new Error('학년과 도전 수준을 선택한 뒤 시작해 주세요.');
        round = Progress.beginRound(game, {paperId});
      } else round = Progress.beginRound(game, {size: Progress.LEARNERS[who].roundSize});
      currentGame = game;
      currentGameId = gameId;
      currentWho = who;
      const answered = round.answers[round.index];
      const item = game.questions.find(q=>q.id===round.ids[round.index]);
      return snapshot(action, requestId, {
        question: publicQuestion(game, round, who),
        answered: Boolean(answered), correct: answered?.correct ?? false, earned: 0,
        explanation: answered ? (item.explanation||[]).map(t=>decorate(t,who)).join('\n') : ''
      });
    }
    if (currentWho && currentWho !== who) {
      currentGame = null; currentGameId = ''; currentWho = '';
      throw new Error('아이가 바뀌었어요. 새로 미션을 열어 주세요.');
    }
    if (!currentGame || currentGameId !== gameId)
      throw new Error('현재 미션이 일치하지 않아요.');

    if (action === 'HINT') {
      const round = Progress.gameProgress(gameId, who).round;
      const question = currentGame.questions.find(q => q.id === round?.ids[round.index]);
      if (!question || !Progress.markHint(gameId)) throw new Error('지금은 힌트를 볼 수 없어요.');
      return snapshot(action, requestId, {hint: decorate(hintFor(question, currentGame), who)});
    }
    if (action === 'SUBMIT') {
      if (typeof response !== 'string' || response.length > 1024)
        throw new Error('답안 형식을 확인해 주세요.');
      let answer;
      try { answer = JSON.parse(response); }
      catch { throw new Error('답안 정보를 읽을 수 없어요.'); }
      const round = Progress.gameProgress(gameId, who).round;
      const question = currentGame.questions.find(q => q.id === round?.ids[round.index]);
      if (!question) throw new Error('현재 문제를 찾지 못했어요.');
      const before=Rewards.wallet(catalog,who).recoveryStars;
      const result = Progress.answerQuestion(currentGame, answer);
      if (!result) throw new Error('이미 답안을 제출했어요. 다음 문제로 이동해 주세요.');
      const refreshed=Rewards.syncRewards(catalog,who);
      return snapshot(action, requestId, {
        recoveryEarned: Math.max(0,refreshed.recoveryStars-before),
        correct: result.correct,
        earned: result.earned,
        explanation: (question.explanation || []).map(t => decorate(t, who)).join('\n')
      });
    }
    if (action === 'REFLECT') {
      if(typeof roundId!=='string'||roundId.length>128||typeof strategy!=='string')
        throw new Error('완주 기록과 생각한 방법을 확인해 주세요.');
      const reflection=Rewards.recordLearningExplanation({who,gameId,roundId,strategy});
      return snapshot(action,requestId,{reflectionEarned:reflection.earned,
        reflectionReason:reflection.reason,reflectionAdded:reflection.added});
    }
    if (action === 'NEXT') {
      const round = Progress.nextQuestion(currentGameId);
      if (round?.finished) {
        Rewards.syncRewards(catalog, who);
        return snapshot(action, requestId, {finished: true, roundId: round.id});
      }
      return snapshot(action, requestId, {question: publicQuestion(currentGame, round, who)});
    }
    if (action === 'COMPLETE_WORLD') {
      if (typeof roundId !== 'string' || roundId.length > 128)
        throw new Error('완료한 회차를 확인해 주세요.');
      const saved = Progress.gameProgress(gameId, who).completedRounds
        .some(round => round.id === roundId);
      if (!saved) throw new Error('학습 회차가 완료되지 않았어요.');
      const updated = addVillageCompletion(loadVillage(), {who, gameId, roundId});
      if (updated.added && !saveVillage(updated.state))
        throw new Error('마을 기록을 저장할 수 없어요. 브라우저 저장 공간을 확인해 주세요.');
      return snapshot(action, requestId, {finished: true, roundId, gardenAdded: updated.added,
        challengeBonus: Rewards.challengeRoundBonus(catalog,who,gameId,roundId) });
    }
    throw new Error('지원하지 않는 Unity 요청이에요.');
  }

  let sequence = Promise.resolve();
  function handle(raw) {
    // Serialize mutations, including duplicate taps, to protect idempotency.
    const task = async () => {
      let command;
      try {
        command = JSON.parse(raw);
        const key = command?.requestId;
        if (typeof key !== 'string' || !/^[a-zA-Z0-9_-]{1,100}$/.test(key)) throw new Error('요청 식별자를 확인해 주세요.');
        const old = receipts.get(key);
        if (old) {
          if (old.raw !== raw) throw new Error('같은 요청 번호에 다른 내용을 보낼 수 없어요.');
          if (old.reply.who !== Progress.learner()) throw new Error('아이가 바뀌었어요. 새로 미션을 열어 주세요.');
          emit(old.reply);
          return;
        }
        const reply = await execute(command);
        receipts.set(key, {raw, reply});
        if (receipts.size > 128) receipts.delete(receipts.keys().next().value);
        emit(reply);
      } catch (error) {
        emit({
          action: command?.action || 'ERROR',
          requestId: command?.requestId || '',
          ok: false,
          error: error instanceof Error ? error.message : '학습 앱에 오류가 발생했어요.'
        });
      }
    };
    sequence = sequence.then(task, task);
    return sequence;
  }
  return {handle, prepare};
}
