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
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
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
