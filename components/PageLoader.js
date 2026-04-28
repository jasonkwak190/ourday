// 페이지 내부 로딩 상태용 — app/loading.js와 동일한 OD 모노그램 + 펄스
// 글로벌 Suspense fallback과 page-level loading state의 비주얼을 통일.
export default function PageLoader({ dark = false, fullscreen = true }) {
  const inkColor    = dark ? '#FAF8F5' : 'var(--ink)';
  const champagne   = 'var(--champagne)';

  return (
    <div
      style={{
        minHeight: fullscreen ? '100dvh' : 'auto',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 20,
        padding: 24,
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          animation: 'ourday-pulse 1.8s ease-in-out infinite',
        }}
      >
        <span style={{ fontFamily: 'var(--font-serif-en)', fontSize: 48, fontWeight: 500, color: inkColor, lineHeight: 1, opacity: 0.85 }}>O</span>
        <span style={{ width: 5, height: 5, borderRadius: '50%', backgroundColor: champagne, flexShrink: 0 }} />
        <span style={{ fontFamily: 'var(--font-serif-en)', fontSize: 48, fontWeight: 500, color: inkColor, lineHeight: 1, opacity: 0.85 }}>D</span>
      </div>

      <div style={{ display: 'flex', gap: 6 }}>
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            style={{
              width: 6,
              height: 6,
              borderRadius: '50%',
              backgroundColor: champagne,
              display: 'block',
              opacity: 0.4,
              animation: `ourday-bounce 1.2s ${i * 0.2}s ease-in-out infinite`,
            }}
          />
        ))}
      </div>

      <style>{`
        @keyframes ourday-pulse {
          0%, 100% { opacity: 0.85; }
          50% { opacity: 0.45; }
        }
        @keyframes ourday-bounce {
          0%, 80%, 100% { transform: translateY(0); opacity: 0.4; }
          40% { transform: translateY(-6px); opacity: 1; }
        }
      `}</style>
    </div>
  );
}
