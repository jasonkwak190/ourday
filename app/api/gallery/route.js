export const dynamic = 'force-dynamic';

// 커플 인증 후 자신의 photo_event + signed URLs 반환
import { createClient } from '@supabase/supabase-js';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { NextResponse } from 'next/server';

function serviceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { persistSession: false } }
  );
}

// GET /api/gallery  — 이벤트 생성(or 조회) + 사진 목록 + signed URLs 한 번에 처리
// GET /api/gallery?event_id=xxx&since=ISO  — since 이후 추가된 사진만 (증분 갱신)
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const explicitEventId = searchParams.get('event_id');
    const since           = searchParams.get('since'); // ISO timestamp, 증분 갱신용

    // ── 인증 확인 ──────────────────────────────────────────────
    const authClient = await createSupabaseServerClient();
    const { data: { session } } = await authClient.auth.getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { data: userData } = await authClient
      .from('users').select('couple_id').eq('id', session.user.id).single();
    if (!userData?.couple_id) return NextResponse.json({ error: 'No couple' }, { status: 403 });

    const supabase = serviceClient();

    // ── 이벤트 조회 or 생성 ────────────────────────────────────
    let event;
    if (explicitEventId) {
      const { data } = await supabase
        .from('photo_events')
        .select('id, couple_id, event_code, title, max_photos, expires_at, created_at')
        .eq('id', explicitEventId)
        .single();
      if (!data || data.couple_id !== userData.couple_id)
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      event = data;
    } else {
      // couple_id로 기존 이벤트 조회 — 없으면 생성
      const { data: existing } = await supabase
        .from('photo_events')
        .select('id, couple_id, event_code, title, max_photos, expires_at, created_at')
        .eq('couple_id', userData.couple_id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (existing) {
        event = existing;
      } else {
        const { data: newEvent, error } = await supabase
          .from('photo_events')
          .insert({ couple_id: userData.couple_id, title: '우리 결혼식 사진', max_photos: 50 })
          .select()
          .single();
        if (error) throw error;
        event = newEvent;
      }
    }

    // ── 사진 목록 조회 (since 있으면 증분) ─────────────────────
    let photosQuery = supabase
      .from('guest_photos')
      .select('id, storage_path, uploader_name, created_at')
      .eq('event_id', event.id)
      .order('created_at', { ascending: false });
    if (since) photosQuery = photosQuery.gt('created_at', since);

    const { data: photos } = await photosQuery;

    // ── Signed URL 발급 (55분 유효 — 1시간 미만으로 여유) ──────
    const paths = (photos || []).map(p => p.storage_path);
    let signedUrls = {};
    if (paths.length > 0) {
      const { data: urls } = await supabase.storage
        .from('guest-photos')
        .createSignedUrls(paths, 3300); // 55분
      (urls || []).forEach(u => { signedUrls[u.path] = u.signedUrl; });
    }

    const photosWithUrls = (photos || []).map(p => ({
      ...p,
      url: signedUrls[p.storage_path] || null,
    }));

    return NextResponse.json({
      event,
      photos: photosWithUrls,
      fetchedAt: new Date().toISOString(),
    });
  } catch (err) {
    console.error('Gallery API error:', err);
    return NextResponse.json({ error: '서버 오류' }, { status: 500 });
  }
}

// DELETE /api/gallery?photo_id=xxx  — 사진 삭제 (커플만)
export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url);
    const photoId = searchParams.get('photo_id');
    if (!photoId) return NextResponse.json({ error: 'photo_id required' }, { status: 400 });

    const authClient = await createSupabaseServerClient();
    const { data: { session } } = await authClient.auth.getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { data: userData } = await authClient
      .from('users').select('couple_id').eq('id', session.user.id).single();
    if (!userData?.couple_id) return NextResponse.json({ error: 'No couple' }, { status: 403 });

    const supabase = serviceClient();

    // 소유권 확인 후 삭제
    const { data: photo } = await supabase
      .from('guest_photos')
      .select('id, storage_path, event_id')
      .eq('id', photoId)
      .single();

    if (!photo) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const { data: evt } = await supabase
      .from('photo_events').select('couple_id').eq('id', photo.event_id).single();

    if (!evt || evt.couple_id !== userData.couple_id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    await supabase.storage.from('guest-photos').remove([photo.storage_path]);
    await supabase.from('guest_photos').delete().eq('id', photoId);

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Gallery DELETE error:', err);
    return NextResponse.json({ error: '서버 오류' }, { status: 500 });
  }
}

// POST /api/gallery  — 커플의 photo_event 생성 (or 조회)
export async function POST(request) {
  try {
    const authClient = await createSupabaseServerClient();
    const { data: { session } } = await authClient.auth.getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { data: userData } = await authClient
      .from('users').select('couple_id').eq('id', session.user.id).single();
    if (!userData?.couple_id) return NextResponse.json({ error: 'No couple' }, { status: 403 });

    const body = await request.json().catch(() => ({}));
    const title = body.title || '우리 결혼식 사진';

    const supabase = serviceClient();

    // 이미 있으면 반환, 없으면 생성
    const { data: existing } = await supabase
      .from('photo_events')
      .select('*')
      .eq('couple_id', userData.couple_id)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (existing) return NextResponse.json({ event: existing });

    const { data: newEvent, error } = await supabase
      .from('photo_events')
      .insert({ couple_id: userData.couple_id, title, max_photos: 50 })
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ event: newEvent });
  } catch (err) {
    console.error('Gallery POST error:', err);
    return NextResponse.json({ error: '서버 오류가 발생했어요.' }, { status: 500 });
  }
}
