export const dynamic = 'force-dynamic';

import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase-server';

const MAX_SIZE = 10 * 1024 * 1024;
const ALLOWED_EXTENSIONS = new Set(['jpg', 'jpeg', 'png', 'webp', 'heic']);
const BUCKET = 'invitation-covers';

function serviceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { persistSession: false } }
  );
}

export async function POST(request) {
  try {
    // ── 인증 + couple_id 소유권 검증 ──────────────────────────
    const authClient = await createSupabaseServerClient();
    const { data: { session } } = await authClient.auth.getSession();
    if (!session) {
      return NextResponse.json({ error: '로그인이 필요해요.' }, { status: 401 });
    }
    const { data: userData } = await authClient
      .from('users').select('couple_id').eq('id', session.user.id).single();
    // ──────────────────────────────────────────────────────────

    const formData = await request.formData();
    const file     = formData.get('file');
    const coupleId = formData.get('couple_id');

    if (!file || !coupleId) {
      return NextResponse.json({ error: '파일과 커플 ID가 필요해요.' }, { status: 400 });
    }

    // 요청한 couple_id가 실제 본인 커플인지 확인
    if (!userData?.couple_id || userData.couple_id !== coupleId) {
      return NextResponse.json({ error: '권한이 없어요.' }, { status: 403 });
    }

    const ext   = file.name.split('.').pop()?.toLowerCase() || '';
    const mimeOk = ['image/jpeg','image/png','image/webp'].includes(file.type)
                || file.type === '' || file.type.includes('heic');

    if (!ALLOWED_EXTENSIONS.has(ext) || !mimeOk) {
      return NextResponse.json({ error: 'jpg, png, webp 파일만 업로드할 수 있어요.' }, { status: 400 });
    }
    if (file.size > MAX_SIZE) {
      return NextResponse.json({ error: '파일 크기는 10MB 이하여야 해요.' }, { status: 400 });
    }

    const supabase = serviceClient();
    const realExt  = ext === 'heic' ? 'jpg' : ext;
    const filename = `${coupleId}/photos/photo-${Date.now()}.${realExt}`;
    const buffer   = Buffer.from(await file.arrayBuffer());

    const { error: uploadErr } = await supabase.storage
      .from(BUCKET)
      .upload(filename, buffer, {
        contentType: ext === 'heic' ? 'image/jpeg' : file.type,
        upsert: false,
      });

    if (uploadErr) {
      console.error('[photo upload]', uploadErr);
      return NextResponse.json({ error: '업로드에 실패했어요.' }, { status: 500 });
    }

    const { data: { publicUrl } } = supabase.storage
      .from(BUCKET)
      .getPublicUrl(filename);

    return NextResponse.json({ url: publicUrl });
  } catch (err) {
    console.error('[photo upload] error:', err);
    return NextResponse.json({ error: '서버 오류가 발생했어요.' }, { status: 500 });
  }
}
