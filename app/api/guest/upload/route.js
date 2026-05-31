export const dynamic = 'force-dynamic';

import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { createRateLimiter, getClientIp } from '@/lib/rate-limit';
import { isShortCode } from '@/lib/validate';

const MAX_FREE_PHOTOS = 50;
const MAX_FILE_SIZE  = 15 * 1024 * 1024; // 15 MB (iPhone Live Photo·HEIC 여유)

// 허용 확장자 + MIME 타입 화이트리스트
// HEIC/HEIF: iPhone 기본 포맷. 갤러리 표시는 Safari만 가능하지만 저장은 허용
const ALLOWED_EXTENSIONS = new Set(['jpg', 'jpeg', 'png', 'webp', 'heic', 'heif']);
const ALLOWED_MIME_TYPES  = new Set([
  'image/jpeg', 'image/png', 'image/webp',
  'image/heic', 'image/heif',
  'image/heic-sequence', 'image/heif-sequence',
]);

// Rate limit: IP당 1분에 최대 5장 업로드
const uploadLimiter = createRateLimiter({ windowMs: 60_000, max: 5 });

function serviceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { persistSession: false } }
  );
}

export async function POST(request) {
  try {
    // ── Rate limit 체크 ────────────────────────────────────────
    const ip = getClientIp(request);
    if (!uploadLimiter(ip)) {
      return NextResponse.json({ error: '요청이 너무 많아요. 잠시 후 다시 시도해주세요.' }, { status: 429 });
    }

    const formData = await request.formData();
    const file         = formData.get('file');
    const eventCode    = formData.get('event_code');
    const uploaderName = formData.get('uploader_name') || null;

    // ── 기본 검증 ──────────────────────────────────────────────
    if (!file || !eventCode) {
      return NextResponse.json({ error: '파일과 이벤트 코드가 필요해요.' }, { status: 400 });
    }
    if (!isShortCode(eventCode)) {
      return NextResponse.json({ error: '유효하지 않은 이벤트 코드 형식이에요.' }, { status: 400 });
    }

    // 파일 확장자 추출 — 점이 없으면 MIME에서 추론
    const filename = String(file.name || '');
    const dotIdx = filename.lastIndexOf('.');
    let ext = dotIdx > 0 ? filename.slice(dotIdx + 1).toLowerCase() : '';
    // 일부 모바일은 file.name이 'image' 처럼 확장자 없이 옴 → MIME에서 ext 추론
    if (!ext && file.type) {
      const mimeMap = {
        'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp',
        'image/heic': 'heic', 'image/heif': 'heif',
        'image/heic-sequence': 'heic', 'image/heif-sequence': 'heif',
      };
      ext = mimeMap[file.type] || '';
    }

    // 확장자는 반드시 화이트리스트에 있어야 함 (위장 파일 stored-XSS 방어)
    if (!ALLOWED_EXTENSIONS.has(ext)) {
      return NextResponse.json({
        error: `이 형식은 지원하지 않아요 (${file.type || ext || '알수없음'}). jpg/png/webp/heic만 가능합니다.`,
      }, { status: 400 });
    }
    // MIME이 명시됐다면 그것도 이미지 화이트리스트여야 함
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

    // uploader_name 길이 제한
    const safeUploaderName = uploaderName ? String(uploaderName).slice(0, 50) : null;

    const supabase = serviceClient();

    // ── 이벤트 조회 ────────────────────────────────────────────
    const { data: event, error: eventErr } = await supabase
      .from('photo_events')
      .select('id, max_photos, expires_at')
      .eq('event_code', eventCode)
      .single();

    if (eventErr || !event) {
      return NextResponse.json({ error: '유효하지 않은 QR 코드예요.' }, { status: 404 });
    }

    // 만료 체크
    if (event.expires_at && new Date(event.expires_at) < new Date()) {
      return NextResponse.json({ error: '업로드 기간이 종료됐어요.' }, { status: 403 });
    }

    // ── 사진 수 제한 체크 ──────────────────────────────────────
    const { count } = await supabase
      .from('guest_photos')
      .select('id', { count: 'exact', head: true })
      .eq('event_id', event.id);

    const limit = event.max_photos ?? MAX_FREE_PHOTOS;
    if (count >= limit) {
      return NextResponse.json(
        { error: `사진 한도(${limit}장)에 도달했어요. 커플에게 문의해주세요.` },
        { status: 403 }
      );
    }

    // ── Storage 업로드 ─────────────────────────────────────────
    const storagePath = `${event.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
    const buffer      = Buffer.from(await file.arrayBuffer());

    const { error: uploadErr } = await supabase.storage
      .from('guest-photos')
      .upload(storagePath, buffer, {
        contentType: safeContentType,
        upsert: false,
      });

    if (uploadErr) {
      console.error('Storage upload error:', uploadErr);
      return NextResponse.json({ error: '업로드에 실패했어요. 다시 시도해주세요.' }, { status: 500 });
    }

    // ── guest_photos 레코드 삽입 ───────────────────────────────
    const { error: insertErr } = await supabase
      .from('guest_photos')
      .insert({ event_id: event.id, storage_path: storagePath, uploader_name: safeUploaderName });

    if (insertErr) {
      // 롤백: 이미 업로드된 파일 삭제
      await supabase.storage.from('guest-photos').remove([storagePath]);
      console.error('DB insert error:', insertErr);
      return NextResponse.json({ error: '저장에 실패했어요. 다시 시도해주세요.' }, { status: 500 });
    }

    return NextResponse.json({ success: true, remaining: limit - count - 1 });

  } catch (err) {
    console.error('Upload route error:', err);
    return NextResponse.json({ error: '서버 오류가 발생했어요.' }, { status: 500 });
  }
}
