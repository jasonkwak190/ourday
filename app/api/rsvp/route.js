export const dynamic = 'force-dynamic';

import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { createRateLimiter, getClientIp } from '@/lib/rate-limit';
import { isUUID, sanitizeString, sanitizeInt, isOneOf } from '@/lib/validate';

// Rate limit: IP당 1분에 최대 10회 (GET + POST 합산)
const rsvpLimiter = createRateLimiter({ windowMs: 60_000, max: 10 });

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
    const ip = getClientIp(request);
    if (!rsvpLimiter(ip)) {
      return NextResponse.json({ error: '요청이 너무 많아요. 잠시 후 다시 시도해주세요.' }, { status: 429 });
    }

    const { searchParams } = new URL(request.url);
    const coupleId = searchParams.get('couple_id');
    if (!isUUID(coupleId)) return NextResponse.json({ error: 'couple_id required (UUID)' }, { status: 400 });

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
// 참석인 경우 guests 테이블에도 자동 매핑
export async function POST(request) {
  try {
    const ip = getClientIp(request);
    if (!rsvpLimiter(ip)) {
      return NextResponse.json({ error: '요청이 너무 많아요. 잠시 후 다시 시도해주세요.' }, { status: 429 });
    }

    const body = await request.json();
    const { couple_id, name, side, attending, meal_count, phone, message } = body;

    if (!isUUID(couple_id)) {
      return NextResponse.json({ error: 'couple_id required (UUID)' }, { status: 400 });
    }
    if (attending === undefined || attending === null) {
      return NextResponse.json({ error: 'attending required' }, { status: 400 });
    }

    const nameResult = sanitizeString(name, { minLen: 2, maxLen: 50, fieldName: '이름' });
    if (!nameResult.ok) return NextResponse.json({ error: nameResult.error }, { status: 400 });

    // 입력값 정제 (validate 유틸 + 기존 패턴 통합)
    const safeName    = nameResult.value;
    const safePhone   = phone ? String(phone).trim().slice(0, 20) : null;
    const safeMessage = message ? String(message).trim().slice(0, 500) : null;
    const safeSide    = isOneOf(side, ['groom', 'bride']) ? side : null;
    const safeMeals   = sanitizeInt(meal_count, { min: 1, max: 20, fallback: 1 });

    const supabase = serviceClient();

    // ── couple_id 유효성 확인 (invitations 또는 couples 존재 여부) ──
    const { data: coupleCheck } = await supabase
      .from('couples')
      .select('id')
      .eq('id', couple_id)
      .maybeSingle();

    if (!coupleCheck) {
      return NextResponse.json({ error: '유효하지 않은 couple_id예요.' }, { status: 400 });
    }

    // ── 중복 제출 방지: 같은 이름+커플로 기존 RSVP 확인 ──────
    const { data: existingRsvp } = await supabase
      .from('rsvp_responses')
      .select('id')
      .eq('couple_id', couple_id)
      .eq('name', safeName)
      .maybeSingle();

    let data, rsvpError;

    if (existingRsvp) {
      // 기존 응답 업데이트 (마음이 바뀐 경우)
      const { data: updated, error: updateErr } = await supabase
        .from('rsvp_responses')
        .update({
          side: safeSide,
          attending: Boolean(attending),
          meal_count: safeMeals,
          phone: safePhone,
          message: safeMessage,
        })
        .eq('id', existingRsvp.id)
        .select()
        .single();
      data = updated;
      rsvpError = updateErr;
    } else {
      // 신규 RSVP 등록
      const { data: inserted, error: insertErr } = await supabase
        .from('rsvp_responses')
        .insert({
          couple_id,
          name: safeName,
          side: safeSide,
          attending: Boolean(attending),
          meal_count: safeMeals,
          phone: safePhone,
          message: safeMessage,
        })
        .select()
        .single();
      data = inserted;
      rsvpError = insertErr;
    }

    if (rsvpError) {
      console.error('[rsvp] upsert error:', rsvpError.message);
      return NextResponse.json({ error: '저장에 실패했어요. 다시 시도해주세요.' }, { status: 500 });
    }

    // 2) 참석인 경우 → guests 테이블에 자동 매핑
    if (Boolean(attending)) {
      // 이름+커플ID로 기존 하객 검색
      const { data: existingGuest } = await supabase
        .from('guests')
        .select('id')
        .eq('couple_id', couple_id)
        .eq('name', safeName)
        .maybeSingle();

      if (existingGuest) {
        // 이미 있으면 식사수·연락처 업데이트
        await supabase
          .from('guests')
          .update({
            meal_count: safeMeals,
            phone: safePhone,
            ...(safeSide ? { side: safeSide } : {}),
          })
          .eq('id', existingGuest.id);
      } else {
        // 없으면 새로 추가
        await supabase
          .from('guests')
          .insert({
            couple_id,
            name: safeName,
            side: safeSide || 'groom',
            relation: '지인',
            meal_count: safeMeals,
            phone: safePhone,
            memo: 'RSVP 자동 등록',
          });
      }
    }

    return NextResponse.json({ success: true, data });
  } catch (e) {
    console.error('[rsvp] unexpected error:', e.message);
    return NextResponse.json({ error: '서버 오류가 발생했어요.' }, { status: 500 });
  }
}
