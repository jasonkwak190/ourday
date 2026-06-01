export const dynamic = 'force-dynamic';

import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { createRateLimiter, getClientIp } from '@/lib/rate-limit';
import { isUUID, sanitizeString, isOneOf } from '@/lib/validate';

// Google Play UGC 정책 준수용 신고 엔드포인트.
// 공개 방명록(invitation_guestbook) / RSVP 응답(rsvp_responses)에 대한 신고를
// 비인증 상태에서도 접수할 수 있게 한다. 관리자만 조회 가능 (service role).
//
// 남용 방어: IP당 15분에 최대 5건.
const reportLimiter = createRateLimiter({ windowMs: 15 * 60_000, max: 5 });

const ALLOWED_TARGET_TYPES = ['guestbook', 'rsvp'];

function serviceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { persistSession: false } }
  );
}

// POST /api/report
// body: { target_type: 'guestbook' | 'rsvp', target_id: uuid, reason: string, reporter_name?: string }
export async function POST(request) {
  try {
    const ip = getClientIp(request);
    if (!reportLimiter(ip)) {
      return NextResponse.json(
        { error: '신고가 너무 많아요. 잠시 후 다시 시도해주세요.' },
        { status: 429 }
      );
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: '요청 형식이 올바르지 않아요.' }, { status: 400 });
    }

    const { target_type, target_id, reason, reporter_name } = body || {};

    if (!isOneOf(target_type, ALLOWED_TARGET_TYPES)) {
      return NextResponse.json(
        { error: 'target_type은 guestbook 또는 rsvp여야 해요.' },
        { status: 400 }
      );
    }

    if (!isUUID(target_id)) {
      return NextResponse.json({ error: 'target_id가 올바르지 않아요.' }, { status: 400 });
    }

    const reasonResult = sanitizeString(reason, {
      minLen: 5,
      maxLen: 500,
      fieldName: '신고 사유',
    });
    if (!reasonResult.ok) {
      return NextResponse.json({ error: reasonResult.error }, { status: 400 });
    }

    // 신고자 이름은 선택 (익명 신고 허용)
    const nameResult = sanitizeString(reporter_name, {
      minLen: 1,
      maxLen: 50,
      required: false,
      fieldName: '신고자 이름',
    });
    if (!nameResult.ok) {
      return NextResponse.json({ error: nameResult.error }, { status: 400 });
    }

    const supabase = serviceClient();
    const { error } = await supabase.from('reports').insert({
      target_type,
      target_id,
      reason: reasonResult.value,
      reporter_name: nameResult.value,
      reporter_ip: ip === 'unknown' ? null : ip,
    });

    if (error) {
      console.error('[report] insert error:', error.message);
      // 테이블 미생성(42P01) 등은 클라이언트에 노출하지 않고 일반 오류로 응답
      return NextResponse.json(
        { error: '신고 접수에 실패했어요. 잠시 후 다시 시도해주세요.' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (e) {
    console.error('[report] unexpected error:', e.message);
    return NextResponse.json(
      { error: '서버 오류가 발생했어요.' },
      { status: 500 }
    );
  }
}
