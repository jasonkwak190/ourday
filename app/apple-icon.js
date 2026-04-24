import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const size = { width: 180, height: 180 };
export const contentType = 'image/png';

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div style={{
        width: '100%', height: '100%',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: '#1A1613',
      }}>
        {/* 내부 샴페인 보더 */}
        <div style={{
          position: 'absolute', top: 7, left: 7, right: 7, bottom: 7,
          border: '1px solid rgba(201,169,110,0.35)',
          display: 'flex',
        }} />
        {/* O·D 모노그램 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <span style={{ color: '#FAF8F5', fontSize: 86, fontFamily: 'serif', fontWeight: 700, lineHeight: 1, letterSpacing: '-2px' }}>O</span>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 0, marginBottom: 6 }}>
            <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#C9A96E', display: 'flex' }} />
          </div>
          <span style={{ color: '#FAF8F5', fontSize: 86, fontFamily: 'serif', fontWeight: 700, lineHeight: 1, letterSpacing: '-2px' }}>D</span>
        </div>
      </div>
    ),
    { ...size }
  );
}
