'use client';
import { useState, useMemo } from 'react';
import { Calendar, ChevronDown } from 'lucide-react';

/**
 * 결제 캘린더 — vendors의 balance_due를 월별 그룹핑해서 입금 예정 일정 시각화
 *
 * Props:
 *  vendors: Array<{ id, name, balance, balance_due, contract_status, type }>
 *
 * 디자인:
 *  - 다음 6개월 (현재 월 + 5개월) 카드 형식
 *  - 각 월 헤더: 월 + 해당 월 입금 합계
 *  - 입금 항목: D-day 뱃지 + 날짜 + 업체명 + 금액
 *  - contract_status === 'done'은 표시 안 함 (이미 완납)
 *  - 빈 월은 "예정된 입금 없음"
 *  - 펼침/접힘 (기본 펼침)
 */
const TYPE_COLOR = {
  hall: '#B89968', studio: '#B57A7A', dress: '#945E5E',
  makeup: '#B8914A', hanbok: '#7A8B6B', food: '#9C4A3A',
  flower: '#CDB388', music: '#6E6459', travel: '#3A332E',
  other: '#A79D90',
};

export default function PaymentCalendar({ vendors }) {
  const [expanded, setExpanded] = useState(true);

  const { monthGroups, totalUpcoming } = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const sixMonthsLater = new Date(today.getFullYear(), today.getMonth() + 6, 1);

    // 잔금 있고 + 마감일 있고 + 미완납 + 미래 6개월 이내
    const upcoming = (vendors || [])
      .filter(v =>
        v.balance && v.balance > 0 &&
        v.balance_due &&
        v.contract_status !== 'done'
      )
      .map(v => ({
        ...v,
        dueDate: new Date(v.balance_due),
      }))
      .filter(v => v.dueDate < sixMonthsLater)
      .sort((a, b) => a.dueDate - b.dueDate);

    // 월별 그룹핑 (현재 월 포함 6개월)
    const groups = [];
    for (let i = 0; i < 6; i++) {
      const monthStart = new Date(today.getFullYear(), today.getMonth() + i, 1);
      const monthEnd = new Date(today.getFullYear(), today.getMonth() + i + 1, 1);
      const items = upcoming.filter(v => v.dueDate >= monthStart && v.dueDate < monthEnd);
      const total = items.reduce((s, v) => s + (v.balance || 0), 0);
      groups.push({
        year: monthStart.getFullYear(),
        month: monthStart.getMonth() + 1, // 1-12
        isCurrent: i === 0,
        items,
        total,
      });
    }

    const totalUpcoming = groups.reduce((s, g) => s + g.total, 0);
    return { monthGroups: groups, totalUpcoming };
  }, [vendors]);

  // 입금 예정 0건이면 표시 안 함
  if (totalUpcoming === 0) return null;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return (
    <div className="card mb-4" style={{ padding: 0 }}>
      {/* 헤더 */}
      <button
        onClick={() => setExpanded(v => !v)}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '14px 18px',
          background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Calendar size={16} color="var(--champagne)" strokeWidth={2.2} />
          <div>
            <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--ink)', margin: 0 }}>
              결제 캘린더
            </p>
            <p style={{ fontSize: 11, color: 'var(--ink-3)', margin: '2px 0 0' }}>
              앞으로 6개월 입금 예정 <strong className="tabular-nums" style={{ color: 'var(--ink-2)' }}>
                {totalUpcoming.toLocaleString()}만원
              </strong>
            </p>
          </div>
        </div>
        <ChevronDown
          size={16}
          color="var(--ink-3)"
          style={{
            transition: 'transform 0.2s',
            transform: expanded ? 'rotate(0)' : 'rotate(-90deg)',
          }}
        />
      </button>

      {/* 월별 카드 리스트 */}
      {expanded && (
        <div style={{ borderTop: '1px solid var(--rule)' }}>
          {monthGroups.map((g) => (
            <div
              key={`${g.year}-${g.month}`}
              style={{
                padding: '12px 18px',
                borderBottom: '1px solid var(--rule)',
              }}
            >
              {/* 월 헤더 */}
              <div style={{
                display: 'flex', alignItems: 'baseline', justifyContent: 'space-between',
                marginBottom: g.items.length > 0 ? 8 : 0,
              }}>
                <p style={{
                  fontSize: 13, fontWeight: 700,
                  color: g.isCurrent ? 'var(--champagne-2)' : 'var(--ink-2)',
                  margin: 0,
                  fontFamily: 'var(--font-serif-en)',
                }}>
                  {g.month}월{g.isCurrent ? ' · 이번 달' : ''}
                </p>
                {g.total > 0 ? (
                  <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink-2)', margin: 0 }}
                    className="tabular-nums">
                    {g.total.toLocaleString()}만원
                  </p>
                ) : (
                  <p style={{ fontSize: 11, color: 'var(--ink-4)', margin: 0 }}>
                    예정 없음
                  </p>
                )}
              </div>

              {/* 입금 항목들 */}
              {g.items.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {g.items.map((v) => {
                    const dDay = Math.ceil((v.dueDate - today) / (1000 * 60 * 60 * 24));
                    const isUrgent = dDay <= 7 && dDay >= 0;
                    const isOverdue = dDay < 0;
                    const dayStr = `${v.dueDate.getMonth() + 1}/${v.dueDate.getDate()}`;
                    const ddStr = isOverdue
                      ? `${Math.abs(dDay)}일 지남`
                      : dDay === 0 ? '오늘'
                      : `D-${dDay}`;
                    const color = TYPE_COLOR[v.type] || TYPE_COLOR.other;

                    return (
                      <div
                        key={v.id}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 10,
                          padding: '8px 10px',
                          borderRadius: 8,
                          backgroundColor: isOverdue
                            ? 'rgba(255,59,48,0.06)'
                            : isUrgent
                              ? 'rgba(245,166,35,0.08)'
                              : 'var(--paper)',
                          border: `1px solid ${
                            isOverdue ? 'rgba(255,59,48,0.2)' :
                            isUrgent ? 'rgba(245,166,35,0.2)' :
                            'var(--rule)'
                          }`,
                        }}
                      >
                        {/* 종류 컬러 바 */}
                        <span style={{
                          width: 4, alignSelf: 'stretch', borderRadius: 99,
                          backgroundColor: color, flexShrink: 0,
                        }} />
                        {/* D-day 뱃지 */}
                        <span style={{
                          fontSize: 10, fontWeight: 700,
                          padding: '2px 6px', borderRadius: 6,
                          backgroundColor: isOverdue ? 'var(--clay)' : isUrgent ? 'var(--ochre)' : 'var(--ivory-2)',
                          color: isOverdue || isUrgent ? 'white' : 'var(--ink-3)',
                          flexShrink: 0,
                          minWidth: 50, textAlign: 'center',
                        }}>
                          {ddStr}
                        </span>
                        {/* 날짜 */}
                        <span style={{
                          fontSize: 11, color: 'var(--ink-3)', flexShrink: 0,
                          fontFamily: 'var(--font-serif-en)',
                        }}>
                          {dayStr}
                        </span>
                        {/* 업체명 */}
                        <span style={{
                          fontSize: 13, fontWeight: 500, color: 'var(--ink)',
                          flex: 1, minWidth: 0,
                          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                        }}>
                          {v.name}
                        </span>
                        {/* 금액 */}
                        <span style={{
                          fontSize: 12, fontWeight: 700, color: 'var(--ink)',
                          flexShrink: 0,
                        }} className="tabular-nums">
                          {v.balance.toLocaleString()}만원
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
