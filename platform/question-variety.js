/**
 * Pure, editorial-pattern diversity heuristic. It never creates or modifies a
 * question, guesses an answer, or changes the IRT ability estimate.
 */
const normalize = text => String(text ?? '')
  .replace(/\{\{[^{}]+\}\}/g, '{{이름}}')
  .replace(/[0-9０-９]+(?:[.,][0-9０-９]+)*/g, '#')
  .replace(/\s+/g, ' ')
  .trim();

/** The visible narrative and instruction, independent of changed numbers/names. */
export function questionPattern(question) {
  if (!question || typeof question !== 'object') return '';
  const story = normalize(question.story);
  const prompt = normalize(question.prompt);
  // Prefixes are kept long enough to distinguish actual context and task.
  return `${story.slice(0, 150)} | ${prompt.slice(0, 150)}`;
}

/** A small, bounded tie-break penalty for repeated presentation patterns. */
export function patternPenalty(question, withinRound, recentHistory) {
  const key = questionPattern(question);
  if (!key || key === ' | ') return 0;
  const within = Math.min(3, withinRound.get(key) ?? 0);
  const recent = Math.min(5, recentHistory.get(key) ?? 0);
  return within * 0.34 + recent * 0.035;
}
