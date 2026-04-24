import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const size = { width: 32, height: 32 };
export const contentType = 'image/png';

export default function Icon() {
  return new ImageResponse(
    (
      <div style={{
        width: '100%', height: '100%',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: '#1A1613',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <span style={{ color: '#FAF8F5', fontSize: 17, fontFamily: 'serif', fontWeight: 700, lineHeight: 1 }}>O</span>
          <span style={{ width: 3, height: 3, borderRadius: '50%', background: '#C9A96E', marginBottom: 2, flexShrink: 0 }} />
          <span style={{ color: '#FAF8F5', fontSize: 17, fontFamily: 'serif', fontWeight: 700, lineHeight: 1 }}>D</span>
        </div>
      </div>
    ),
    { ...size }
  );
}
