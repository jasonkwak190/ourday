import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { createRateLimiter, getClientIp } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';

// Rate limit: IP당 1분에 최대 30회 (랜딩 페이지 새로고침 허용)
const statsLimiter = createRateLimiter({ windowMs: 60_000, max: 30 });

// GET /api/stats — 공개 통계 (인증 불필요)
export async function GET(request) {
  const ip = getClientIp(request);
  if (!statsLimiter(ip)) {
    return NextResponse.json({ couples: 0 }); // 차단 시 0 반환 (에러 노출 없이)
  }

  try {
    // ⚠️ 서비스 롤 사용 이유:
    // couples 테이블의 RLS 정책은 "자기 행만 select" 이므로 anon 클라이언트로
    // count 를 요청하면 항상 0 이 반환된다 (SUPABASE.md:39-43 참고).
    // 랜딩에 노출되는 단순 행 수 집계만 수행하므로 서비스 롤을 count 한정으로 사용한다.
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY,
      { auth: { persistSession: false } },
    );

    // couples 테이블 행 수 = 실제 커플 수
    const { count } = await supabase
      .from('couples')
      .select('id', { count: 'exact', head: true });

    return NextResponse.json({ couples: count ?? 0 });
  } catch (err) {
    console.error('stats error:', err);
    return NextResponse.json({ couples: 0 });
  }
}
