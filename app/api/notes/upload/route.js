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

    // 확장자는 반드시 화이트리스트에 있어야 함 (public 버킷이라 위장 파일 stored-XSS 방어)
    if (!ALLOWED_EXTENSIONS.has(ext)) {
      return NextResponse.json({
        error: `이 형식은 지원하지 않아요 (${file.type || ext || '알수없음'}). jpg/png/webp/heic만 가능합니다.`,
      }, { status: 400 });
    }
    // MIME이 명시됐다면 그것도 이미지 화이트리스트여야 함 (text/html 등 위장 차단)
    if (file.type && !ALLOWED_MIME_TYPES.has(file.type)) {
      return NextResponse.json({
        error: `이 형식은 지원하지 않아요 (${file.type}). 이미지 파일만 가능합니다.`,
      }, { status: 400 });
    }
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: '파일 크기는 15MB 이하여야 해요.' }, { status: 400 });
    }

    // contentType은 클라이언트 값을 신뢰하지 않고 검증된 확장자에서 직접 도출
    const EXT_TO_MIME = {
      jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png',
      webp: 'image/webp', heic: 'image/heic', heif: 'image/heif',
    };
    const safeContentType = EXT_TO_MIME[ext] || 'image/jpeg';

    // ── Storage 업로드 (service role) ──
    const supabase = serviceClient();
    const storagePath = `${coupleId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
    const buffer = Buffer.from(await file.arrayBuffer());

    const { error: uploadErr } = await supabase.storage
      .from('note-images')
      .upload(storagePath, buffer, {
        contentType: safeContentType,
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

// DELETE /api/notes/upload?url=... — 노트 삭제 시 Storage 사진 정리 (orphan 방지)
export async function DELETE(request) {
  try {
    const authClient = await createSupabaseServerClient();
    const { data: { session } } = await authClient.auth.getSession();
    if (!session) return NextResponse.json({ error: '로그인이 필요해요.' }, { status: 401 });

    const { data: userData } = await authClient
      .from('users').select('couple_id').eq('id', session.user.id).single();
    if (!userData?.couple_id) return NextResponse.json({ error: '커플 연동이 필요해요.' }, { status: 403 });

    const { searchParams } = new URL(request.url);
    const url = searchParams.get('url');
    if (!url) return NextResponse.json({ error: 'url required' }, { status: 400 });

    // URL 파싱 + 호스트가 우리 Supabase 프로젝트인지 확인 (외부 URL 차단)
    let parsed;
    try { parsed = new URL(url); } catch { return NextResponse.json({ error: 'invalid url' }, { status: 400 }); }
    const supabaseHost = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).host;
    if (parsed.host !== supabaseHost) {
      return NextResponse.json({ error: 'forbidden host' }, { status: 403 });
    }

    // 경로 추출 — pathname에서 /storage/v1/object/public/note-images/ 이후를 사용
    const marker = '/note-images/';
    const idx = parsed.pathname.indexOf(marker);
    if (idx === -1) return NextResponse.json({ error: 'invalid url' }, { status: 400 });
    const path = decodeURIComponent(parsed.pathname.slice(idx + marker.length));

    // 경로 정규화 공격 차단 (../, .\, 빈 세그먼트 등) — Storage 드라이버에 따라 통과 가능
    if (path.includes('..') || path.includes('\\') || path.includes('//')) {
      return NextResponse.json({ error: 'invalid path' }, { status: 400 });
    }

    // 소유권 확인 — 경로는 ${coupleId}/... 형태. 본인 커플 사진만 삭제 가능
    if (!path.startsWith(`${userData.couple_id}/`)) {
      return NextResponse.json({ error: 'forbidden' }, { status: 403 });
    }

    await serviceClient().storage.from('note-images').remove([path]);
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[notes/upload DELETE] error:', err);
    return NextResponse.json({ error: '서버 오류가 발생했어요.' }, { status: 500 });
  }
}
