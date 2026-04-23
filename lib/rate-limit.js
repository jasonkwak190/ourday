/**
 * 간단한 인메모리 Rate Limiter
 * Next.js 서버리스 환경에서 인스턴스별로 동작 (재시작 시 초기화됨)
 * Redis 없이도 가장 기본적인 남용 방어 목적으로 사용
 */

const store = new Map(); // ip → [timestamp, ...]

/**
 * @param {object} opts
 * @param {number} opts.windowMs  - 시간 창 (ms). 기본 60초
 * @param {number} opts.max       - 시간 창 내 허용 요청 수. 기본 20
 * @returns {(ip: string) => boolean} true = 허용, false = 차단
 */
export function createRateLimiter({ windowMs = 60_000, max = 20 } = {}) {
  return function check(ip) {
    const now = Date.now();
    const windowStart = now - windowMs;

    let record = store.get(ip);
    if (!record) {
      record = [];
      store.set(ip, record);
    }

    // 창 밖 타임스탬프 제거
    while (record.length > 0 && record[0] < windowStart) record.shift();

    if (record.length >= max) return false; // 차단

    record.push(now);

    // 스토어 크기 제한 (최대 2000 IP)
    if (store.size > 2000) {
      for (const [k, v] of store.entries()) {
        if (v.length === 0 || v[v.length - 1] < windowStart) store.delete(k);
        if (store.size <= 1000) break;
      }
    }

    return true;
  };
}

/** 요청에서 IP를 추출 (Vercel / 일반 Next.js 공통) */
export function getClientIp(request) {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    'unknown'
  );
}
