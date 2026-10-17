import * as Progress from './progress.js';

// Hanja has its own grade path. IRT metrics stay provisional and never certify
// official exam attainment; a parent/child chooses the next grade explicitly.
export const HANJA_BANDS=Object.freeze(['H8','H7II','H7','H6II','H6','H5II','H5','H4II','H4','H3II','H3']);
const escapeHTML=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const gradeGlyphs=game=>new Set((game.questionIds||[]).filter(id=>id.endsWith('-meaning')).map(id=>id.split('-').at(-2)));

export function gradeEvidence(entry,who){
  const game=Progress.gameProgress(entry.id,who),firsts=new Map(),known=gradeGlyphs(entry);
  for(const [qid,record] of Object.entries(game.records||{})){
    const match=/-([a-f0-9]+)-(meaning|sound)$/.exec(qid);
    if(!match||!known.has(match[1]))continue;
    const a=record.firstAttempt;
    if(!a||typeof a.correct!=='boolean'||!Number.isFinite(a.at))continue;
    const old=firsts.get(match[1]);
    if(!old||a.at<old.at)firsts.set(match[1],a);
  }
  const responses=[...firsts.values()].filter(a=>!a.assisted),correct=responses.filter(a=>a.correct).length;
  const accuracy=responses.length?correct/responses.length:0,rounds=game.completedRounds?.length||0;
  const ready=responses.length>=12&&rounds>=2&&accuracy>=.80;
  return {seen:responses.length,correct,accuracy,rounds,ready};
}

export function renderHanjaHome({catalog,who,selected,flipped}){
  const entries=HANJA_BANDS.map(band=>catalog.find(g=>g.subject==='hanja'&&g.gradeBand===band)).filter(Boolean);
  if(!entries.length)return '<section class="hanja-screen screen"><h1>한자 수련관</h1><p>한자 두루마리가 아직 준비되지 않았어요.</p></section>';
  const active=entries.find(g=>g.gradeBand===selected)||entries[0],progress=gradeEvidence(active,who);
  const index=entries.indexOf(active);
  const previous=index>0?entries[index-1]:null,next=entries[index+1];
  const cards=active.starterCards||[],ability=Progress.ability('hanja',who),learner=Progress.LEARNERS[who].name;
  const tabs=entries.map(g=>{
    const current=g.id===active.id,e=gradeEvidence(g,who);
    return '<button type="button" class="hanja-grade-tab'+(current?' current':'')+'" data-action="hanja-grade" data-band="'+escapeHTML(g.gradeBand)+'" aria-pressed="'+current+'">'+
      '<span>'+escapeHTML(g.hanjaGrade)+'</span><small>'+(e.rounds?'연습 '+e.rounds+'회':'새 두루마리')+'</small></button>';
  }).join('');
  const previews=cards.map(card=>{
    const shown=flipped.has(card.glyph);
    return '<button type="button" class="hanja-flashcard'+(shown?' flipped':'')+'" data-action="hanja-flip" data-glyph="'+escapeHTML(card.glyph)+'" aria-pressed="'+shown+'" aria-label="'+(shown?'훈음 가리기':'훈음 보기')+' '+escapeHTML(card.glyph)+'">'+
      '<span class="hanja-flash-glyph" lang="zh-Hant">'+escapeHTML(card.glyph)+'</span>'+
      '<strong>'+(shown?escapeHTML(card.reading):'뜻과 소리 보기')+'</strong></button>';
  }).join('');
  const count=active.questionCount/2,modelText=ability.n?('서로 다른 한자 '+ability.n+'개로 추정 · 불확실성 '+ability.uncertainty):'아직 독립적인 첫 풀이가 없어요';
  const readyText=progress.ready&&ability.n>=12&&ability.uncertainty<=.8?
    '기초 연습 기록이 충분합니다. 보호자와 함께 다음 급수를 살펴보세요.':
    '급수 선택은 자유로워요. 여러 글자를 스스로 떠올리고 며칠 뒤 복습해 봐요.';
  return '<section class="hanja-screen screen">'+
    '<div class="hanja-heading"><div><p class="hanja-eyebrow">MAGIC HANJA ACADEMY · 🏯</p><h1 tabindex="-1">'+escapeHTML(learner)+'의 한자 수련관</h1>'+
    '<p>여러 급수의 한자를 만나고, 작은 마법 두루마리를 완성해요.</p></div><span class="hanja-tower" aria-hidden="true">📜✨</span></div>'+
    '<div class="hanja-grades" aria-label="급수 선택">'+tabs+'</div>'+
    '<div class="hanja-lesson"><div class="hanja-lesson-intro"><p class="hanja-rank">제 '+(index+1)+'단계 · '+escapeHTML(active.hanjaGrade)+'</p>'+
    '<h2>📖 두루마리 읽기</h2><p>이번 급수의 새 글자 '+count+'자 · 훈음과 독음 '+active.questionCount+'개 문제</p>'+
    '<div class="hanja-lesson-stats"><span>처음 스스로 푼 글자 <strong>'+progress.seen+'/'+count+'</strong></span>'+
    '<span>수련 완료 <strong>'+progress.rounds+'회</strong></span></div>'+
    '<p class="hanja-recommendation">'+readyText+'</p>'+
    '<button type="button" class="hanja-start" data-action="play" data-game="'+escapeHTML(active.id)+'">✨ '+escapeHTML(active.hanjaGrade)+' 모험 시작</button>'+
    '<p class="hanja-irt-meta">IRT 맞춤 출제(잠정) · '+escapeHTML(modelText)+'</p></div>'+
    '<div class="hanja-flash-lesson"><h3>🔮 글자 탐험 · 터치해서 훈음 보기</h3>'+
    '<div class="hanja-flash-grid">'+previews+'</div>'+
    '<p>먼저 글자를 보고 생각한 뒤 뒤집어 보아요. 카드를 뒤집는 것은 시험 점수에 포함되지 않아요.</p></div></div>'+
    '<div class="hanja-bottom-nav">'+(previous?'<button type="button" class="secondary" data-action="hanja-grade" data-band="'+escapeHTML(previous.gradeBand)+'">← 이전 급수</button>':'')+
    (next?'<button type="button" class="secondary" data-action="hanja-grade" data-band="'+escapeHTML(next.gradeBand)+'">다음 급수 살펴보기 →</button>':'')+
    '<a href="./village/" class="hanja-return-link">🏡 마법마을로 돌아가기</a></div>'+
    '<p class="hanja-disclaimer"><a href="https://github.com/rycont/hanja-grade-dataset" target="_blank" rel="noopener noreferrer">한자 자료 출처</a> · 원자료 저작권: 한국어문회. 공식 자격증·학업능력 판정이 아닙니다. 문항 난이도는 잠정 추정치이고, 한자 뜻·음과 급수 배정은 보호자 검수가 필요합니다.</p>'+
    '</section>';
}
