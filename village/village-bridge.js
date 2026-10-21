import {checkPlay,recordPlay} from '../platform/play-balance.js';
import * as PondSession from '../platform/pond-session.js';
import {choosePondQuestion} from '../platform/pond-learning-guide.js';
import * as Progress from '../platform/progress.js';
import * as Growth from '../platform/growth.js';
import {gardenSnapshot,mutateGarden} from './garden-state.js';
import * as Rewards from '../platform/rewards.js';
import * as Settings from '../platform/settings.js';
import {recommendVillageRoutes} from '../platform/village-adaptive.js';
import * as LearningDirector from '../platform/learning-director.js?v=pond-v22-20261017';
import {retainedMemoryMoment} from '../platform/learning-moments.js?v=relationship-v18-20261015';
import {validateCatalog, validateGame} from '../platform/catalog.js';
import {addVillageCompletion, loadVillage, saveVillage, villageSummary} from './village-state.js';
import * as Relationships from './relationship-state.js?v=ecology-v19-20261015';
import * as Ecology from './ecology-state.js?v=ecology-v19-20261015';
import * as Resources from '../platform/resource-economy.js';
import * as Careers from './career-state.js?v=career-v25-20261019';

const BEBSU_GAMES = ['g1','g2','g3','g4','g5','g6','m1','m2','m3']
  .map(grade=>'bebsu-'+grade+'-original');
const PRACTICE_GAMES=['g1','g2','g3','g4','g5','g6','m1','m2','m3'].map(grade=>'magic-'+grade+'-challenge');
const ALLOWED=new Set();
const DISTRICTS=Object.freeze({
 math:{title:'🔢 수학 정원',intro:'수를 세고, 길이와 무게를 비교하고, 새로운 수학 이야기를 만나요.',subject:'math'},
 korean:{title:'📚 이야기 도서관',intro:'책과 이야기로 낱말·문장·읽기·말하기를 연습해요.',subject:'korean'},
 english:{title:'🌿 영어 숲',intro:'생활 속 영어 표현을 듣고 말하며 탐험해요.',subject:'english'},
 hanja:{title:'📜 한자 수련관',intro:'한자 모양을 살피고 뜻과 소리를 하나씩 알아봐요. 내가 풀어 본 기록에 맞춰 문제를 골라요.',subject:'hanja'},
 academy:{title:'🪄 마법학교',intro:'수학·국어·영어에서 오늘의 짧은 모험을 고르세요.',subject:'all'},
 growth:{title:'🌟 성장의 탑',intro:'오늘 새로 알게 된 것과 다음에 배우고 싶은 것을 살펴봐요.'},
 kma:{title:'🏆 뱁수 경시대회 성',intro:'뱁수와 수학 문제 25개를 차례로 만나 봐요. 어려우면 쉬었다가 다시 해도 돼요.'},
 practice:{title:'🧩 마법 수학 훈련장',intro:'숫자 문제 25개를 쉬운 문제부터 조금 더 생각하는 문제까지 풀어 봐요.'},
 pond:{title:'🐠 생명 연못',intro:'연못의 여러 물고기에게 먹이를 주고 자라는 모습을 관찰해요.'},
 ocean:{title:'🌊 푸른 바다',intro:'산호초와 먼바다의 생물을 알아봐요. 상어와 고래는 멀리서 안전하게 관찰해요.'},
 career:{title:'🏛️ 미래 직업 탐색관',intro:'우리 주변의 다양한 직업을 알아보고 흥미로운 일을 찾아봐요. 모든 일은 저마다 소중해요.'},
 shop:{title:'🎁 별빛 상점',intro:'모은 별로 요정과 마을을 꾸밀 선물을 골라요.'},
 garden:{title:'🌱 성장 정원',intro:'물·햇빛·노래로 나무와 꽃을 키워요.'}
});
const safeBebsuImage = value => typeof value === 'string' &&
  /^\.\/assets\/bebsu\/math\/[a-f0-9]{16}\.png$/.test(value) ? '../' + value.slice(2) : '';
const CHILDREN = {tae: '태희', se: '세희'};
const HANJA_GRADE_ORDER=['H8','H7II','H7','H6II','H6','H5II','H5','H4II','H4','H3II','H3'];
const respond = (action, requestId, values = {}) =>
  ({action, requestId, ok: true, ...values});

