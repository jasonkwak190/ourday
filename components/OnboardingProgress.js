// 온보딩 3단계 스텝 표시기 — Server Component (no state)
const STEPS = [
  { label: '프로필' },
  { label: '커플 연동' },
  { label: '결혼 정보' },
];

/**
 * @param {number} current  1 | 2 | 3  — 현재 활성 단계
 */
export default function OnboardingProgress({ current }) {
  return (
    <div className="flex items-center justify-center gap-0 mb-8">
      {STEPS.map(({ label }, i) => {
        const step = i + 1;
        const done   = step < current;
        const active = step === current;

        return (
          <div key={step} className="flex items-center">
            {/* 스텝 원 + 라벨 */}
            <div className="flex flex-col items-center" style={{ minWidth: 64 }}>
              <div
                className="flex items-center justify-center text-xs font-bold mb-1"
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: '50%',
                  backgroundColor: done
                    ? 'var(--toss-blue)'
                    : active
                      ? 'var(--toss-blue)'
                      : 'var(--toss-border)',
                  color: done || active ? 'white' : 'var(--toss-text-tertiary)',
                  transition: 'background-color 0.2s',
                }}
              >
                {done ? '✓' : step}
              </div>
              <span
                className="text-xs font-medium"
                style={{
                  color: active
                    ? 'var(--toss-blue)'
                    : done
                      ? 'var(--toss-text-secondary)'
                      : 'var(--toss-text-tertiary)',
                }}
              >
                {label}
              </span>
            </div>

            {/* 연결선 — 마지막 스텝엔 없음 */}
            {i < STEPS.length - 1 && (
              <div
                style={{
                  width: 40,
                  height: 2,
                  marginBottom: 16,
                  backgroundColor: done ? 'var(--toss-blue)' : 'var(--toss-border)',
                  transition: 'background-color 0.2s',
                }}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
