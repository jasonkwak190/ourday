export const dynamic = 'force-dynamic';

import { createRateLimiter, getClientIp } from '@/lib/rate-limit';

// IP당 1분에 최대 20건 (과도한 외부 fetch 방어)
const previewLimiter = createRateLimiter({ windowMs: 60_000, max: 20 });

// SSRF 방어: 내부망·클라우드 메타데이터·루프백 차단
// (169.254.169.254 = AWS/GCP 메타데이터, 0.0.0.0, IPv6 루프백 등 포함)
const BLOCKED_HOSTS = /^(localhost|127\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|169\.254\.|0\.0\.0\.0$|0\.|\[?::1\]?$|\[?::ffff:|\[?fc|\[?fd|metadata\.|.*\.internal$)/i;

function isBlockedHost(hostname) {
  const h = hostname.toLowerCase().replace(/^\[|\]$/g, '');
  return BLOCKED_HOSTS.test(hostname) || BLOCKED_HOSTS.test(h);
}

/* charset 감지 후 1회 디코드 — 청크 경계 멀티바이트 깨짐·EUC-KR 모지바케 방지 */
function decodeHtml(bytes, contentTypeHeader) {
  // 1) Content-Type 헤더의 charset
  let charset = (contentTypeHeader || '').match(/charset=["']?([\w-]+)/i)?.[1]?.toLowerCase();
  // 2) 없으면 첫 부분을 ascii로 훑어 <meta charset> 탐지
  if (!charset) {
    const head = new TextDecoder('latin1').decode(bytes.slice(0, 4096));
    charset = head.match(/charset=["']?([\w-]+)/i)?.[1]?.toLowerCase();
  }
  // euc-kr 계열 정규화
  if (charset === 'ms949' || charset === 'cp949' || charset === 'ks_c_5601-1987') charset = 'euc-kr';
  try {
    return new TextDecoder(charset || 'utf-8').decode(bytes);
  } catch {
    return new TextDecoder('utf-8').decode(bytes);
  }
}

export async function GET(request) {
  const ip = getClientIp(request);
  if (!previewLimiter(ip)) {
    return Response.json({ error: 'Too many requests' }, { status: 429 });
  }

  const { searchParams } = new URL(request.url);
  const url = searchParams.get('url');

  if (!url) return Response.json({ error: 'No URL' }, { status: 400 });

  let parsed;
  try {
    parsed = new URL(url);
  } catch {
    return Response.json({ error: 'Invalid URL' }, { status: 400 });
  }

  // SSRF 방어: http/https만 허용, 내부망 차단
  if (!['http:', 'https:'].includes(parsed.protocol)) {
    return Response.json({ error: 'Invalid URL' }, { status: 400 });
  }
  if (isBlockedHost(parsed.hostname)) {
    return Response.json({ error: 'Invalid URL' }, { status: 400 });
  }

  // 네이버 블로그: 데스크탑 URL → 모바일 URL로 변환 (봇 차단 우회)
  let fetchUrl = url;
  if (parsed.hostname === 'blog.naver.com') {
    fetchUrl = url.replace('://blog.naver.com', '://m.blog.naver.com');
  }

  try {
    const res = await fetch(fetchUrl, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1',
        Accept: 'text/html,application/xhtml+xml',
      },
      signal: AbortSignal.timeout(6000),
    });

    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    // 리다이렉트 후 최종 목적지가 내부망으로 바뀌었는지 재검증 (SSRF redirect bypass 방어)
    try {
      const finalHost = new URL(res.url).hostname;
      if (isBlockedHost(finalHost)) {
        return Response.json({ error: 'Invalid URL' }, { status: 400 });
      }
    } catch { /* res.url 파싱 실패 시 무시 */ }

    // 최대 200KB만 바이트로 모은 뒤, charset 감지하여 한 번에 디코드
    // (청크 경계에서 한글 멀티바이트가 쪼개져 깨지는 문제 + EUC-KR 모지바케 방지)
    const reader = res.body.getReader();
    const chunks = [];
    let total = 0;
    let done = false;
    while (!done && total < 200_000) {
      const { value, done: d } = await reader.read();
      done = d;
      if (value) { chunks.push(value); total += value.length; }
    }
    reader.cancel().catch(() => {});
    const bytes = new Uint8Array(total);
    let offset = 0;
    for (const c of chunks) { bytes.set(c, offset); offset += c.length; }
    const html = decodeHtml(bytes, res.headers.get('content-type'));

    // OG 태그 추출 헬퍼
    function getOg(prop) {
      const re1 = new RegExp(
        `<meta[^>]+property=["']og:${prop}["'][^>]+content=["']([^"']+)["']`,
        'i'
      );
      const re2 = new RegExp(
        `<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:${prop}["']`,
        'i'
      );
      return (html.match(re1) || html.match(re2))?.[1]?.trim() || null;
    }

    function getMeta(name) {
      const re1 = new RegExp(`<meta[^>]+name=["']${name}["'][^>]+content=["']([^"']+)["']`, 'i');
      const re2 = new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+name=["']${name}["']`, 'i');
      return (html.match(re1) || html.match(re2))?.[1]?.trim() || null;
    }

    const titleMatch = html.match(/<title[^>]*>([^<]{1,200})<\/title>/i);
    const pageTitle = titleMatch?.[1]?.trim() || null;

    const base   = new URL(url);
    const domain = base.hostname.replace(/^www\./, '');

    // 상대경로 → 절대경로 변환 헬퍼
    function toAbsUrl(src) {
      if (!src) return null;
      if (src.startsWith('http://') || src.startsWith('https://')) return src;
      if (src.startsWith('//')) return `${base.protocol}${src}`;
      if (src.startsWith('/')) return `${base.protocol}//${base.host}${src}`;
      return `${base.protocol}//${base.host}/${src}`;
    }

    // favicon URL 구성
    const faviconRe = html.match(/<link[^>]+rel=["'][^"']*icon[^"']*["'][^>]+href=["']([^"']+)["']/i);
    const favicon = toAbsUrl(faviconRe?.[1]) ||
      `https://www.google.com/s2/favicons?domain=${domain}&sz=64`;

    return Response.json({
      title:       getOg('title')       || getMeta('twitter:title') || pageTitle,
      description: getOg('description') || getMeta('twitter:description') || getMeta('description'),
      image:       toAbsUrl(getOg('image') || getMeta('twitter:image')),
      site_name:   getOg('site_name')   || domain,
      favicon,
      domain,
    }, {
      // CDN 캐시 — 같은 링크 재요청 시 외부 fetch 절감 (1시간)
      headers: { 'Cache-Control': 's-maxage=3600, stale-while-revalidate=86400' },
    });
  } catch {
    return Response.json({ error: 'Failed to fetch preview' }, { status: 500 });
  }
}
