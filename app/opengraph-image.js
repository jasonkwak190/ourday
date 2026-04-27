import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const alt = 'Ourday · 우리의 날';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function OGImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#1A1613',
          position: 'relative',
        }}
      >
        {/* 배경 코너 장식선 */}
        <div style={{
          position: 'absolute', top: 32, left: 32,
          width: 60, height: 60,
          borderTop: '1px solid rgba(201,169,110,0.5)',
          borderLeft: '1px solid rgba(201,169,110,0.5)',
          display: 'flex',
        }} />
        <div style={{
          position: 'absolute', top: 32, right: 32,
          width: 60, height: 60,
          borderTop: '1px solid rgba(201,169,110,0.5)',
          borderRight: '1px solid rgba(201,169,110,0.5)',
          display: 'flex',
        }} />
        <div style={{
          position: 'absolute', bottom: 32, left: 32,
          width: 60, height: 60,
          borderBottom: '1px solid rgba(201,169,110,0.5)',
          borderLeft: '1px solid rgba(201,169,110,0.5)',
          display: 'flex',
        }} />
        <div style={{
          position: 'absolute', bottom: 32, right: 32,
          width: 60, height: 60,
          borderBottom: '1px solid rgba(201,169,110,0.5)',
          borderRight: '1px solid rgba(201,169,110,0.5)',
          display: 'flex',
        }} />

        {/* 모노그램 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 40 }}>
          <span style={{ fontSize: 120, fontWeight: 600, color: '#FAF8F5', lineHeight: 1 }}>O</span>
          <div style={{
            width: 10, height: 10, borderRadius: '50%',
            backgroundColor: '#C9A96E',
            marginTop: 8,
            display: 'flex',
          }} />
          <span style={{ fontSize: 120, fontWeight: 600, color: '#FAF8F5', lineHeight: 1 }}>D</span>
        </div>

        {/* 구분선 + 다이아몬드 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 32 }}>
          <div style={{ width: 80, height: 1, backgroundColor: 'rgba(201,169,110,0.6)', display: 'flex' }} />
          <div style={{
            width: 6, height: 6,
            backgroundColor: '#C9A96E',
            transform: 'rotate(45deg)',
            display: 'flex',
          }} />
          <div style={{ width: 80, height: 1, backgroundColor: 'rgba(201,169,110,0.6)', display: 'flex' }} />
        </div>

        {/* 타이틀 */}
        <p style={{
          fontSize: 28,
          fontWeight: 400,
          color: '#C9A96E',
          letterSpacing: '0.12em',
          marginBottom: 12,
          display: 'flex',
        }}>
          OURDAY
        </p>
        <p style={{
          fontSize: 18,
          color: 'rgba(250,248,245,0.6)',
          letterSpacing: '0.04em',
          display: 'flex',
        }}>
          커플이 함께하는 결혼 준비
        </p>
      </div>
    ),
    { ...size }
  );
}
