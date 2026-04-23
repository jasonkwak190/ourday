export const dynamic = 'force-dynamic';

import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { createRateLimiter, getClientIp } from '@/lib/rate-limit';

const MAX_FREE_PHOTOS = 50;
const MAX_FILE_SIZE  = 10 * 1024 * 1024; // 10 MB

// 허용 확장자 + MIME 타입 화이트리스트
const ALLOWED_EXTENSIONS = new Set(['jpg', 'jpeg', 'png', 'webp']);
const ALLOWED_MIME_TYPES  = new Set(['image/jpeg', 'image/png', 'image/webp']);

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

    // 파일 확장자 + MIME 타입 화이트리스트 검증
    const ext = file.name.split('.').pop()?.toLowerCase() || '';
    if (!ALLOWED_EXTENSIONS.has(ext) || !ALLOWED_MIME_TYPES.has(file.type)) {
      return NextResponse.json({ error: 'jpg, png, webp 파일만 업로드할 수 있어요.' }, { status: 400 });
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: '파일 크기는 10MB 이하여야 해요.' }, { status: 400 });
    }

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
    const filename = `${event.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
    const buffer   = Buffer.from(await file.arrayBuffer());

    const { error: uploadErr } = await supabase.storage
      .from('guest-photos')
      .upload(filename, buffer, {
        contentType: file.type,
        upsert: false,
      });

    if (uploadErr) {
      console.error('Storage upload error:', uploadErr);
      return NextResponse.json({ error: '업로드에 실패했어요. 다시 시도해주세요.' }, { status: 500 });
    }

    // ── guest_photos 레코드 삽입 ───────────────────────────────
    const { error: insertErr } = await supabase
      .from('guest_photos')
      .insert({ event_id: event.id, storage_path: filename, uploader_name: safeUploaderName });

    if (insertErr) {
      // 롤백: 이미 업로드된 파일 삭제
      await supabase.storage.from('guest-photos').remove([filename]);
      console.error('DB insert error:', insertErr);
      return NextResponse.json({ error: '저장에 실패했어요. 다시 시도해주세요.' }, { status: 500 });
    }

    return NextResponse.json({ success: true, remaining: limit - count - 1 });

  } catch (err) {
    console.error('Upload route error:', err);
    return NextResponse.json({ error: '서버 오류가 발생했어요.' }, { status: 500 });
  }
}
