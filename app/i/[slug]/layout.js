import { createClient } from '@supabase/supabase-js';

function anonClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    { auth: { persistSession: false } }
  );
}

export async function generateMetadata({ params }) {
  const { slug } = await params;

  const supabase = anonClient();
  const { data: inv } = await supabase
    .from('invitations')
    .select('groom_name, bride_name, wedding_date, message, venue_name, cover_image_url')
    .eq('slug', slug)
    .single();

  if (!inv) {
    return {
      title: '모바일 청첩장 | Ourday',
      description: '소중한 분들을 결혼식에 초대합니다.',
    };
  }

  const groom = inv.groom_name || '신랑';
  const bride = inv.bride_name || '신부';
  const title = `${groom} ♥ ${bride} 결혼합니다`;

  let description = inv.message?.split('\n')[0] || '';
  if (!description && inv.venue_name) description = `${inv.venue_name}에서 결혼합니다.`;
  if (!description) description = '소중한 분들을 결혼식에 초대합니다.';
  // 150자 제한
  if (description.length > 150) description = description.slice(0, 147) + '...';

  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://ourday-rust.vercel.app';
  const pageUrl = `${baseUrl}/i/${slug}`;

  // 커스텀 커버 사진이 있으면 우선 사용, 없으면 자동 생성 OG 이미지
  const ogImageUrl = inv?.cover_image_url
    ? inv.cover_image_url
    : `${baseUrl}/i/${slug}/opengraph-image`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url: pageUrl,
      type: 'website',
      siteName: 'Ourday',
      locale: 'ko_KR',
      images: [{ url: ogImageUrl, width: 1200, height: 630, alt: title }],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [ogImageUrl],
    },
  };
}

export default function InvitationLayout({ children }) {
  return children;
}
