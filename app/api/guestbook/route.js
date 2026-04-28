export const dynamic = 'force-dynamic';

import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { createRateLimiter, getClientIp } from '@/lib/rate-limit';
import { isUUID, sanitizeString } from '@/lib/validate';
import { maskName } from '@/lib/maskName';

// POST: IP당 1분에 최대 5건 (스팸 방어)
const guestbookWriteLimiter = createRateLimiter({ windowMs: 60_000, max: 5 });
// GET: IP당 1분에 최대 60건 (슬라이드쇼/공개 페이지 폴링 고려)
const guestbookReadLimiter  = createRateLimiter({ windowMs: 60_000, max: 60 });

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
