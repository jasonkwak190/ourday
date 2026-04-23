export const dynamic = 'force-dynamic';

import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

/**
 * GET /api/cleanup
 *
 * Vercel Cron이 매일 새벽 3시에 자동 호출 (vercel.json 설정)
 * Authorization: Bearer <CRON_SECRET> 헤더로 인증
 *
 * 삭제 대상:
 *   - rsvp_responses: 결혼일 + 1년 지난 커플 데이터
 *   - invitation_guestbook: 동일 조건 커플의 청첩장 방명록
 */
export async function GET(request) {
  // ── 인증 ──────────────────────────────────────────────────
  const authHeader = request.headers.get('authorization');
  const secret = process.env.CRON_SECRET;

  if (!secret) {
    console.error('[cleanup] CRON_SECRET 환경변수가 설정되지 않았습니다.');
    return NextResponse.json({ error: 'Server misconfiguration' }, { status: 500 });
  }
  if (authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // ── Supabase (service role) ────────────────────────────────
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { persistSession: false } }
  );

  // 1년 전 날짜
  const oneYearAgo = new Date();
  oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
  const cutoff = oneYearAgo.toISOString().slice(0, 10); // 'YYYY-MM-DD'

  const results = { rsvp: 0, guestbook: 0, errors: [] };

  try {
    // ── ① 만료된 커플 ID 조회 ──────────────────────────────
    const { data: expiredCouples, error: coupleErr } = await supabase
      .from('couples')
      .select('id')
      .lt('wedding_date', cutoff); // wedding_date < 1년 전

    if (coupleErr) throw new Error(`couples 조회 실패: ${coupleErr.message}`);
    if (!expiredCouples?.length) {
      console.log('[cleanup] 파기 대상 없음');
      return NextResponse.json({ success: true, message: '파기 대상 없음', cutoff, ...results });
    }

    const coupleIds = expiredCouples.map(c => c.id);
    console.log(`[cleanup] 대상 커플 ${coupleIds.length}개 (wedding_date < ${cutoff})`);

    // ── ② rsvp_responses 삭제 ─────────────────────────────
    const { count: rsvpCount, error: rsvpErr } = await supabase
      .from('rsvp_responses')
      .delete({ count: 'exact' })
      .in('couple_id', coupleIds);

    if (rsvpErr) {
      results.errors.push(`rsvp_responses: ${rsvpErr.message}`);
    } else {
      results.rsvp = rsvpCount ?? 0;
    }

    // ── ③ 만료된 커플의 invitation ID 조회 ───────────────
    const { data: expiredInvitations, error: invErr } = await supabase
      .from('invitations')
      .select('id')
      .in('couple_id', coupleIds);

    if (invErr) {
      results.errors.push(`invitations 조회: ${invErr.message}`);
    } else if (expiredInvitations?.length) {
      const invitationIds = expiredInvitations.map(i => i.id);

      // ── ④ invitation_guestbook 삭제 ───────────────────
      const { count: gbCount, error: gbErr } = await supabase
        .from('invitation_guestbook')
        .delete({ count: 'exact' })
        .in('invitation_id', invitationIds);

      if (gbErr) {
        results.errors.push(`invitation_guestbook: ${gbErr.message}`);
      } else {
        results.guestbook = gbCount ?? 0;
      }
    }

    // ── 결과 로그 ─────────────────────────────────────────
    console.log(`[cleanup] 완료 — RSVP ${results.rsvp}건, 방명록 ${results.guestbook}건 파기`);

    return NextResponse.json({
      success: results.errors.length === 0,
      cutoff,
      deleted: { rsvp: results.rsvp, guestbook: results.guestbook },
      errors: results.errors.length ? results.errors : undefined,
    });

  } catch (e) {
    console.error('[cleanup] 오류:', e.message);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
