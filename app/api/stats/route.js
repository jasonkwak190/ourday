import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// GET /api/stats — 공개 통계 (인증 불필요)
export async function GET() {
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
