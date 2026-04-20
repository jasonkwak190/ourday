import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

// Service role — POST 전용 (하객 비인증 insert)
function serviceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { persistSession: false } }
  );
}

// Anon client — GET에서 공개 데이터 조회용
function anonClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    { auth: { persistSession: false } }
  );
}

// GET /api/rsvp?couple_id=xxx
// 공개 — 하객 RSVP 폼에서 커플 기본 정보 조회 (anon key, invitations 테이블만)
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const coupleId = searchParams.get('couple_id');
    if (!coupleId) return NextResponse.json({ error: 'couple_id required' }, { status: 400 });

    const supabase = anonClient();

    // invitations 테이블에서 공개 정보 조회 (RLS: 공개 읽기 정책 있음)
    const { data: inv, error: invErr } = await supabase
      .from('invitations')
      .select('groom_name, bride_name, venue_name, venue_address, wedding_time, wedding_date')
      .eq('couple_id', coupleId)
      .single();

    // invitations 없어도 couple_id 유효성만 확인해서 빈 정보로 폼 열기
    // couples 테이블은 RLS로 anon 접근 불가 → invitations로만 판단
    if (invErr && invErr.code !== 'PGRST116') {
      // PGRST116 = no rows (청첩장 미작성은 허용)
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    // invitations가 없는 경우 couple_id 유효성 확인 불가 → 일단 허용
    // (실제 배포에서는 invitations를 항상 먼저 만들게 유도)
    return NextResponse.json({
      couple_id: coupleId,
      wedding_date: inv?.wedding_date || null,
      groom_name: inv?.groom_name || null,
      bride_name: inv?.bride_name || null,
      venue_name: inv?.venue_name || null,
      venue_address: inv?.venue_address || null,
      wedding_time: inv?.wedding_time || null,
    });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

// POST /api/rsvp
// 공개 — 하객이 참석 여부 제출 (service role로 insert)
export async function POST(request) {
  try {
    const body = await request.json();
    const { couple_id, name, attending, meal_count, phone, message } = body;

    if (!couple_id || !name?.trim()) {
      return NextResponse.json({ error: 'couple_id, name required' }, { status: 400 });
    }
    if (attending === undefined || attending === null) {
      return NextResponse.json({ error: 'attending required' }, { status: 400 });
    }

    const supabase = serviceClient();

    const { data, error } = await supabase
      .from('rsvp_responses')
      .insert({
        couple_id,
        name: name.trim(),
        attending: Boolean(attending),
        meal_count: Number(meal_count) || 1,
        phone: phone?.trim() || null,
        message: message?.trim() || null,
      })
      .select()
      .single();

    if (error) {
      console.error('[rsvp] insert error:', error.message);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, data });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
