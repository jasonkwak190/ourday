'use client';

/**
 * EmptyState — 빈 목록/데이터 없을 때 표시하는 공통 컴포넌트
 *
 * Props:
 *  icon       — lucide-react 아이콘 컴포넌트 (선택, 기본값 없음)
 *  emoji      — 이모지 문자열 (icon 없을 때 대체)
 *  title      — 굵은 제목 텍스트 (필수)
 *  description— 보조 설명 (선택)
 *  action     — { label: string, onClick: fn } CTA 버튼 (선택)
 *  compact    — true면 작은 버전 (카드 안 인라인용)
 */
export default function EmptyState({ icon: Icon, emoji, title, description, action, compact = false }) {
  return (
    <div
      className={`flex flex-col items-center justify-center text-center ${
        compact ? 'py-8 px-4' : 'py-14 px-6'
      }`}
    >
      {/* 아이콘 영역 */}
      <div
        className="flex items-center justify-center mb-4 rounded-2xl"
        style={{
          width: compact ? 52 : 64,
          height: compact ? 52 : 64,
          background: 'var(--toss-bg-secondary)',
        }}
      >
        {Icon ? (
          <Icon
            size={compact ? 24 : 30}
            strokeWidth={1.8}
            style={{ color: 'var(--toss-text-tertiary)' }}
          />
        ) : (
          <span style={{ fontSize: compact ? 24 : 30, color: 'var(--toss-text-tertiary)' }}>{emoji || '—'}</span>
        )}
      </div>

      {/* 텍스트 */}
      <p
        className="font-semibold mb-1"
        style={{
          fontSize: compact ? 15 : 16,
          color: 'var(--toss-text-primary)',
          maxWidth: 220,
          wordBreak: 'keep-all',
        }}
      >
        {title}
      </p>
      {description && (
        <p
          className="leading-relaxed"
          style={{
            fontSize: compact ? 13 : 14,
            color: 'var(--toss-text-tertiary)',
            maxWidth: 220,
            wordBreak: 'keep-all',
          }}
        >
          {description}
        </p>
      )}

      {/* CTA 버튼 */}
      {action && (
        <button
          onClick={action.onClick}
          className="btn-rose mt-5"
          style={{ paddingLeft: 24, paddingRight: 24, height: 44, fontSize: 14 }}
        >
          {action.label}
        </button>
      )}
    </div>
  );
}
