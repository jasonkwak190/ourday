export const dynamic = 'force-dynamic';

// 슬라이드쇼용 — event_code 기반, 인증 불필요 (커플이 공유한 링크)
import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { createRateLimiter, getClientIp } from '@/lib/rate-limit';

// IP당 1분에 최대 60건 (슬라이드쇼 폴링 고려, 브루트포스 방어)
const liveLimiter = createRateLimiter({ windowMs: 60_000, max: 60 });

function serviceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { persistSession: false } }
  );
}

// GET /api/live?code=xxxxxxxx
export async function GET(request) {
  try {
    const ip = getClientIp(request);
    if (!liveLimiter(ip)) {
      return NextResponse.json({ error: '요청이 너무 많아요.' }, { status: 429 });
    }

    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');
    if (!code) return NextResponse.json({ error: 'code required' }, { status: 400 });

    const supabase = serviceClient();

    const { data: event } = await supabase
      .from('photo_events')
      .select('id, title, max_photos')
      .eq('event_code', code)
      .single();

    if (!event) return NextResponse.json({ error: '이벤트를 찾을 수 없어요.' }, { status: 404 });

    const { data: photos } = await supabase
      .from('guest_photos')
      .select('id, storage_path, uploader_name, created_at')
      .eq('event_id', event.id)
      .order('created_at', { ascending: false });

    const paths = (photos || []).map(p => p.storage_path);
    let signedUrls = {};

    if (paths.length > 0) {
      const { data: urls } = await supabase.storage
        .from('guest-photos')
        .createSignedUrls(paths, 3600);
      (urls || []).forEach(u => { signedUrls[u.path] = u.signedUrl; });
    }

    const photosWithUrls = (photos || []).map(p => ({
      ...p,
      url: signedUrls[p.storage_path] || null,
    }));

    return NextResponse.json({ event, photos: photosWithUrls });
  } catch (err) {
    console.error('Live API error:', err);
    return NextResponse.json({ error: '서버 오류' }, { status: 500 });
  }
}
