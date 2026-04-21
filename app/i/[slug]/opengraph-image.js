import { ImageResponse } from 'next/og';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'edge';
export const alt = '모바일 청첩장';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default async function Image({ params }) {
  const { slug } = await params;

  // 청첩장 정보 조회 (이름은 og:title 메타태그에 표시 — 이미지에는 생략)
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    { auth: { persistSession: false } }
  );
  const { data: inv } = await supabase
    .from('invitations')
    .select('wedding_date, groom_name, bride_name, cover_image_url')
    .eq('slug', slug)
    .single();

  // 날짜 — 숫자+영문만 사용 (기본 폰트로 안전하게 렌더링)
  let dateLabel = '';
  if (inv?.wedding_date) {
    const d = new Date(inv.wedding_date);
    const months = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'];
    dateLabel = `${months[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
  }

  const coverImageUrl = inv?.cover_image_url || null;

  // 커버 이미지가 있으면 사진 배경 레이아웃
  if (coverImageUrl) {
    return new ImageResponse(
      (
        <div style={{
          width: '100%', height: '100%',
          display: 'flex', alignItems: 'flex-end',
          position: 'relative', overflow: 'hidden',
        }}>
          {/* 배경 사진 */}
          <img
            src={coverImageUrl}
            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
          />
          {/* 어두운 그라디언트 오버레이 */}
          <div style={{
            position: 'absolute', inset: 0,
            background: 'linear-gradient(to bottom, rgba(0,0,0,0.05) 0%, rgba(0,0,0,0.55) 100%)',
            display: 'flex',
          }} />
          {/* 하단 텍스트 */}
          <div style={{
            position: 'relative', width: '100%',
            padding: '40px 64px',
            display: 'flex', flexDirection: 'column', gap: 10,
          }}>
            <p style={{
              fontSize: 20, letterSpacing: '0.2em', color: 'rgba(255,255,255,0.75)',
              margin: 0, display: 'flex', fontFamily: 'Georgia, serif',
              textTransform: 'uppercase',
            }}>
              Wedding Invitation
            </p>
            {dateLabel && (
              <p style={{
                fontSize: 36, fontWeight: 700, color: 'white',
                margin: 0, display: 'flex', fontFamily: 'Georgia, serif',
              }}>
                {dateLabel}
              </p>
            )}
            <p style={{ fontSize: 18, color: 'rgba(255,255,255,0.6)', margin: 0, display: 'flex' }}>
              Ourday
            </p>
          </div>
        </div>
      ),
      { ...size }
    );
  }

  // 커버 이미지 없으면 기존 그라디언트 디자인
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
        {/* 배경 장식 원들 */}
        <div style={{ position: 'absolute', top: -120, right: -120, width: 480, height: 480, borderRadius: '50%', background: 'rgba(212,135,154,0.10)', display: 'flex' }} />
        <div style={{ position: 'absolute', bottom: -80, left: -80, width: 360, height: 360, borderRadius: '50%', background: 'rgba(160,130,220,0.08)', display: 'flex' }} />
        <div style={{ position: 'absolute', top: 60, left: -40, width: 200, height: 200, borderRadius: '50%', background: 'rgba(212,135,154,0.06)', display: 'flex' }} />

        {/* 중앙 카드 */}
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          background: 'rgba(255,255,255,0.85)',
          borderRadius: 32, padding: '56px 80px',
          boxShadow: '0 16px 64px rgba(180,120,160,0.15)',
        }}>
          {/* 상단 장식 */}
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
    { ...size }
  );
}
