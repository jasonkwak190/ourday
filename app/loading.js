export default function Loading() {
  return (
    <div
      style={{
        minHeight: '100dvh',
        backgroundColor: 'var(--ivory)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 20,
      }}
    >
      {/* 모노그램 펄스 */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          animation: 'pulse 1.8s ease-in-out infinite',
        }}
      >
        <span style={{
          fontFamily: 'var(--font-serif-en)',
          fontSize: 48,
          fontWeight: 500,
          color: 'var(--ink)',
          lineHeight: 1,
          opacity: 0.8,
        }}>O</span>
        <span style={{
          width: 5,
          height: 5,
          borderRadius: '50%',
          backgroundColor: 'var(--champagne)',
          flexShrink: 0,
        }} />
        <span style={{
          fontFamily: 'var(--font-serif-en)',
          fontSize: 48,
          fontWeight: 500,
          color: 'var(--ink)',
          lineHeight: 1,
          opacity: 0.8,
        }}>D</span>
      </div>

      {/* 챔페인 도트 로더 */}
      <div style={{ display: 'flex', gap: 6 }}>
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            style={{
              width: 6,
              height: 6,
              borderRadius: '50%',
              backgroundColor: 'var(--champagne)',
              display: 'block',
              opacity: 0.4,
              animationName: 'bounce',
              animationDuration: '1.2s',
              animationDelay: `${i * 0.2}s`,
              animationTimingFunction: 'ease-in-out',
              animationIterationCount: 'infinite',
            }}
          />
        ))}
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 0.8; }
          50% { opacity: 0.4; }
        }
        @keyframes bounce {
          0%, 80%, 100% { transform: translateY(0); opacity: 0.4; }
          40% { transform: translateY(-6px); opacity: 1; }
        }
      `}</style>
    </div>
  );
}
