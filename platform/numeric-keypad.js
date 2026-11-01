/**
 * Shared, DOM-independent draft state for the browser and the Unity WebGL HUD.
 * A draft may be an incomplete number; only numericDraftReady permits submission.
 * Canonical storage and final grading remain owned by activities.js.
 */
export const MAX_NUMERIC_DIGITS = 7;

/** Normalize user typing and Samsung/full-width characters without persisting it. */
export function normalizeNumericDraft(value, {min = 0} = {}) {
  const text = String(value ?? '').trim()
    .replace(/[０-９]/g, ch => String.fromCharCode(ch.charCodeAt(0) - 0xfee0))
    .replace(/[−－]/g, '-');
  const negative = min < 0 && text.startsWith('-');
  let digits = text.replace(/[^0-9]/g, '').slice(0, MAX_NUMERIC_DIGITS);
  if (digits.length > 1) digits = digits.replace(/^0+(?=[0-9])/, '');
  if (!digits) return negative ? '-' : '';
  // Zero has no negative sign in the canonical response format.
  if (Number(digits) === 0) return '0';
  return (negative ? '-' : '') + digits;
}

/** Validate only a complete response; a positive min must not block typing prefixes. */
export function numericDraftReady(value, {min = 0, max = 1_000_000} = {}) {
  if (typeof value !== 'string' || !/^(?:0|[1-9][0-9]{0,6}|-[1-9][0-9]{0,6})$/.test(value)) return false;
  const n = Number(value);
  return Number.isSafeInteger(n) && n >= min && n <= max;
}

/** Tap keypad reducer. A prefix below a positive minimum is intentionally valid. */
export function applyNumericKey(value, key, {min = 0, max = 1_000_000} = {}) {
  const current = normalizeNumericDraft(value, {min});
  if (key === 'clear') return '';
  if (key === 'back') return normalizeNumericDraft(current.slice(0, -1), {min});
  if (key === 'minus') {
    if (min >= 0 || current === '0') return current;
    return current.startsWith('-') ? current.slice(1) : '-' + current;
  }
  if (!/^[0-9]$/.test(String(key))) return current;
  const candidate = normalizeNumericDraft(current + key, {min});
  if (candidate.replace('-', '').length > MAX_NUMERIC_DIGITS) return current;
  const n = Number(candidate);
  // Positive lower bounds apply only on submit: entering 123 needs 1 -> 12 -> 123.
  // Negative values cannot come back into range by appending another digit.
  if (n > max || (candidate.startsWith('-') && n < min)) return current;
  return candidate;
}
