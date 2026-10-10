import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import * as Progress from '../platform/progress.js';
import * as Rewards from '../platform/rewards.js';
import {createVillageHost} from '../village/village-bridge.js';
import {
  emptyVillage, villageSummary, addVillageCompletion,
  mergeVillage, saveVillage, loadVillage
} from '../village/village-state.js';

class FakeStorage {
  values = new Map();
  getItem(key) { return this.values.get(key) ?? null; }
  setItem(key, value) { this.values.set(key, String(value)); }
  removeItem(key) { this.values.delete(key); }
  clear() { this.values.clear(); }
}
globalThis.localStorage = new FakeStorage();
globalThis.fetch = async url => ({
  ok: true,
  async json() { return JSON.parse(await readFile(new URL(url))); }
});

const initial = emptyVillage();
assert.deepEqual(villageSummary(initial, 'tae'), {
  who: 'tae', flowers: 0, familyFlowers: 0
});
const event = {who: 'tae', gameId: 'snack-count', roundId: 'round-1'};
const first = addVillageCompletion(initial, event);
assert.equal(first.added, true);
assert.equal(first.flowers, 1);
assert.equal(first.familyFlowers, 1);
assert.equal(Object.keys(initial.profiles.tae.events).length, 0, 'input immutable');
const duplicate = addVillageCompletion(first.state, event);
assert.equal(duplicate.added, false);
assert.equal(duplicate.familyFlowers, 1);
const sibling = addVillageCompletion(duplicate.state, {...event, who: 'se'});
assert.equal(sibling.flowers, 1);
assert.equal(sibling.familyFlowers, 2);
assert.equal(villageSummary(sibling.state, 'tae').flowers, 1);
assert.equal(addVillageCompletion(mergeVillage(initial, sibling.state), event).added, false);
assert.throws(() => addVillageCompletion(initial, {...event, who: 'unknown'}));
assert.throws(() => addVillageCompletion(initial, {...event, roundId: '__proto__!'}));
assert.equal(saveVillage(sibling.state), true);
assert.equal(villageSummary(loadVillage(), 'se').familyFlowers, 2);

globalThis.localStorage.clear();
const replies = [];
const host = createVillageHost(reply => replies.push(reply));
let counter = 0;
async function send(action, fields = {}) {
  await host.handle(JSON.stringify({action, requestId: 'test-' + (++counter), ...fields}));
  return replies.at(-1);
}
function expectOk(response, action) {
  assert.equal(response.action, action);
  assert.equal(response.ok, true, JSON.stringify(response));
  return response;
}
const originals = new Map();
async function quizData(id) {
  if (!originals.has(id)) {
    const data = JSON.parse(await readFile(new URL('../games/' + id + '/game.json', import.meta.url)));
    originals.set(id, data);
  }
  return originals.get(id);
}
function solution(q) {
  const kind = q.interaction?.type ?? 'choice';
  if (kind === 'choice') return q.answer;
  if (kind === 'build' || kind === 'numeric') return kind === 'build' ?
    q.interaction.target : String(q.interaction.target);
  if (kind === 'match') return q.interaction.pairs;
  if (kind === 'memory' || kind === 'sequence') return q.interaction.order;
  throw new Error('Unknown interaction: ' + kind);
}

Progress.selectLearner('tae');
let state = expectOk(await send('INIT'), 'INIT');
assert.equal(state.available, 0);
assert.equal(state.flowers, 0);
assert.equal(state.displayName, '태희');
state = expectOk(await send('START', {gameId: 'measure-lab'}), 'START');
assert.equal(state.question.total, 5);
const recordedGame = await quizData('measure-lab');
for (let i = 0; i < 5; i++) {
  const item = recordedGame.questions.find(q => q.id === state.question.questionId);
  assert.ok(item);
  const answer = JSON.stringify(solution(item));
  const result = expectOk(await send('SUBMIT', {gameId: 'measure-lab', response: answer}), 'SUBMIT');
  assert.equal(result.correct, true);
  assert.ok(result.earned >= 0 && result.earned <= 10);
  const before = result.available;
  const replay = await send('SUBMIT', {gameId: 'measure-lab', response: answer});
  assert.equal(replay.ok, false, 'duplicate submit blocked');
  const afterReplay = expectOk(await send('INIT'), 'INIT');
  assert.equal(afterReplay.available, before, 'no double stars from duplicate submission');
  state = expectOk(await send('NEXT', {gameId: 'measure-lab'}), 'NEXT');
  if (i < 4) assert.ok(state.question);
}
assert.equal(state.finished, true);
assert.ok(state.roundId);
let grown = expectOk(await send('COMPLETE_WORLD', {
  gameId: 'measure-lab', roundId: state.roundId
}), 'COMPLETE_WORLD');
assert.equal(grown.flowers, 1);
assert.equal(grown.familyFlowers, 1);
grown = expectOk(await send('COMPLETE_WORLD', {
  gameId: 'measure-lab', roundId: state.roundId
}), 'COMPLETE_WORLD');
assert.equal(grown.flowers, 1, 'replaying same round cannot grow extra flowers');
const taeWallet = grown.available;
assert.ok(taeWallet > 0);

Progress.selectLearner('se');
let se = expectOk(await send('INIT'), 'INIT');
assert.equal(se.available, 0, 'sibling wallet isolated');
assert.equal(se.flowers, 0, 'sibling village isolated');
assert.equal(se.familyFlowers, 1, 'shared plaza reflects older sibling');
se = expectOk(await send('START', {gameId: 'snack-count'}), 'START');
assert.equal(se.question.total, 3);
const seGame = await quizData('snack-count');
for (let i = 0; i < 3; i++) {
  const q = seGame.questions.find(x => x.id === se.question.questionId);
  expectOk(await send('SUBMIT', {gameId: 'snack-count', response: JSON.stringify(solution(q))}), 'SUBMIT');
  se = expectOk(await send('NEXT', {gameId: 'snack-count'}), 'NEXT');
}
assert.equal(se.finished, true);
se = expectOk(await send('COMPLETE_WORLD', {
  gameId: 'snack-count', roundId: se.roundId
}), 'COMPLETE_WORLD');
assert.equal(se.flowers, 1);
assert.equal(se.familyFlowers, 2);
Progress.selectLearner('tae');
state = expectOk(await send('INIT'), 'INIT');
assert.equal(state.available, taeWallet, 'no cross-child transfer');
assert.equal(state.flowers, 1);
assert.equal(state.familyFlowers, 2);
const unearned = await send('COMPLETE_WORLD', {gameId: 'measure-lab', roundId: 'forged-round'});
assert.equal(unearned.ok, false, 'village event requires real completed round');

console.log('PASS: Unity village JS bridge; real quiz scoring, 5/3 rounds, learner isolation, duplicate block, no forged round, plaza and personal gardens, backup merge.');