export function createVillageHost(emit) {
  if (typeof emit !== 'function') throw new TypeError('emit is required');
  let catalog;
  let challenges;
  let practiceChallenges;
  let currentGame;
  let currentGameId = '';
  let currentWho = '';
  let currentArea = 'home';
  let preparation = null;
  const receipts = new Map();
  const cache = new Map();
  let pondVisit=null,pondActive=false,guidedQuestion=null,lastGuidedSubject='';
  function stopPond(){if(pondVisit)PondSession.closeVisit(pondVisit);pondVisit=null;pondActive=false;}

  async function prepare() {
    if (catalog) return catalog;
    if (preparation) return preparation;
    preparation = initialize().finally(() => { preparation = null; });
    return preparation;
  }

  async function initialize() {
    const url = new URL('../games/catalog.json?v=child-safe-v32-20261019', import.meta.url);
    const result = await fetch(url);
    if (!result.ok) throw new Error('학습 게임 목록을 불러오지 못했어요.');
    const entries = validateCatalog(await result.json());
    Progress.configureCatalog(entries);
    for(const item of entries)if(item.kind==='quiz'&&item.status==='published')ALLOWED.add(item.id);
    try {
      const bankResponse = await fetch(new URL('../games/irt-bank.json?v=child-safe-v32-20261019', import.meta.url));
      if (!bankResponse.ok) throw new Error('문항 색인을 불러오지 못했어요.');
      Progress.configureIrtBank(await bankResponse.json());
    } catch (error) {
      console.warn('마법마을 기본 출제 방식 사용:', error);
    }
    const challengeResponse = await fetch(new URL('../games/bebsu-challenges.json?v=child-safe-v32-20261019', import.meta.url));
    if (!challengeResponse.ok) throw new Error('경시대회 25문항 시험지 목록을 불러오지 못했어요.');
    challenges = await challengeResponse.json();
    if (challenges?.version !== 1 || !Array.isArray(challenges.grades) || challenges.grades.length !== 9)
      throw new Error('경시대회 문제은행 구성을 확인해 주세요.');
    const practiceResponse=await fetch(new URL('../games/magic-practice-challenges.json?v=child-safe-v32-20261019',import.meta.url));
    if(!practiceResponse.ok)throw new Error('마법 연습장 시험지 목록을 불러오지 못했어요.');
    practiceChallenges=await practiceResponse.json();
    if(practiceChallenges.publicPractice!==true||practiceChallenges.grades?.length!==9)
      throw new Error('마법 연습장 문제은행을 확인해 주세요.');
    Rewards.syncRewards(entries, Progress.learner());
    Resources.configure(entries);
    PondSession.configure(entries);
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
    const response = await fetch(new URL('../' + path + '?v=child-safe-v32-20261019', import.meta.url));
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
    if(game.subject==='hanja')return '먼저 한자의 모양을 보고 뜻과 소리를 스스로 떠올려 봐요. 모르겠으면 학습카드를 다시 보아도 괜찮아요.';
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
      numericMin: mode === 'numeric' ? (item.interaction.min ?? 0) : 0,
      numericMax: mode === 'numeric' ? item.interaction.max : 0,
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

  function reconcileMemoryWorld(who){
    let state=Relationships.loadRelationships(),changed=false;
    let ecologyState=Ecology.loadEcology(),ecologyChanged=false;
    for(const entry of catalog||[]){
      if(entry.kind!=='quiz'||entry.status!=='published')continue;
      const progress=Progress.gameProgress(entry.id,who);
      for(const round of progress.completedRounds||[]){
        if(round.purpose!=='review')continue;
        const moment=retainedMemoryMoment(progress,round.id);
        if(!moment.kind)continue;
        const recorded=Relationships.recordMemory(state,{
          who,subject:entry.subject||'',tier:moment.kind,roundId:round.id,at:round.at||Date.now()
        });
        state=recorded.state;changed=changed||recorded.added;
        const skills=[...new Set((moment.questionIds||[]).map(id=>Progress.itemEvidence(entry.id,id)?.skill).filter(Boolean))];
        const eco=Ecology.recordEcologyMemory(ecologyState,{who,subject:entry.subject||'',tier:moment.kind,
          roundId:round.id,skills,at:round.at||Date.now()});
        ecologyState=eco.state;ecologyChanged=ecologyChanged||eco.added;
      }
    }
    if(changed)Relationships.saveRelationships(state);
    if(ecologyChanged)Ecology.saveEcology(ecologyState);
    return {relationships:state,ecology:ecologyState};
  }

  function snapshot(action, requestId, extras = {}) {
    const who = Progress.learner();
    const wallet = Rewards.wallet(catalog, who);
    const resourceWallet=Resources.wallet(catalog,who);
    const flowers = villageSummary(loadVillage(), who);
    const equipment = wallet.look || {};
    const relationshipState=Relationships.loadRelationships();
    const relationship=Relationships.relationshipSnapshot(relationshipState,who);
    const residents=currentArea==='plaza'?Relationships.familyResidentSnapshot(relationshipState):relationship.residents;
    const ecologyState=Ecology.loadEcology();
    const ecology=currentArea==='plaza'?Ecology.familyEcologySnapshot(ecologyState):Ecology.ecologySnapshot(ecologyState,who);
    return respond(action, requestId, {
      cosmetics: {
        light: wallet.equipped || '',
        background: equipment.background?.id || '',
        friend: equipment.friend?.id || '',
        mark: equipment.mark?.id || '',
        title: equipment.title?.id || ''
      },
      who,
      garden: gardenSnapshot(who,currentArea),
      displayName: CHILDREN[who],
      available: wallet.available,
      lifetime: wallet.lifetime,
      resources:{available:resourceWallet.available,earned:resourceWallet.earned,spent:resourceWallet.spent,deficits:resourceWallet.deficits,balancedDays:resourceWallet.balancedDays,visitAward:resourceWallet.visitAward,visitBonuses:resourceWallet.visitBonuses},
      pond:{who,fish:resourceWallet.fish.filter(f=>f.owned&&f.world==='pond').map(f=>({id:f.id,name:f.name,color:f.color,size:f.size,growth:f.growth,feedDays:f.feedDays})),owned:resourceWallet.fish.filter(f=>f.owned&&f.world==='pond').length},
      // The canonical reward model awards verified answer/session/effort stars.
      reinforcementStars: wallet.effortStars||0,
      explanationStars: 0,
      recoveryStars: 0,
      flowers: flowers.flowers,
      familyFlowers: flowers.familyFlowers,
      relationships:relationship.npcs,
      residents,
      relationshipTotals:relationship.totals,
      ecology:ecology.habitats,
      ecologyGuardian:ecology.guardianTree,
      ecologyTotals:ecology.totals,
      ...extras
    });
  }

  async function nextPondQuestion(action,requestId,who){
    const status=PondSession.refreshLearning(who,{catalog});
    if(status.allowed){guidedQuestion=null;return snapshot(action,requestId,{pondGuided:true,pondLessonComplete:true,pondSession:status});}
    const stages=Object.fromEntries(['math','korean','english','hanja'].map(s=>[s,Progress.stageSelection(s,who)]));
    const selection=choosePondQuestion({catalog,profile:Progress.exportRecords().platform.profiles[who],who,stages,learning:status.learning,lastSubject:lastGuidedSubject});
    if(!selection)throw new Error('지금 단계에서 새 문제를 모두 만나 봤어요. 보호자와 다음 배움 단계를 살펴보거나 잠시 쉬어도 좋아요.');
    const game=await loadGame(selection.gameId);
    const item=game.questions.find(q=>q.id===selection.questionId);
    if(!item)throw new Error('새로운 배움 문제를 다시 확인해 주세요.');
    const sessionId='pond-'+(globalThis.crypto?.randomUUID?.()||Date.now().toString(36)+'-'+Math.random().toString(36).slice(2));
    guidedQuestion={game,item,who,sessionId,shownAt:Date.now(),hinted:false,answer:null};
    lastGuidedSubject=game.subject;currentGame=game;currentGameId=game.id;currentWho=who;
    const question=publicQuestion(game,{ids:[item.id],index:0,hinted:false},who);
    return snapshot(action,requestId,{pondGuided:true,pondSession:status,question:{...question,subject:game.subject,pondGuided:true,index:(status.learning?.done||0)+1,total:status.learning?.total||status.requiredItems}});
  }
  const documentIsHidden=()=>globalThis.document?.hidden===true;
  function requireActivePond(who){
    if(!pondVisit||!pondActive||documentIsHidden())throw new Error('연못의 함께 보기 시작을 누른 뒤 물고기와 만나요.');
    const status=PondSession.tickVisit(pondVisit,{active:true});
    if(status.allowed===false){pondActive=false;throw new Error('물고기들이 잠깐 쉬어요. 여러 배움터의 새 문제를 만나 볼까요?');}
    if(pondVisit.who&&pondVisit.who!==who){stopPond();throw new Error('선택한 아이의 연못을 다시 열어 주세요.');}
  }

  async function execute(request) {
    if (!request || typeof request !== 'object' || Array.isArray(request))
      throw new Error('Unity 요청 형식이 올바르지 않아요.');
    const {action, requestId, gameId = '', response = '', roundId = '', paperId = '',
      itemId = '', category = '', subject = 'math', grade = '', strategy = '', purpose = '', district = ''} = request;
    if (typeof action !== 'string' || typeof requestId !== 'string' ||
        requestId.length > 100) throw new Error('Unity 요청 식별자를 확인해 주세요.');
    await prepare();
    const who = Progress.learner();
    if(pondVisit&&pondVisit.who&&pondVisit.who!==who)stopPond();
    if(['CANCEL','START','POND_LEARN'].includes(action)||(action==='AREA_OPEN'&&district!=='pond')||action==='OCEAN_OPEN')stopPond();
    if(['POND_BEGIN','POND_RESUME','POND_TICK','POND_PAUSE','POND_CLOSE'].includes(action)){
      if(action==='POND_CLOSE'){stopPond();}
      else if(action==='POND_PAUSE'){if(pondVisit)PondSession.pauseVisit(pondVisit);pondActive=false;}
      else if(action==='POND_BEGIN'||action==='POND_RESUME'){
        if(documentIsHidden())pondActive=false;
        else{
          pondVisit=pondVisit?await PondSession.resumeVisit(pondVisit):await PondSession.openVisit(who,{catalog});
          pondActive=pondVisit.allowed===true;
        }
      }else if(pondVisit&&pondActive){
        const result=PondSession.tickVisit(pondVisit,{active:!documentIsHidden()});
        pondActive=result.allowed!==false&&!documentIsHidden();
      }
      const pondStatus=pondVisit?.status||PondSession.status(who,{catalog});
      return respond(action,requestId,{who,pondSession:pondStatus,pondRunning:pondActive,resources:{available:Resources.wallet(catalog,who).available}});
    }
    if(action==='POND_LEARN'){
      guidedQuestion=null;return nextPondQuestion(action,requestId,who);
    }
    if(guidedQuestion&&['HINT','SUBMIT','NEXT'].includes(action)){
      const g=guidedQuestion;
      if(g.who!==who||gameId!==g.game.id)throw new Error('선택한 아이와 배움 문제를 다시 확인해 주세요.');
      if(action==='HINT'){
        if(g.answer)throw new Error('풀이를 함께 살펴봐요.');
        g.hinted=true;
        Progress.recordGuidedHint?.(g.game,g.item.id,{sessionId:g.sessionId,shownAt:g.shownAt});
        return snapshot(action,requestId,{pondGuided:true,hint:decorate(hintFor(g.item,g.game),who)});
      }
      if(action==='SUBMIT'){
        if(g.answer)throw new Error('다음 이야기를 만나 볼까요?');
        if(typeof response!=='string'||response.length>1024)throw new Error('답안 형식을 확인해 주세요.');
        let answer;try{answer=JSON.parse(response);}catch{throw new Error('답안 정보를 읽을 수 없어요.');}
        const result=Progress.answerGuidedQuestion(g.game,g.item.id,answer,{sessionId:g.sessionId,shownAt:g.shownAt,hinted:g.hinted});
        if(!result)throw new Error('이미 답을 살펴봤어요. 다음 이야기로 가요.');
        g.answer=result;
        const status=PondSession.recordLearning(who,{gameId:g.game.id,itemId:g.item.id,subject:g.game.subject,at:Date.now(),correct:result.correct,assisted:g.hinted},{catalog});
        Rewards.syncRewards(catalog,who);
        return snapshot(action,requestId,{pondGuided:true,pondSession:status,correct:result.correct,earned:result.earned,recoveryEarned:0,explanation:(g.item.explanation||[]).map(t=>decorate(t,who)).join('\n')});
      }
      if(!g.answer)throw new Error('내 생각을 먼저 골라 보아요.');
      guidedQuestion=null;return nextPondQuestion(action,requestId,who);
    }
    const visit=(locationId,extras={})=>{
      const bonus=Resources.awardFirstVisit(locationId,who);
      if(extras.pondShop)extras.pondShop=Resources.wallet(catalog,who);
      if(extras.career)extras.career={...extras.career,available:Resources.wallet(catalog,who).available};
      return snapshot(action,requestId,{...extras,...(bonus?{firstVisitBonus:bonus}:{})});
    };
    if (request.area==='home'||request.area==='plaza')currentArea=request.area;
    if(action.startsWith('GARDEN_')) {
      const selectedSlot=request.slot ?? (typeof response==='string'&&/^\d$/.test(response)?Number(response):-1);
      const isCare=action==='GARDEN_PLANT'||action==='GARDEN_CARE';
      if(isCare&&!checkPlay(who).allowed)throw new Error('새로운 문제를 하나 만나고 다시 정원을 돌봐요!');
      const gardenKey='sparkle-care-garden-v1:'+new URL('../',import.meta.url).pathname;
      const previous=isCare?globalThis.localStorage.getItem(gardenKey):null;
      const result=mutateGarden({who,area:currentArea,action,slot:selectedSlot,
        species:request.species,care:request.care,expectedStage:request.expectedStage});
      if(isCare)try{recordPlay(who);}catch(error){
        try{if(previous===null)globalThis.localStorage.removeItem(gardenKey);
            else globalThis.localStorage.setItem(gardenKey,previous);}catch{}
        throw error;
      }
      return action==='GARDEN_OPEN'?visit('garden',result):snapshot(action,requestId,result);
    }

    if (action === 'INIT') {reconcileMemoryWorld(who);return visit(currentArea==='plaza'?'plaza':'home');}
    if (action === 'RELATIONSHIP_OPEN') {reconcileMemoryWorld(who);return snapshot(action,requestId);}
    if (action === 'ECOLOGY_OPEN') {reconcileMemoryWorld(who);return snapshot(action,requestId);}
    if (action === 'NPC_VISIT') {
      const visit=Relationships.recordVisit(Relationships.loadRelationships(),{who,npcId:itemId,at:Date.now()});
      if(visit.added&&!Relationships.saveRelationships(visit.state))
        throw new Error('친구 관계 기록을 저장하지 못했어요.');
      return snapshot(action,requestId,{relationshipAdded:visit.added,npcId:itemId});
    }
    const shopState = () => {
      const wallet = Rewards.wallet(catalog,who);
      return {available:wallet.available,look:wallet.look,
        items:wallet.items.filter(item=>item.kind==='cosmetic').map(item=>({
          id:item.id,category:item.category,title:item.title,description:item.description,
          emoji:item.emoji,cost:item.cost,owned:item.owned,equipped:item.equipped,
          canPurchase:item.canPurchase
        }))};
    };
    const careerView=()=>{const funds=Resources.wallet(catalog,who);return {dreams:Careers.careerSnapshot(who),unlocked:funds.careerUnlocked,available:funds.available};};
    if (action === 'CAREER_OPEN') return visit('career',{district:'career',career:careerView()});
    if (action === 'CAREER_TOGGLE') {
      const result=Careers.toggleDream(who,itemId);
      return snapshot(action,requestId,{district:'career',career:{...careerView(),changed:itemId,selected:result.selected}});
    }
    if (action === 'CAREER_UNLOCK') {
      const result=Resources.unlockCareer(itemId,request.subjects,catalog,who);
      if(!result.ok)throw new Error(result.reason==='insufficient-resources'?
       '서로 다른 두 과목에서 배움 재료를 하나씩 모아 보아요.':'직업 정보 열람 기록을 저장하지 못했어요.');
      return snapshot(action,requestId,{district:'career',career:{...careerView(),changed:itemId,unlockedNow:true}});
    }
    if (action === 'POND_OPEN'||action==='OCEAN_OPEN') {
      const world=action==='POND_OPEN'?'pond':'ocean';
      const answer=visit(world,{district:world,pondShop:Resources.wallet(catalog,who)});
      if(world==='pond')answer.pondSession=PondSession.refreshLearning(who,{catalog});
      return answer;
    }
    if (action === 'POND_ADOPT'||action==='OCEAN_ADOPT') {
      const world=action==='POND_ADOPT'?'pond':'ocean';
      const creature=Resources.FISH_SPECIES.find(f=>f.id===itemId);
      if(!creature||creature.world!==world)throw new Error('선택한 생물이 사는 장소를 다시 확인해 주세요.');
      if(world==='pond')requireActivePond(who);
      else if(!Resources.wallet(catalog,who).fish.find(f=>f.id===itemId)?.owned&&!checkPlay(who).allowed)throw new Error('새로운 문제를 하나 풀고 다시 놀러 와요!');
      const result=Resources.adoptFish(itemId,catalog,who);
      if(!result.ok)throw new Error(result.reason==='learning-milestone'?'새로운 것을 조금 더 배우면 만날 수 있어요. 지금은 다른 친구를 만나 봐요.':result.reason==='insufficient-resources'?'다른 배움터에서도 꽃잎·깃털·수정 같은 재료를 찾아볼까요?':'동물 친구와 만난 기록을 저장하지 못했어요.');
      if(world!=='pond'&&!result.duplicate)recordPlay(who);
      return snapshot(action,requestId,{district:world,pondShop:result.wallet,...(world==='pond'?{pondSession:PondSession.status(who,{catalog})}:{}),itemChanged:itemId,pondNotice:result.duplicate?'이미 함께하는 친구예요.':'새로운 생물 친구를 만났어요!'});
    }
    if (action === 'POND_FEED'||action==='OCEAN_FEED') {
      const world=action==='POND_FEED'?'pond':'ocean';
      const creature=Resources.FISH_SPECIES.find(f=>f.id===itemId);
      if(!creature||creature.world!==world)throw new Error('생물이 사는 장소를 다시 확인해 주세요.');
      const alreadyFed=Resources.wallet(catalog,who).fish.find(f=>f.id===itemId)?.fedToday;
      if(world==='pond')requireActivePond(who);
      else if(!alreadyFed&&!checkPlay(who).allowed)throw new Error('새로운 문제를 하나 풀고 다시 놀러 와요!');
      const result=Resources.feedFish(itemId,catalog,who);
      if(!result.ok)throw new Error('생물 관찰 기록을 저장하지 못했어요.');
      if(world!=='pond'&&!result.duplicate)recordPlay(who);
      return snapshot(action,requestId,{district:world,pondShop:result.wallet,...(world==='pond'?{pondSession:PondSession.status(who,{catalog})}:{}),itemChanged:itemId,pondNotice:result.duplicate?'오늘은 이미 만나 보았어요.':creature.careMode==='observe'?'야생 생물을 안전한 거리에서 관찰했어요!':'물고기 친구가 먹이를 먹고 헤엄쳐요!'});
    }
    if (action === 'SHOP_OPEN') return visit('shop',{shop:shopState()});
    if (action === 'SHOP_BUY') {
      if (typeof itemId!=='string' || itemId.length>80) throw new Error('선물 이름을 확인해 주세요.');
      const selected=shopState().items.find(item=>item.id===itemId);
      if(selected&&!selected.owned&&!checkPlay(who).allowed)throw new Error('새로운 문제를 하나 만나고 다시 꾸며요!');
      const outcome=Rewards.purchaseReward(itemId,catalog,who);
      if (!outcome.ok) throw new Error(outcome.reason==='insufficient-stars'?
        '이 선물은 나중에 골라도 괜찮아요. 이미 받은 선물을 다시 써 볼까요?': '선물 고른 기록을 저장하지 못했어요. 보호자와 확인해 주세요.');
      if(selected&&!outcome.duplicate)recordPlay(who);
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
      const adaptive=recommendVillageRoutes(catalog, {
        who,subject,grade:grade||(who==='se'?'K':'G1')
      });
      adaptive.learningPlan=LearningDirector.plan(catalog,{who,preferredSubject:subject});
      return snapshot(action, requestId, {adaptive});
    }
    const growthMap=()=>['math','korean','english'].map(subject=>{
      const rec=Growth.recommendation(subject,catalog);
      const ability=Progress.ability(subject,who);
      return {subject,stage:Progress.stageSelection(subject,who),
        recommendation:rec.reason||'배움의 단계를 스스로 고를 수 있어요.',
        canAdvance:rec.canAdvance===true,distinctCorrect:rec.distinctCorrect||0,
        abilityEvidence:ability.n,uncertainty:ability.uncertainty};
    });
    if(action==='AREA_SET_STAGE'){
      if(!['math','korean','english'].includes(subject)||!Number.isInteger(request.stage)||
         request.stage<1||request.stage>4)throw new Error('보호자와 확인한 과목과 단계를 선택해 주세요.');
      Progress.saveStageSelection(subject,request.stage,who);
      return snapshot(action,requestId,{district:'growth',growth:growthMap()});
    }
    const paperOptions=bank=>bank.grades.map(({grade,title,gameId,papers})=>({
      grade,title,gameId,papers:papers.map(({paperId,difficulty,label,title})=>({paperId,difficulty,label,title}))
    }));
    const areaMissions=id=>{
      const group=DISTRICTS[id];
      if(!group?.subject)throw new Error('학습할 지역을 확인해 주세요.');
      const list=catalog.filter(g=>g.kind==='quiz'&&g.status==='published'&&
        !BEBSU_GAMES.includes(g.id)&&!PRACTICE_GAMES.includes(g.id)&&
        (group.subject==='all'||g.subject===group.subject));
      // Bring age-appropriate tasks forward while still exposing all subject
      // games to parents through the full area list.
      const stage=Progress.stageSelection(group.subject==='all'?'math':group.subject,who);
      const sorted=[...list].sort((a,b)=>{
        if(group.subject==='hanja')return HANJA_GRADE_ORDER.indexOf(a.gradeBand)-HANJA_GRADE_ORDER.indexOf(b.gradeBand);
        const stageRank=g=>g.stage?Math.abs(g.stage-stage):g.gradeBand?
          (g.gradeBand===(who==='se'?'K':'G1')?0:2):1;
        return stageRank(a)-stageRank(b)||a.title.localeCompare(b.title,'ko')||a.id.localeCompare(b.id);
      });
      return {id,title:group.title,intro:group.intro,games:sorted.map(g=>({
        id:g.id,title:g.title,description:g.description,subject:g.subject,
        emoji:g.emoji||'🧩',levelLabel:g.levelLabel||g.gradeBand||'선택 놀이',
        questionCount:g.questionCount,
        studied:Object.keys(Progress.gameProgress(g.id,who).records).length,
        mastered:Object.values(Progress.gameProgress(g.id,who).records).filter(r=>r.best===10).length,
        rounds:Progress.gameProgress(g.id,who).finishedRounds,
        resume:Boolean(Progress.gameProgress(g.id,who).round&&!Progress.gameProgress(g.id,who).round.finished)
      }))};
    };
    if(action==='AREA_OPEN'){
      const chosen=(district||response||'').toLowerCase();
      if(!Object.hasOwn(DISTRICTS,chosen))throw new Error('마법마을 지역을 선택해 주세요.');
      if(chosen==='career')return visit(chosen,{district:chosen,career:careerView()});
      if(chosen==='pond'||chosen==='ocean'){
        const answer=visit(chosen,{district:chosen,pondShop:Resources.wallet(catalog,who)});
        if(chosen==='pond')answer.pondSession=PondSession.refreshLearning(who,{catalog});
        return answer;
      }
      if(chosen==='kma')return visit(chosen,{district:chosen,
        challenges:paperOptions(challenges),difficultyNote:challenges.accuracyNote});
      if(chosen==='practice')return visit(chosen,{district:chosen,
        challenges:paperOptions(practiceChallenges),publicPractice:true,
        completionBonus:practiceChallenges.completionBonus,
        difficultyNote:practiceChallenges.accuracyNote});
      if(chosen==='shop')return visit(chosen,{district:chosen,shop:shopState()});
      if(chosen==='garden')return visit(chosen,{district:chosen,
        ...mutateGarden({who,area:currentArea,action:'GARDEN_OPEN',slot:-1})});
      if(chosen==='growth')return visit(chosen,{district:chosen,growth:growthMap()});
      return visit(chosen,{district:chosen,missions:areaMissions(chosen)});
    }
    if (action === 'SHOW_BEBSU') return snapshot(action, requestId, {
      challenges:paperOptions(challenges),difficultyNote:challenges.accuracyNote
    });
    if (action === 'SHOW_PRACTICE') return snapshot(action, requestId, {
      challenges:paperOptions(practiceChallenges),publicPractice:true,
      completionBonus:practiceChallenges.completionBonus,
      difficultyNote:practiceChallenges.accuracyNote
    });
    if (action === 'CANCEL') {
      guidedQuestion=null;
      currentGame = null; currentGameId = ''; currentWho = '';
      return snapshot(action, requestId);
    }
    if (action === 'START') {
      guidedQuestion=null;
      const game = await loadGame(gameId);
      if (Progress.learner() !== who)
        throw new Error('아이가 바뀌었어요. 새로 미션을 열어 주세요.');
      let round;
      if (BEBSU_GAMES.includes(gameId)||PRACTICE_GAMES.includes(gameId)) {
        const bank=PRACTICE_GAMES.includes(gameId)?practiceChallenges:challenges;
        const row=bank.grades.find(grade=>grade.gameId===gameId);
        if (!row?.papers.some(paper=>paper.paperId===paperId))
          throw new Error('학년과 시험지를 선택한 뒤 시작해 주세요.');
        round = Progress.beginRound(game, {paperId});
      } else round = Progress.beginRound(game, {size: Progress.LEARNERS[who].roundSize,strategy:strategy||'adaptive',purpose});
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
      const result = Progress.answerQuestion(currentGame, answer);
      if (!result) throw new Error('이미 답안을 제출했어요. 다음 문제로 이동해 주세요.');
      Rewards.syncRewards(catalog,who);
      return snapshot(action, requestId, {
        recoveryEarned: 0,
        correct: result.correct,
        earned: result.earned,
        explanation: (question.explanation || []).map(t => decorate(t, who)).join('\n')
      });
    }
    if (action === 'REFLECT') {
      if(typeof roundId!=='string'||roundId.length>128||typeof strategy!=='string')
        throw new Error('완주 기록과 생각한 방법을 확인해 주세요.');
      const reflection=Rewards.recordEffort({who,gameId,roundId,
        eventId:'reflection-'+gameId+'-'+roundId,kind:'reflection'});
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
      const progress=Progress.gameProgress(gameId,who);
      const memoryMoment=retainedMemoryMoment(progress,roundId);
      const updated = addVillageCompletion(loadVillage(), {who, gameId, roundId});
      if (updated.added && !saveVillage(updated.state))
        throw new Error('마을 기록을 저장할 수 없어요. 브라우저 저장 공간을 확인해 주세요.');
      if(updated.added&&memoryMoment.kind){
        const subject=catalog.find(entry=>entry.id===gameId)?.subject||'';
        const relation=Relationships.recordMemory(Relationships.loadRelationships(),{
          who,subject,tier:memoryMoment.kind,roundId,at:Date.now()
        });
        if(relation.added&&!Relationships.saveRelationships(relation.state))
          throw new Error('기억 친구 기록을 저장하지 못했어요.');
        const skills=[...new Set((memoryMoment.questionIds||[]).map(id=>Progress.itemEvidence(gameId,id)?.skill).filter(Boolean))];
        const ecology=Ecology.recordEcologyMemory(Ecology.loadEcology(),{
          who,subject,tier:memoryMoment.kind,roundId,skills,at:Date.now()
        });
        if(ecology.added&&!Ecology.saveEcology(ecology.state))
          throw new Error('배움 생태계 기록을 저장하지 못했어요.');
      }
      return snapshot(action, requestId, {finished: true, roundId, gardenAdded: updated.added,
        memoryMoment:updated.added?memoryMoment.kind:'',memoryDays:updated.added?memoryMoment.days:0,memoryItems:updated.added?memoryMoment.items:0,
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
