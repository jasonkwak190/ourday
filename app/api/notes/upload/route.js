export const dynamic = 'force-dynamic';

import { createClient } from '@supabase/supabase-js';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { NextResponse } from 'next/server';

const MAX_FILE_SIZE = 15 * 1024 * 1024; // 15 MB (iPhone HEIC·라이브포토 여유)
const ALLOWED_EXTENSIONS = new Set(['jpg', 'jpeg', 'png', 'webp', 'heic', 'heif']);
const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg', 'image/png', 'image/webp',
  'image/heic', 'image/heif',
  'image/heic-sequence', 'image/heif-sequence',
]);

function serviceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { persistSession: false } }
  );
}

// POST /api/notes/upload — 우리 노트 사진 업로드 (커플 인증 필요)
export async function POST(request) {
  try {
    // ── 인증 + 커플 확인 ──
    const authClient = await createSupabaseServerClient();
    const { data: { session } } = await authClient.auth.getSession();
    if (!session) return NextResponse.json({ error: '로그인이 필요해요.' }, { status: 401 });

    const { data: userData } = await authClient
      .from('users').select('couple_id').eq('id', session.user.id).single();
    if (!userData?.couple_id) return NextResponse.json({ error: '커플 연동이 필요해요.' }, { status: 403 });

    const coupleId = userData.couple_id;

    // ── 파일 검증 ──
    const formData = await request.formData();
    const file = formData.get('file');
    if (!file) return NextResponse.json({ error: '파일이 없어요.' }, { status: 400 });

    const filename = String(file.name || '');
    const dotIdx = filename.lastIndexOf('.');
    let ext = dotIdx > 0 ? filename.slice(dotIdx + 1).toLowerCase() : '';
    if (!ext && file.type) {
      const mimeMap = {
        'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp',
        'image/heic': 'heic', 'image/heif': 'heif',
        'image/heic-sequence': 'heic', 'image/heif-sequence': 'heif',
      };
      ext = mimeMap[file.type] || '';
    }

    const extOk = ALLOWED_EXTENSIONS.has(ext);
    const mimeOk = ALLOWED_MIME_TYPES.has(file.type);
    if (!extOk && !mimeOk) {
      return NextResponse.json({
        error: `이 형식은 지원하지 않아요 (${file.type || ext || '알수없음'}). jpg/png/webp/heic만 가능합니다.`,
      }, { status: 400 });
    }
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: '파일 크기는 15MB 이하여야 해요.' }, { status: 400 });
    }
    if (!ext) ext = 'jpg';

    // ── Storage 업로드 (service role) ──
    const supabase = serviceClient();
    const storagePath = `${coupleId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
    const buffer = Buffer.from(await file.arrayBuffer());

    const { error: uploadErr } = await supabase.storage
      .from('note-images')
      .upload(storagePath, buffer, {
        contentType: file.type || `image/${ext === 'jpg' ? 'jpeg' : ext}`,
        upsert: false,
      });

    if (uploadErr) {
      console.error('[notes/upload] storage error:', uploadErr);
      return NextResponse.json({ error: '업로드에 실패했어요. 다시 시도해주세요.' }, { status: 500 });
    }

    // public 버킷 → public URL 반환 (경로는 추측 불가한 랜덤값)
    const { data: pub } = supabase.storage.from('note-images').getPublicUrl(storagePath);

    return NextResponse.json({ success: true, url: pub.publicUrl, path: storagePath });
  } catch (err) {
    console.error('[notes/upload] error:', err);
    return NextResponse.json({ error: '서버 오류가 발생했어요.' }, { status: 500 });
  }
}
