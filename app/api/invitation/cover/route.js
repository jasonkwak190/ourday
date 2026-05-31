export const dynamic = 'force-dynamic';

import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase-server';

const MAX_SIZE = 10 * 1024 * 1024; // 10 MB
const ALLOWED_EXTENSIONS = new Set(['jpg', 'jpeg', 'png', 'webp', 'heic']);
const ALLOWED_MIME_TYPES  = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/heic']);
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

    const formData  = await request.formData();
    const file      = formData.get('file');
    const coupleId  = formData.get('couple_id');

    if (!file || !coupleId) {
      return NextResponse.json({ error: '파일과 커플 ID가 필요해요.' }, { status: 400 });
    }

    // 요청한 couple_id가 실제 본인 커플인지 확인
    if (!userData?.couple_id || userData.couple_id !== coupleId) {
      return NextResponse.json({ error: '권한이 없어요.' }, { status: 403 });
    }

    // 확장자 필수 화이트리스트 검증 (public 버킷이라 위장 파일 stored-XSS 방어)
    const filename0 = String(file.name || '');
    const dotIdx = filename0.lastIndexOf('.');
    const ext = dotIdx > 0 ? filename0.slice(dotIdx + 1).toLowerCase() : '';
    if (!ALLOWED_EXTENSIONS.has(ext)) {
      return NextResponse.json({ error: 'jpg, png, webp, heic 파일만 업로드할 수 있어요.' }, { status: 400 });
    }
    // MIME이 명시됐다면 그것도 이미지 화이트리스트여야 함 (text/html 등 위장 차단)
    if (file.type && !ALLOWED_MIME_TYPES.has(file.type)) {
      return NextResponse.json({ error: `이 형식은 지원하지 않아요 (${file.type}).` }, { status: 400 });
    }
    if (file.size > MAX_SIZE) {
      return NextResponse.json({ error: '파일 크기는 10MB 이하여야 해요.' }, { status: 400 });
    }

    // contentType은 클라이언트 값 불신 — 검증된 확장자에서 직접 도출
    const EXT_TO_MIME = { jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp', heic: 'image/jpeg' };
    const safeContentType = EXT_TO_MIME[ext] || 'image/jpeg';

    const supabase = serviceClient();

    // 기존 커버 이미지 삭제 (있으면)
    const { data: existing } = await supabase.storage
      .from(BUCKET)
      .list(coupleId);
    if (existing?.length) {
      await supabase.storage
        .from(BUCKET)
        .remove(existing.map(f => `${coupleId}/${f.name}`));
    }

    // 업로드
    const filename = `${coupleId}/cover-${Date.now()}.${ext === 'heic' ? 'jpg' : ext}`;
    const buffer   = Buffer.from(await file.arrayBuffer());

    const { error: uploadErr } = await supabase.storage
      .from(BUCKET)
      .upload(filename, buffer, {
        contentType: safeContentType,
        upsert: true,
      });

    if (uploadErr) {
      console.error('[cover upload] storage error:', uploadErr);
      return NextResponse.json({ error: '업로드에 실패했어요.' }, { status: 500 });
    }

    const { data: { publicUrl } } = supabase.storage
      .from(BUCKET)
      .getPublicUrl(filename);

    return NextResponse.json({ url: publicUrl });

  } catch (err) {
    console.error('[cover upload] error:', err);
    return NextResponse.json({ error: '서버 오류가 발생했어요.' }, { status: 500 });
  }
}
