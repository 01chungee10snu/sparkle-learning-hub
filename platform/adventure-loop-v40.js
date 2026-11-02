/**
 * Read-only v40 world director. The authoritative IRT, learning history,
 * reward ledger and play-balance gates remain in their existing modules.
 * This is a presentation/orchestration layer, not a new persistence model.
 */
const LABELS = Object.freeze({
  review:'다시 떠올리기', foundation:'내 힘으로 시작',
  challenge:'알맞게 도전하기', transfer:'다른 곳에 써보기'
});
const SUBJECTS = new Set(['math','korean','english','hanja']);
export function buildJourney(missions, {playAllowed=true, completedGameIds=[]}={}) {
  if (!Array.isArray(missions) || !Array.isArray(completedGameIds))
    throw new TypeError('학습 경로를 확인할 수 없어요.');
  const completed = new Set(completedGameIds.filter(id=>typeof id==='string'));
  const seen = new Set();
  const steps = [];
  for (const mission of missions) {
    if (!mission || typeof mission.gameId!=='string' || !mission.gameId || seen.has(mission.gameId)) continue;
    if (!SUBJECTS.has(mission.subject)) continue;
    seen.add(mission.gameId);
    steps.push({
      id: mission.gameId,
      kind: Object.hasOwn(LABELS,mission.kind)?mission.kind:'challenge',
      subject: mission.subject,
      label: LABELS[mission.kind]||LABELS.challenge,
      title: typeof mission.title==='string'?mission.title:'',
      completed: completed.has(mission.gameId)
    });
    if (steps.length===3) break;
  }
  const next = steps.find(step=>!step.completed)||null;
  return {
    steps, next,
    playAllowed: playAllowed===true,
    mode: next ? 'learning' : 'exploration',
    explorationMessage: playAllowed===true
      ? '마을을 탐험해도 좋아요. 배움으로 다시 돌아올 수 있어요.'
      : '새로운 문제를 하나 만나면 꾸미기와 키우기를 다시 즐길 수 있어요.',
    note: '정답을 많이 맞혀야 놀이할 수 있는 규칙이 아니에요. 생각하고 답을 남긴 경험을 인정해요.'
  };
}
