import { ImageResponse } from 'next/og';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'edge';

const SIZE = { width: 1200, height: 630 };

/**
 * 청첩장 OG 이미지 fallback 동적 생성.
 *
 * Note: app/i/[slug]/opengraph-image.js (Next.js metadata 파일 컨벤션)은
 * generateMetadata의 openGraph.images를 자동으로 override한다.
 * 사용자가 cover_image_url을 설정해도 file convention이 우선 적용되어
 * 무시되는 문제 발생. → 일반 API route로 분리해 generateMetadata가
 * 명시적으로 URL을 지정하도록 변경.
 */
export async function GET(_request, { params }) {
  const { slug } = await params;

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    { auth: { persistSession: false } }
  );
  const { data: inv } = await supabase
    .from('invitations')
    .select('wedding_date')
    .eq('slug', slug)
    .single();

  let dateLabel = '';
  if (inv?.wedding_date) {
    const d = new Date(inv.wedding_date);
    const months = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'];
    dateLabel = `${months[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
  }

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%', height: '100%',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: 'linear-gradient(135deg, #fff0f3 0%, #fdf6ff 50%, #f0f4ff 100%)',
          position: 'relative', overflow: 'hidden',
        }}
      >
        <div style={{ position: 'absolute', top: -120, right: -120, width: 480, height: 480, borderRadius: '50%', background: 'rgba(212,135,154,0.10)', display: 'flex' }} />
        <div style={{ position: 'absolute', bottom: -80, left: -80, width: 360, height: 360, borderRadius: '50%', background: 'rgba(160,130,220,0.08)', display: 'flex' }} />
        <div style={{ position: 'absolute', top: 60, left: -40, width: 200, height: 200, borderRadius: '50%', background: 'rgba(212,135,154,0.06)', display: 'flex' }} />

        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          background: 'rgba(255,255,255,0.85)',
          borderRadius: 32, padding: '56px 80px',
          boxShadow: '0 16px 64px rgba(180,120,160,0.15)',
        }}>
          <div style={{ display: 'flex', gap: 16, marginBottom: 32 }}>
            {['#f4c2c2','#d4879a','#c9a0dc'].map((c, i) => (
              <div key={i} style={{ width: 10, height: 10, borderRadius: '50%', background: c, display: 'flex' }} />
            ))}
          </div>

          <p style={{
            fontSize: 22, letterSpacing: '0.25em', color: '#c9a0b0',
            margin: '0 0 28px', fontFamily: 'Georgia, serif',
            textTransform: 'uppercase', display: 'flex',
          }}>
            Wedding Invitation
          </p>

          <div style={{
            width: 72, height: 72, borderRadius: '50%',
            background: 'linear-gradient(135deg, #f8d7da, #e8aabb)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            marginBottom: 28,
            boxShadow: '0 4px 24px rgba(212,135,154,0.3)',
          }}>
            <div style={{ fontSize: 36, display: 'flex', color: 'white' }}>♥</div>
          </div>

          {dateLabel ? (
            <p style={{
              fontSize: 32, fontWeight: 700, color: '#5c3d52',
              margin: '0 0 12px', fontFamily: 'Georgia, serif', display: 'flex',
            }}>
              {dateLabel}
            </p>
          ) : (
            <div style={{ height: 44, display: 'flex' }} />
          )}

          <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
            <div style={{ width: 40, height: 1, background: '#e0c8d0', display: 'flex' }} />
            <p style={{ fontSize: 16, color: '#c9a0b0', margin: 0, display: 'flex' }}>Ourday</p>
            <div style={{ width: 40, height: 1, background: '#e0c8d0', display: 'flex' }} />
          </div>
        </div>
      </div>
    ),
    SIZE
  );
}
