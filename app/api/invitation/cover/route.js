export const dynamic = 'force-dynamic';

import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

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
    const formData  = await request.formData();
    const file      = formData.get('file');
    const coupleId  = formData.get('couple_id');

    if (!file || !coupleId) {
      return NextResponse.json({ error: '파일과 커플 ID가 필요해요.' }, { status: 400 });
    }

    const ext = file.name.split('.').pop()?.toLowerCase() || '';
    // HEIC는 서버에서 JPEG로 처리 (브라우저 MIME 타입이 다를 수 있음)
    const mimeOk = ALLOWED_MIME_TYPES.has(file.type) || file.type === '' || file.type.includes('heic');

    if (!ALLOWED_EXTENSIONS.has(ext) || !mimeOk) {
      return NextResponse.json({ error: 'jpg, png, webp 파일만 업로드할 수 있어요.' }, { status: 400 });
    }

    if (file.size > MAX_SIZE) {
      return NextResponse.json({ error: '파일 크기는 10MB 이하여야 해요.' }, { status: 400 });
    }

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
        contentType: ext === 'heic' ? 'image/jpeg' : file.type,
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
