import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

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
    const { searchParams } = new URL(request.url);
    const invitationId = searchParams.get('invitation_id');
    if (!invitationId) return NextResponse.json({ error: 'invitation_id required' }, { status: 400 });

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
    const body = await request.json();
    const { invitation_id, name, message } = body;

    if (!invitation_id || !name?.trim() || !message?.trim()) {
      return NextResponse.json({ error: 'invitation_id, name, message required' }, { status: 400 });
    }
    if (message.trim().length > 200) {
      return NextResponse.json({ error: '메시지는 200자 이내로 입력해주세요.' }, { status: 400 });
    }

    const supabase = serviceClient();
    const { data, error } = await supabase
      .from('invitation_guestbook')
      .insert({
        invitation_id,
        name: name.trim(),
        message: message.trim(),
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
