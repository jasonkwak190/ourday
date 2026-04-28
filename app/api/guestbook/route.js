export const dynamic = 'force-dynamic';

import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { createRateLimiter, getClientIp } from '@/lib/rate-limit';
import { isUUID, sanitizeString } from '@/lib/validate';

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

// GET /api/guestbook?invitation_id=xxx  — 방명록 목록 (공개)
export async function GET(request) {
  try {
    const ip = getClientIp(request);
    if (!guestbookReadLimiter(ip)) {
      return NextResponse.json({ error: '요청이 너무 많아요. 잠시 후 다시 시도해주세요.' }, { status: 429 });
    }

    const { searchParams } = new URL(request.url);
    const invitationId = searchParams.get('invitation_id');
    if (!invitationId || !isUUID(invitationId)) {
      return NextResponse.json({ error: 'invitation_id required (UUID)' }, { status: 400 });
    }

    const supabase = anonClient();
    const { data, error } = await supabase
      .from('invitation_guestbook')
      .select('id, name, message, created_at')
      .eq('invitation_id', invitationId)
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ data: data || [] });
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
    return NextResponse.json({ success: true, data });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
