import * as Progress from '../platform/progress.js';
import * as Rewards from '../platform/rewards.js';
import * as Settings from '../platform/settings.js';
import {validateCatalog, validateGame} from '../platform/catalog.js';
import {addVillageCompletion, loadVillage, saveVillage, villageSummary} from './village-state.js';

const ALLOWED = new Set(['snack-count', 'measure-lab', 'kind-dialogue']);
const CHILDREN = {tae: '태희', se: '세희'};
const respond = (action, requestId, values = {}) =>
  ({action, requestId, ok: true, ...values});

export function createVillageHost(emit) {
  if (typeof emit !== 'function') throw new TypeError('emit is required');
  let catalog;
  let currentGame;
  let currentGameId = '';
  const cache = new Map();

  async function prepare() {
    if (catalog) return catalog;
    const url = new URL('../games/catalog.json', import.meta.url);
    const result = await fetch(url);
    if (!result.ok) throw new Error('학습 게임 목록을 불러오지 못했어요.');
    catalog = validateCatalog(await result.json());
    Progress.configureCatalog(catalog);
    Rewards.syncRewards(catalog, Progress.learner());
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
      index: round.index + 1,
      total: round.ids.length
    };
  }

  function snapshot(action, requestId, extras = {}) {
    const who = Progress.learner();
    const wallet = Rewards.wallet(catalog, who);
    const flowers = villageSummary(loadVillage(), who);
    return respond(action, requestId, {
      who,
      displayName: CHILDREN[who],
      available: wallet.available,
      lifetime: wallet.lifetime,
      flowers: flowers.flowers,
      familyFlowers: flowers.familyFlowers,
      ...extras
    });
  }

  async function execute(request) {
    if (!request || typeof request !== 'object' || Array.isArray(request))
      throw new Error('Unity 요청 형식이 올바르지 않아요.');
    const {action, requestId, gameId = '', response = '', roundId = ''} = request;
    if (typeof action !== 'string' || typeof requestId !== 'string' ||
        requestId.length > 100) throw new Error('Unity 요청 식별자를 확인해 주세요.');
    await prepare();
    const who = Progress.learner();

    if (action === 'INIT') return snapshot(action, requestId);
    if (action === 'START') {
      const game = await loadGame(gameId);
      const round = Progress.beginRound(game, {size: Progress.LEARNERS[who].roundSize});
      currentGame = game;
      currentGameId = gameId;
      return snapshot(action, requestId, {question: publicQuestion(game, round, who)});
    }
    if (!currentGame || currentGameId !== gameId)
      throw new Error('현재 미션이 일치하지 않아요.');

    if (action === 'SUBMIT') {
      if (typeof response !== 'string' || response.length > 1024)
        throw new Error('답안 형식을 확인해 주세요.');
      let answer;
      try { answer = JSON.parse(response); }
      catch { throw new Error('답안 정보를 읽을 수 없어요.'); }
      const round = Progress.gameProgress(gameId, who).round;
      const question = currentGame.questions.find(q => q.id === round?.ids[round.index]);
      if (!question) throw new Error('현재 문제를 찾지 못했어요.');
      const result = Progress.answerQuestion(currentGame, answer);
      if (!result) throw new Error('이미 답안을 제출했어요. 다음 문제로 이동해 주세요.');
      return snapshot(action, requestId, {
        correct: result.correct,
        earned: result.earned,
        explanation: (question.explanation || []).map(t => decorate(t, who)).join('\n')
      });
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
      return snapshot(action, requestId, {finished: true, roundId});
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
        emit(await execute(command));
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
