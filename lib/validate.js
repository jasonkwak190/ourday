/**
 * 서버사이드 입력값 검증 유틸
 * API Route에서 공통으로 사용
 */

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** UUID v4 형식 검증 */
export function isUUID(value) {
  return typeof value === 'string' && UUID_RE.test(value);
}

/**
 * 문자열 필드 정제 + 검증
 * @param {unknown} value
 * @param {{ maxLen?: number, minLen?: number, required?: boolean }} opts
 * @returns {{ ok: boolean, value?: string, error?: string }}
 */
export function sanitizeString(value, { maxLen = 500, minLen = 1, required = true, fieldName = '값' } = {}) {
  if (value === null || value === undefined || value === '') {
    if (required) return { ok: false, error: `${fieldName}은(는) 필수예요.` };
    return { ok: true, value: null };
  }
  const str = String(value).trim();
  if (required && str.length < minLen) {
    return { ok: false, error: `${fieldName}은(는) ${minLen}자 이상이어야 해요.` };
  }
  if (str.length > maxLen) {
    return { ok: false, error: `${fieldName}은(는) ${maxLen}자 이내로 입력해주세요.` };
  }
  return { ok: true, value: str };
}

/**
 * 정수 정제 + 범위 검증
 */
export function sanitizeInt(value, { min = 0, max = Number.MAX_SAFE_INTEGER, fallback = 0 } = {}) {
  const n = parseInt(value, 10);
  if (isNaN(n)) return fallback;
  return Math.min(Math.max(n, min), max);
}

/**
 * enum 검증
 */
export function isOneOf(value, allowed) {
  return allowed.includes(value);
}
