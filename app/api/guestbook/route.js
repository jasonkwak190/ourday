export const dynamic = 'force-dynamic';

import { createClient } from '@supabase/supabase-js';
import { createServerClient } from '@supabase/ssr';
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createRateLimiter, getClientIp } from '@/lib/rate-limit';
import { isUUID, sanitizeString } from '@/lib/validate';
import { maskName } from '@/lib/maskName';

// POST: IP당 1분에 최대 5건 (스팸 방어)
const guestbookWriteLimiter = createRateLimiter({ windowMs: 60_000, max: 5 });
// GET: IP당 1분에 최대 60건 (슬라이드쇼/공개 페이지 폴링 고려)
const guestbookReadLimiter  = createRateLimiter({ windowMs: 60_000, max: 60 });
// DELETE: 커플 본인 모더레이션. IP당 1분 30건 (잘못된 호출 방어용 최소 보호)
const guestbookDeleteLimiter = createRateLimiter({ windowMs: 60_000, max: 30 });

function serviceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { persistSession: false } }
  );
}

function anonClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    { auth: { persistSession: false } }
  );
}

// GET /api/guestbook?invitation_id=xxx&before=ISO_DATE  — 방명록 목록 (공개)
// before: 이 시각 이전 메시지만 (cursor pagination, "더 보기"용)
//
// 프라이버시: 이름은 마스킹된 채로 응답 (공개 페이지용).
// 인증된 커플은 RLS를 통해 supabase에서 직접 invitation_guestbook 뷰 조회 → 원본 이름.
export async function GET(request) {
  try {
    const ip = getClientIp(request);
    if (!guestbookReadLimiter(ip)) {
      return NextResponse.json({ error: '요청이 너무 많아요. 잠시 후 다시 시도해주세요.' }, { status: 429 });
    }

    const { searchParams } = new URL(request.url);
    const invitationId = searchParams.get('invitation_id');
    const before = searchParams.get('before');
    if (!invitationId || !isUUID(invitationId)) {
      return NextResponse.json({ error: 'invitation_id required (UUID)' }, { status: 400 });
    }

    const supabase = anonClient();
    let query = supabase
      .from('invitation_guestbook')
      .select('id, name, message, created_at')
      .eq('invitation_id', invitationId)
      .order('created_at', { ascending: false })
      .limit(30);

    if (before) {
      query = query.lt('created_at', before);
    }

    const { data, error } = await query;

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    // 이름 마스킹 (프라이버시)
    const masked = (data || []).map(entry => ({
      ...entry,
      name: maskName(entry.name),
    }));

    // hasMore: 받은 결과가 limit과 같으면 더 있을 수 있음
    return NextResponse.json({
      data: masked,
      hasMore: masked.length === 30,
    });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

// POST /api/guestbook  — 방명록 등록 (비인증, service role)
export async function POST(request) {
  try {
    const ip = getClientIp(request);
    if (!guestbookWriteLimiter(ip)) {
      return NextResponse.json({ error: '요청이 너무 많아요. 잠시 후 다시 시도해주세요.' }, { status: 429 });
    }

    const body = await request.json();
    const { invitation_id, name, message } = body;

    if (!isUUID(invitation_id)) {
      return NextResponse.json({ error: 'invitation_id required (UUID)' }, { status: 400 });
    }

    const nameResult = sanitizeString(name, { minLen: 2, maxLen: 50, fieldName: '이름' });
    if (!nameResult.ok) return NextResponse.json({ error: nameResult.error }, { status: 400 });

    const msgResult = sanitizeString(message, { maxLen: 200, fieldName: '메시지' });
    if (!msgResult.ok) return NextResponse.json({ error: msgResult.error }, { status: 400 });

    const supabase = serviceClient();
    const { data, error } = await supabase
      .from('invitation_guestbook')
      .insert({
        invitation_id,
        name: nameResult.value,
        message: msgResult.value,
      })
      .select('id, name, message, created_at')
      .single();

    if (error) {
      console.error('[guestbook] insert error:', error.message);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    // 응답 시점부터 이름 마스킹 (공개 페이지에서 GET과 일관성)
    const masked = data ? { ...data, name: maskName(data.name) } : data;
    return NextResponse.json({ success: true, data: masked });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

// 인증된 사용자 세션 확인 (delete-account 패턴 차용)
async function getAuthUser() {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() { return cookieStore.getAll(); },
        setAll(cookiesToSet) {
          try { cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options)); }
          catch { /* Server Component에서는 무시 */ }
        },
      },
    }
  );
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

// DELETE /api/guestbook?id=<entry_uuid>
// 커플 본인의 청첩장에 달린 방명록 항목만 삭제 가능 (UGC 모더레이션)
export async function DELETE(request) {
  try {
    const ip = getClientIp(request);
    if (!guestbookDeleteLimiter(ip)) {
      return NextResponse.json(
        { error: '요청이 너무 많아요. 잠시 후 다시 시도해주세요.' },
        { status: 429 }
      );
    }

    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: '로그인이 필요해요.' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const entryId = searchParams.get('id');
    if (!isUUID(entryId)) {
      return NextResponse.json({ error: 'id가 올바르지 않아요.' }, { status: 400 });
    }

    const admin = serviceClient();

    // 1) 사용자의 couple_id 확인
    const { data: userRow, error: userErr } = await admin
      .from('users')
      .select('couple_id')
      .eq('id', user.id)
      .single();
    if (userErr || !userRow?.couple_id) {
      return NextResponse.json({ error: '커플 정보가 없어요.' }, { status: 403 });
    }

    // 2) 해당 방명록 entry의 invitation_id를 가져온 후
    //    그 invitation이 이 커플 소유인지 확인
    const { data: entry, error: entryErr } = await admin
      .from('invitation_guestbook')
      .select('id, invitation_id')
      .eq('id', entryId)
      .single();
    if (entryErr || !entry) {
      return NextResponse.json({ error: '항목을 찾을 수 없어요.' }, { status: 404 });
    }

    const { data: inv, error: invErr } = await admin
      .from('invitations')
      .select('id, couple_id')
      .eq('id', entry.invitation_id)
      .single();
    if (invErr || !inv || inv.couple_id !== userRow.couple_id) {
      // 다른 커플의 항목을 만지려 하면 그대로 권한 거부
      return NextResponse.json({ error: '삭제 권한이 없어요.' }, { status: 403 });
    }

    // 3) 삭제 실행 (service role bypass RLS)
    const { error: delErr } = await admin
      .from('invitation_guestbook')
      .delete()
      .eq('id', entryId);
    if (delErr) {
      console.error('[guestbook] delete error:', delErr.message);
      return NextResponse.json({ error: '삭제에 실패했어요.' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (e) {
    console.error('[guestbook] DELETE unexpected error:', e.message);
    return NextResponse.json({ error: '서버 오류가 발생했어요.' }, { status: 500 });
  }
}
