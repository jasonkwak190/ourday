export const dynamic = 'force-dynamic';

import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { createRateLimiter, getClientIp } from '@/lib/rate-limit';

// IP당 1분에 5건 — CRON_SECRET 유출 시 무차별 호출 차단 (정상 cron은 일 1회)
const cleanupLimiter = createRateLimiter({ windowMs: 60_000, max: 5 });

/**
 * GET /api/cleanup
 *
 * Vercel Cron이 매일 새벽 3시에 자동 호출 (vercel.json 설정)
 * Authorization: Bearer <CRON_SECRET> 헤더로 인증
 *
 * 삭제 대상 (결혼일 + 1년 지난 커플):
 *   - rsvp_responses
 *   - invitation_guestbook
 *   - guest_photos (DB row) + Storage 객체 (note-images/guest-photos/invitation-covers)
 *   - couple_notes (image_url 포함)
 *   - photo_events
 * 개인정보처리방침의 "예식일로부터 1년" 보유 약속 준수 (PIPA 21조).
 */
export async function GET(request) {
  // ── 레이트리밋 ─────────────────────────────────────────────
  const ip = getClientIp(request);
  if (!cleanupLimiter(ip)) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
  }

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

  const results = {
    rsvp: 0, guestbook: 0,
    note_rows: 0, note_storage: 0,
    guest_photo_rows: 0, guest_photo_storage: 0,
    invitation_storage: 0,
    photo_events: 0,
    errors: [],
  };

  // Storage 경로 일괄 삭제 헬퍼 — 100개씩 청크 (Supabase remove API 한도)
  async function removeStorageBatch(bucket, paths) {
    if (!paths?.length) return 0;
    let removed = 0;
    for (let i = 0; i < paths.length; i += 100) {
      const chunk = paths.slice(i, i + 100);
      const { error } = await supabase.storage.from(bucket).remove(chunk);
      if (error) results.errors.push(`storage ${bucket}: ${error.message}`);
      else removed += chunk.length;
    }
    return removed;
  }
  // 버킷의 특정 prefix 하위 모든 파일 경로 수집 (재귀, 100개 페이지)
  async function listAllUnder(bucket, prefix) {
    const out = [];
    let offset = 0;
    while (true) {
      const { data, error } = await supabase.storage.from(bucket).list(prefix, { limit: 100, offset });
      if (error) { results.errors.push(`list ${bucket}/${prefix}: ${error.message}`); break; }
      if (!data || data.length === 0) break;
      for (const f of data) {
        // f.name이 폴더면 metadata가 null
        if (f.metadata) out.push(`${prefix}/${f.name}`);
      }
      if (data.length < 100) break;
      offset += 100;
    }
    return out;
  }

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

      if (gbErr) results.errors.push(`invitation_guestbook: ${gbErr.message}`);
      else results.guestbook = gbCount ?? 0;
    }

    // ── ⑤ photo_events / guest_photos + Storage 정리 ──
    const { data: expiredEvents } = await supabase
      .from('photo_events').select('id').in('couple_id', coupleIds);
    const eventIds = (expiredEvents || []).map(e => e.id);

    if (eventIds.length) {
      // guest_photos DB row 삭제
      const { count: gpCount } = await supabase
        .from('guest_photos').delete({ count: 'exact' }).in('event_id', eventIds);
      results.guest_photo_rows = gpCount ?? 0;

      // guest-photos Storage: 각 event_id 폴더 하위 전체 삭제
      for (const eid of eventIds) {
        const paths = await listAllUnder('guest-photos', eid);
        results.guest_photo_storage += await removeStorageBatch('guest-photos', paths);
      }

      // photo_events row 삭제
      const { count: peCount } = await supabase
        .from('photo_events').delete({ count: 'exact' }).in('id', eventIds);
      results.photo_events = peCount ?? 0;
    }

    // ── ⑥ couple_notes DB + note-images Storage 정리 ──
    const { count: cnCount } = await supabase
      .from('couple_notes').delete({ count: 'exact' }).in('couple_id', coupleIds);
    results.note_rows = cnCount ?? 0;

    for (const cid of coupleIds) {
      const paths = await listAllUnder('note-images', cid);
      results.note_storage += await removeStorageBatch('note-images', paths);
    }

    // ── ⑦ invitation-covers Storage 정리 (DB는 invitations CASCADE) ──
    for (const cid of coupleIds) {
      // 청첩장 커버는 `${coupleId}/cover-*` 이고 photo는 `${coupleId}/photos/*`
      const root = await listAllUnder('invitation-covers', cid);
      const photos = await listAllUnder('invitation-covers', `${cid}/photos`);
      results.invitation_storage += await removeStorageBatch('invitation-covers', [...root, ...photos]);
    }

    // ── ⑧ 마지막으로 invitations row 삭제 (방명록 위에서 처리됨) ──
    await supabase.from('invitations').delete().in('couple_id', coupleIds);

    // ── 결과 ─────────────────────────────────────────
    console.log(`[cleanup] 완료 — couples ${coupleIds.length}개 만료 처리, errors=${results.errors.length}`);

    return NextResponse.json({
      success: results.errors.length === 0,
      cutoff,
      deleted: results,
      errors: results.errors.length ? results.errors : undefined,
    });

  } catch (e) {
    console.error('[cleanup] 오류:', e.message);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
