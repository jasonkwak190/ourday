import { ImageResponse } from 'next/og';

export const runtime = 'edge';

export async function GET(_, { params }) {
  const { size: sizeParam } = await params;
  const size = sizeParam === '512' ? 512 : 192;
  const radius = Math.round(size * 0.22);
  const fontSize = Math.round(size * 0.52);

  return new ImageResponse(
    (
      <div style={{
        width: '100%', height: '100%',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'linear-gradient(135deg, #3182f6 0%, #6366f1 100%)',
        borderRadius: radius,
      }}>
        <div style={{
          color: 'white',
          fontSize,
          display: 'flex',
          lineHeight: 1,
          marginTop: '4%',
        }}>
          ♥
        </div>
      </div>
    ),
    { width: size, height: size }
  );
}
