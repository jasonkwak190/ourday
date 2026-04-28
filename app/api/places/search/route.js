export const dynamic = 'force-dynamic';

import { createRateLimiter, getClientIp } from '@/lib/rate-limit';

// IP당 1분 30건 (과도한 외부 호출 방어)
const placesLimiter = createRateLimiter({ windowMs: 60_000, max: 30 });

const KAKAO_KEYWORD_API = 'https://dapi.kakao.com/v2/local/search/keyword.json';

/**
 * 카카오 REST Local API — 키워드(상호명·장소명) 검색 프록시
 *
 * GET /api/places/search?q=라페스타+강남&size=10
 *
 * Server-side fetch — KAKAO_REST_API_KEY 노출 없음, 도메인 등록 불필요.
 * JS SDK 대비 장점:
 *  · 도메인 화이트리스트 영향 없음 (서버에서 호출)
 *  · 키 secret 보호 (NEXT_PUBLIC 아님)
 *  · category_group_code 등 REST 전용 파라미터 사용 가능
 */
export async function GET(request) {
  const ip = getClientIp(request);
  if (!placesLimiter(ip)) {
    return Response.json({ error: 'Too many requests' }, { status: 429 });
  }

  const { searchParams } = new URL(request.url);
  const q    = (searchParams.get('q') || '').trim();
  const size = Math.min(parseInt(searchParams.get('size') || '10', 10) || 10, 15);

  if (q.length < 2) {
    return Response.json({ documents: [] });
  }

  const key = process.env.KAKAO_REST_API_KEY;
  if (!key) {
    console.error('[places/search] KAKAO_REST_API_KEY 미설정');
    return Response.json({ error: 'Kakao REST API 키 미설정' }, { status: 500 });
  }

  try {
    const url = `${KAKAO_KEYWORD_API}?query=${encodeURIComponent(q)}&size=${size}`;
    const res = await fetch(url, {
      headers: { Authorization: `KakaoAK ${key}` },
      // 5초 타임아웃
      signal: AbortSignal.timeout(5000),
    });

    if (!res.ok) {
      const body = await res.text();
      console.error('[places/search] Kakao API 에러:', res.status, body);
      return Response.json({ error: 'Kakao API 실패', status: res.status }, { status: 502 });
    }

    const data = await res.json();
    // documents: place_name, road_address_name, address_name, category_name, phone, place_url, x, y, id
    return Response.json({
      documents: data.documents || [],
      total: data.meta?.total_count ?? 0,
    });
  } catch (e) {
    console.error('[places/search] fetch 실패:', e.message);
    return Response.json({ error: e.message }, { status: 500 });
  }
}
