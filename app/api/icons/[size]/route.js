export const dynamic = 'force-dynamic';

import { ImageResponse } from 'next/og';

export const runtime = 'edge';

export async function GET(_, { params }) {
  const { size: sizeParam } = await params;
  const size = sizeParam === '512' ? 512 : 192;
  const dotSize = Math.round(size * 0.045);
  const fontSize = Math.round(size * 0.46);
  const borderInset = Math.round(size * 0.04);

  return new ImageResponse(
    (
      <div style={{
        width: '100%', height: '100%',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: '#1A1613',
        position: 'relative',
      }}>
        {/* 내부 샴페인 보더 */}
        <div style={{
          position: 'absolute',
          top: borderInset, left: borderInset,
          right: borderInset, bottom: borderInset,
          border: '1px solid rgba(201,169,110,0.35)',
          display: 'flex',
        }} />
        {/* O·D 모노그램 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: Math.round(size * 0.02) }}>
          <span style={{
            color: '#FAF8F5', fontSize, fontFamily: 'serif', fontWeight: 700,
            lineHeight: 1, letterSpacing: '-0.04em',
          }}>O</span>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', paddingBottom: Math.round(size * 0.04) }}>
            <span style={{ width: dotSize, height: dotSize, borderRadius: '50%', background: '#C9A96E', display: 'flex' }} />
          </div>
          <span style={{
            color: '#FAF8F5', fontSize, fontFamily: 'serif', fontWeight: 700,
            lineHeight: 1, letterSpacing: '-0.04em',
          }}>D</span>
        </div>
      </div>
    ),
    { width: size, height: size }
  );
}
