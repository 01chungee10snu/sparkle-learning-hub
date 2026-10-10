// Device-local village state, independent of learning stars and legacy keys.
// No identifiers other than approved internal learner and round IDs are stored.
export const VILLAGE_KEY = 'sparkle-kma-public-garden-v06';
const KIDS = new Set(['tae', 'se']);
const SAFE_ID = /^[a-zA-Z0-9][a-zA-Z0-9_-]{0,127}$/;
const MAX_EVENTS = 20000;
const plain = v => v !== null && typeof v === 'object' && !Array.isArray(v) &&
  (Object.getPrototypeOf(v) === Object.prototype || Object.getPrototypeOf(v) === null);
const bag = () => Object.create(null);
export const emptyVillage = () => ({
  version: 1,
  profiles: { tae: { events: bag() }, se: { events: bag() } },
  family: { events: bag() }
});
const validId = value => typeof value === 'string' && SAFE_ID.test(value);
const validEventId = value => typeof value === 'string' &&
  /^[a-zA-Z0-9][a-zA-Z0-9_-]{0,399}$/.test(value);

function cleanEvents(value) {
  const events = bag();
  if (!plain(value)) return events;
  const entries = Object.entries(value);
  if (entries.length > MAX_EVENTS) throw new Error('마을 기록 저장 한도를 초과했어요.');
  for (const [id, enabled] of entries) {
    if (validEventId(id) && enabled === true) events[id] = true;
  }
  return events;
}

export function cleanVillage(raw) {
  const result = emptyVillage();
  if (!plain(raw) || raw.version !== 1) return result;
  for (const who of KIDS) {
    result.profiles[who].events = cleanEvents(raw.profiles?.[who]?.events);
  }
  // The shared plaza is derived from each child's verified logical events.
  // A family-only backup row cannot invent flowers or lose a sibling's work.
  for (const who of KIDS) for (const id of Object.keys(result.profiles[who].events))
    result.family.events[who + '_' + id] = true;
  if (Object.keys(result.family.events).length > MAX_EVENTS)
    throw new Error('마을 기록 저장 한도를 초과했어요.');
  return result;
}

export function villageSummary(state, who) {
  if (!KIDS.has(who)) throw new Error('학습자 정보를 확인해 주세요.');
  const data = cleanVillage(state);
  return {
    who,
    flowers: Math.min(12, Object.keys(data.profiles[who].events).length),
    familyFlowers: Math.min(14, Object.keys(data.family.events).length)
  };
}

// Only a verified completed round may call this. It never modifies the wallet.
export function addVillageCompletion(state, { who, gameId, roundId }) {
  if (!KIDS.has(who) || !validId(gameId) || !validId(roundId))
    throw new Error('완료한 학습 회차 정보를 확인해 주세요.');
  const result = cleanVillage(state);
  // Length prefix makes tuples unambiguous, including IDs with underscores.
  const eventId = 'v2_' + gameId.length + '_' + gameId + '_' + roundId;
  const legacyId = gameId + '_' + roundId;
  const familyId = who + '_' + eventId;
  const personal = result.profiles[who].events;
  const family = result.family.events;
  // Existing real game IDs contain no underscore: preserve their v1 receipts.
  if (personal[eventId] || (!gameId.includes('_') && personal[legacyId])) return { added: false, state: result, ...villageSummary(result, who) };
  if (Object.keys(personal).length >= MAX_EVENTS ||
      Object.keys(family).length >= MAX_EVENTS)
    throw new Error('마을 기록 저장 한도를 초과했어요.');
  personal[eventId] = true;
  family[familyId] = true;
  return { added: true, state: result, ...villageSummary(result, who) };
}

let inMemory = emptyVillage();
let dirty = false;
export function loadVillage(storage = globalThis.localStorage) {
  if (dirty) return cleanVillage(inMemory);
  try {
    if (!storage) return cleanVillage(inMemory);
    const value = storage.getItem(VILLAGE_KEY);
    if (!value) { inMemory = emptyVillage(); return cleanVillage(inMemory); }
    inMemory = cleanVillage(JSON.parse(value));
    return cleanVillage(inMemory);
  } catch {
    return cleanVillage(inMemory);
  }
}

export function saveVillage(state, storage = globalThis.localStorage) {
  inMemory = dirty ? mergeVillage(inMemory, state) : cleanVillage(state);
  dirty = true;
  if (!storage) return false;
  try {
    const value = storage.getItem(VILLAGE_KEY);
    if (value) inMemory = mergeVillage(cleanVillage(JSON.parse(value)), inMemory);
    storage.setItem(VILLAGE_KEY, JSON.stringify(inMemory));
    dirty = false;
    return true;
  } catch {
    return false;
  }
}

// Merge by logical event id instead of overwriting another child's flowers.
export function mergeVillage(current, incoming) {
  const a = cleanVillage(current);
  const b = cleanVillage(incoming);
  for (const who of KIDS) {
    Object.assign(a.profiles[who].events, b.profiles[who].events);
  }
  Object.assign(a.family.events, b.family.events);
  return cleanVillage(a);
}
