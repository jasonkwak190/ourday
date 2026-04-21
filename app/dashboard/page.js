'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import BottomNav from '@/components/BottomNav';
import { AlertCircle, ChevronRight, CalendarDays, Wallet, MessageSquare, Users } from 'lucide-react';

function calcDday(dateStr) {
  if (!dateStr) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(dateStr);
  target.setHours(0, 0, 0, 0);
  return Math.ceil((target - today) / (1000 * 60 * 60 * 24));
}

function getMonthsDiff(weddingDate) {
  const today = new Date();
  const wedding = new Date(weddingDate);
  return (wedding - today) / (1000 * 60 * 60 * 24 * 30);
}

// 이번 주 이내 마감 or 이미 지난 항목 (미완료)
function getUrgentItems(items, weddingDate) {
  if (!weddingDate || !items.length) return [];
  const diff = getMonthsDiff(weddingDate);
  return items.filter(item =>
    !item.is_done && item.due_months_before >= diff - 0.25
  );
}

export default function DashboardPage() {
  const router = useRouter();
  const [loading,     setLoading]     = useState(true);
  const [couple,      setCouple]      = useState(null);
  const [items,       setItems]       = useState([]);
  const [decisions,   setDecisions]   = useState([]);
  const [budgetItems, setBudgetItems] = useState([]);
  const [vendors,     setVendors]     = useState([]);
  const [error,       setError]       = useState('');

  useEffect(() => {
    const load = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.push('/'); return; }

      const { data: user } = await supabase
        .from('users')
        .select('couple_id')
        .eq('id', session.user.id)
        .single();

      if (!user?.couple_id) { setLoading(false); return; }

      const cId = user.couple_id;
      const [coupleRes, itemsRes, decisionsRes, budgetRes, vendorsRes] = await Promise.all([
        supabase.from('couples').select('*').eq('id', cId).single(),
        supabase.from('checklist_items').select('*').eq('couple_id', cId),
        supabase.from('decisions').select('id, title, status').eq('couple_id', cId),
        supabase.from('budget_items').select('estimated_amount, actual_amount, category, name').eq('couple_id', cId),
        supabase.from('vendors').select('id, name, type, balance, balance_due, contract_status').eq('couple_id', cId),
      ]);

      if (coupleRes.error) { setError('데이터를 불러오지 못했어요.'); }
      else {
        setCouple(coupleRes.data);
        setItems(itemsRes.data || []);
        setDecisions(decisionsRes.data || []);
        setBudgetItems(budgetRes.data || []);
        setVendors(vendorsRes.data || []);
      }
      setLoading(false);
    };
    load();
  }, [router]);

  async function toggleItem(id, current) {
    setItems(prev => prev.map(it => it.id === id ? { ...it, is_done: !current } : it));
    await supabase.from('checklist_items').update({ is_done: !current }).eq('id', id);
  }

  // ─── 로딩 ───
  if (loading) {
    return (
      <div className="page-wrapper flex items-center justify-center">
        <div className="text-center" style={{ color: 'var(--toss-text-tertiary)' }}>
          <div className="text-3xl mb-2">💍</div>
          <p className="text-sm">불러오는 중...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="page-wrapper flex items-center justify-center">
        <p className="text-sm" style={{ color: 'var(--toss-red)' }}>{error}</p>
      </div>
    );
  }

  // ─── 통계 계산 ───
  const dday         = calcDday(couple?.wedding_date);
  const urgentItems  = getUrgentItems(items, couple?.wedding_date);
  const totalDone    = items.filter(i => i.is_done).length;
  const totalCount   = items.length;
  const progress     = totalCount > 0 ? Math.round((totalDone / totalCount) * 100) : 0;

  // 예산
  const totalBudget  = couple?.total_budget || 0;
  const totalEst     = budgetItems.reduce((s, b) => s + (b.estimated_amount || 0), 0);
  const totalSpent   = budgetItems.reduce((s, b) => s + (b.actual_amount || 0), 0);
  const budgetPct    = totalBudget > 0 ? Math.round((totalSpent / totalBudget) * 100) : 0;
  const budgetRemain = totalBudget - totalSpent;

  // 의사결정
  const undecided    = decisions.filter(d => d.status !== 'decided');
  const discussing   = decisions.filter(d => d.status === 'discussing');

  // 업체 잔금 D-day (잔금 남아있는 업체만, done 제외)
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const pendingBalances = vendors
    .filter(v => v.balance && v.balance > 0 && v.contract_status !== 'done' && v.balance_due)
    .map(v => ({
      ...v,
      dday: Math.ceil((new Date(v.balance_due) - today) / (1000 * 60 * 60 * 24)),
    }))
    .sort((a, b) => a.dday - b.dday)
    .slice(0, 3);

  const weddingDateFormatted = couple?.wedding_date
    ? new Date(couple.wedding_date).toLocaleDateString('ko-KR', {
        year: 'numeric', month: 'long', day: 'numeric',
      })
    : null;

  // ─── 커플 미연동 상태 ───
  if (!couple) {
    return (
      <div className="page-wrapper flex flex-col">
        <div className="flex justify-end mb-2">
          <button
            onClick={() => router.push('/settings')}
            className="text-xl"
            style={{ background: 'none', border: 'none', cursor: 'pointer' }}
            aria-label="설정"
          >⚙️</button>
        </div>
        <div className="text-center mt-12 mb-8">
          <div className="text-5xl mb-4">💍</div>
          <h1 className="text-xl font-bold mb-2" style={{ color: 'var(--toss-text-primary)' }}>
            결혼 준비를 시작해볼까요?
          </h1>
          <p className="text-sm" style={{ color: 'var(--toss-text-secondary)' }}>
            정보를 설정하면 더 많은 기능을 쓸 수 있어요
          </p>
        </div>
        <div className="flex flex-col gap-3">
          <button className="btn-rose w-full" onClick={() => router.push('/setup')}>
            결혼 정보 설정하기
          </button>
          <button className="btn-outline w-full" onClick={() => router.push('/connect')}>
            커플 연동하기 💑
          </button>
        </div>
        <BottomNav active="home" />
      </div>
    );
  }

  return (
    <div className="page-wrapper">
      {/* 상단 설정 버튼 */}
      <div className="flex justify-end mb-2">
        <button
          onClick={() => router.push('/settings')}
          className="text-xl"
          style={{ background: 'none', border: 'none', cursor: 'pointer' }}
          aria-label="설정"
        >⚙️</button>
      </div>

      {/* D-day 헤더 */}
      <div className="text-center mb-6">
        <p className="text-sm mb-1" style={{ color: 'var(--toss-text-tertiary)' }}>
          {weddingDateFormatted || '결혼 날짜를 설정해주세요'}
        </p>
        {dday !== null && (
          <>
            <span
              className="text-xs font-semibold px-3 py-1 rounded-full"
              style={{ backgroundColor: 'var(--toss-blue-light)', color: 'var(--toss-blue)' }}
            >
              {dday > 0 ? `D-${dday}` : dday === 0 ? 'D-Day' : `D+${Math.abs(dday)}`}
            </span>
            <p
              className="text-7xl font-extrabold mt-2 leading-none tracking-tight tabular-nums"
              style={{ color: 'var(--toss-blue)' }}
            >
              {dday > 0 ? dday : dday === 0 ? '🎊' : Math.abs(dday)}
            </p>
            <p className="text-sm mt-1" style={{ color: 'var(--toss-text-secondary)' }}>
              {dday > 0 ? '일 남았어요' : dday === 0 ? '오늘이에요!' : '일 지났어요'}
            </p>
          </>
        )}
      </div>

      {/* 스탯 카드 3개 */}
      <div className="grid grid-cols-3 gap-2 mb-5">
        <button
          className="card text-center"
          style={{ padding: '16px 8px', cursor: 'pointer' }}
          onClick={() => router.push('/timeline')}
        >
          <p className="text-2xl font-bold tabular-nums" style={{ color: 'var(--toss-text-primary)' }}>
            {progress}
            <span className="text-base font-normal" style={{ color: 'var(--toss-text-tertiary)' }}>%</span>
          </p>
          <p className="text-xs mt-1" style={{ color: 'var(--toss-text-tertiary)' }}>일정 완료</p>
        </button>
        <button
          className="card text-center"
          style={{ padding: '16px 8px', cursor: 'pointer' }}
          onClick={() => router.push('/budget')}
        >
          <p
            className="text-2xl font-bold tabular-nums"
            style={{ color: budgetPct > 100 ? 'var(--toss-red)' : budgetPct > 80 ? 'var(--toss-yellow)' : 'var(--toss-text-primary)' }}
          >
            {budgetPct}
            <span className="text-base font-normal" style={{ color: 'var(--toss-text-tertiary)' }}>%</span>
          </p>
          <p className="text-xs mt-1" style={{ color: 'var(--toss-text-tertiary)' }}>예산 사용</p>
        </button>
        <button
          className="card text-center"
          style={{ padding: '16px 8px', cursor: 'pointer' }}
          onClick={() => router.push('/decisions')}
        >
          <p className="text-2xl font-bold tabular-nums"
            style={{ color: undecided.length > 0 ? 'var(--toss-yellow)' : 'var(--toss-text-primary)' }}>
            {undecided.length}
          </p>
          <p className="text-xs mt-1" style={{ color: 'var(--toss-text-tertiary)' }}>미결정</p>
        </button>
      </div>

      {/* 🔴 긴급 — 이번 주 마감 or 지난 항목 */}
      {urgentItems.length > 0 && (
        <div
          className="card mb-4"
          style={{ border: '1.5px solid var(--toss-red-light)', backgroundColor: 'var(--toss-red-light)' }}
        >
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <AlertCircle size={16} color="var(--toss-red)" />
              <p className="text-sm font-bold" style={{ color: 'var(--toss-red)' }}>
                지금 해야 해요 · {urgentItems.length}개
              </p>
            </div>
            <button
              onClick={() => router.push('/timeline')}
              className="flex items-center gap-0.5 text-xs"
              style={{ color: 'var(--toss-red)', background: 'none', border: 'none', cursor: 'pointer' }}
            >
              전체 보기 <ChevronRight size={12} />
            </button>
          </div>
          <ul className="flex flex-col gap-3">
            {urgentItems.slice(0, 3).map(item => (
              <li key={item.id} className="flex items-center gap-3">
                <button
                  onClick={() => toggleItem(item.id, item.is_done)}
                  className="flex-shrink-0 flex items-center justify-center"
                  style={{
                    width: 20, height: 20, borderRadius: '50%',
                    border: '2px solid var(--toss-red)',
                    backgroundColor: item.is_done ? 'var(--toss-red)' : 'transparent',
                  }}
                >
                  {item.is_done && <span style={{ color: 'white', fontSize: 11 }}>✓</span>}
                </button>
                <span className="flex-1 text-sm" style={{ color: 'var(--toss-text-primary)', textDecoration: item.is_done ? 'line-through' : 'none' }}>
                  {item.title}
                </span>
              </li>
            ))}
            {urgentItems.length > 3 && (
              <li className="text-xs text-center" style={{ color: 'var(--toss-red)' }}>
                + {urgentItems.length - 3}개 더 있어요
              </li>
            )}
          </ul>
        </div>
      )}

      {/* 예산 현황 카드 */}
      {totalBudget > 0 && (
        <button
          className="card mb-4 w-full text-left"
          style={{ cursor: 'pointer' }}
          onClick={() => router.push('/budget')}
        >
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Wallet size={16} color="var(--toss-blue)" />
              <p className="text-sm font-semibold" style={{ color: 'var(--toss-text-primary)' }}>예산 현황</p>
            </div>
            <ChevronRight size={16} color="var(--toss-text-tertiary)" />
          </div>
          <div className="flex justify-between text-xs mb-2" style={{ color: 'var(--toss-text-tertiary)' }}>
            <span className="tabular-nums">사용 {totalSpent.toLocaleString()}만원</span>
            <span className="tabular-nums">
              잔여{' '}
              <span style={{ color: budgetRemain < 0 ? 'var(--toss-red)' : 'var(--toss-green)', fontWeight: 700 }}>
                {budgetRemain.toLocaleString()}만원
              </span>
            </span>
          </div>
          <div className="progress-bar mb-2">
            <div
              className="progress-fill"
              style={{
                width: `${Math.min(100, budgetPct)}%`,
                backgroundColor: budgetPct > 100 ? 'var(--toss-red)' : budgetPct > 80 ? 'var(--toss-yellow)' : 'var(--toss-blue)',
              }}
            />
          </div>
          <div className="flex justify-between items-center">
            <p className="text-xs" style={{ color: 'var(--toss-text-tertiary)' }}>
              전체 예산 {totalBudget.toLocaleString()}만원
            </p>
            <span
              className="text-xs font-bold tabular-nums px-2 py-0.5 rounded-full"
              style={{
                backgroundColor: budgetPct > 100 ? 'var(--toss-red-light)' : budgetPct > 80 ? '#FFF9E6' : 'var(--toss-blue-light)',
                color: budgetPct > 100 ? 'var(--toss-red)' : budgetPct > 80 ? 'var(--toss-yellow)' : 'var(--toss-blue)',
              }}
            >
              {budgetPct}%
            </span>
          </div>
        </button>
      )}

      {/* 업체 잔금 D-day */}
      {pendingBalances.length > 0 && (
        <button
          className="card mb-4 w-full text-left"
          style={{ cursor: 'pointer' }}
          onClick={() => router.push('/budget')}
        >
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <CalendarDays size={16} color="var(--rose)" />
              <p className="text-sm font-semibold" style={{ color: 'var(--toss-text-primary)' }}>업체 잔금 일정</p>
            </div>
            <ChevronRight size={16} color="var(--toss-text-tertiary)" />
          </div>
          <div className="flex flex-col gap-2">
            {pendingBalances.map(v => {
              const isOverdue = v.dday < 0;
              const isSoon    = v.dday >= 0 && v.dday <= 14;
              const ddayColor = isOverdue ? 'var(--toss-red)' : isSoon ? 'var(--toss-yellow)' : 'var(--toss-text-secondary)';

              return (
                <div key={v.id} className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium" style={{ color: 'var(--toss-text-primary)' }}>{v.name}</p>
                    <p className="text-xs mt-0.5 tabular-nums" style={{ color: 'var(--toss-text-tertiary)' }}>
                      {new Date(v.balance_due).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold tabular-nums" style={{ color: 'var(--toss-red)' }}>
                      {v.balance?.toLocaleString()}만원
                    </p>
                    <p className="text-xs font-semibold tabular-nums" style={{ color: ddayColor }}>
                      {isOverdue ? `D+${Math.abs(v.dday)}` : v.dday === 0 ? '오늘!' : `D-${v.dday}`}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </button>
      )}

      {/* 미결정 의사결정 */}
      {undecided.length > 0 && (
        <button
          className="card mb-4 w-full text-left"
          style={{ cursor: 'pointer' }}
          onClick={() => router.push('/decisions')}
        >
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <MessageSquare size={16} color="var(--toss-yellow)" />
              <p className="text-sm font-semibold" style={{ color: 'var(--toss-text-primary)' }}>
                아직 결정 안 된 항목
              </p>
            </div>
            <span className="flex items-center gap-0.5">
              <span className="text-xs tabular-nums" style={{ color: 'var(--toss-text-tertiary)' }}>
                {undecided.length}개
              </span>
              <ChevronRight size={16} color="var(--toss-text-tertiary)" />
            </span>
          </div>
          <div className="flex flex-col gap-2">
            {undecided.slice(0, 3).map(d => (
              <div key={d.id} className="flex items-center gap-2">
                <span
                  className="text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0"
                  style={{
                    backgroundColor: d.status === 'discussing' ? '#FFF9E6' : 'var(--toss-bg)',
                    color: d.status === 'discussing' ? 'var(--toss-yellow)' : 'var(--toss-text-tertiary)',
                  }}
                >
                  {d.status === 'discussing' ? '논의 중' : '미논의'}
                </span>
                <p className="text-sm" style={{ color: 'var(--toss-text-primary)' }}>{d.title}</p>
              </div>
            ))}
            {undecided.length > 3 && (
              <p className="text-xs" style={{ color: 'var(--toss-text-tertiary)' }}>
                + {undecided.length - 3}개 더
              </p>
            )}
          </div>
        </button>
      )}

      {/* 퀵링크 */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        {[
          { label: '📋 타임라인', desc: `완료 ${totalDone}/${totalCount}`, href: '/timeline', color: 'var(--toss-blue-light)', textColor: 'var(--toss-blue)' },
          { label: '💰 예산·업체', desc: totalBudget > 0 ? `${budgetPct}% 사용` : '예산 설정하기', href: '/budget', color: 'var(--toss-blue-light)', textColor: 'var(--toss-blue)' },
          { label: '🎊 하객 관리', desc: '명단·축의금·청첩장', href: '/guests', color: 'var(--rose-light)', textColor: 'var(--rose)' },
          { label: '💬 의사결정', desc: undecided.length > 0 ? `${undecided.length}개 미결정` : '모두 결정됐어요', href: '/decisions', color: undecided.length > 0 ? '#FFF9E6' : 'var(--toss-bg)', textColor: undecided.length > 0 ? 'var(--toss-yellow)' : 'var(--toss-text-secondary)' },
        ].map(({ label, desc, href, color, textColor }) => (
          <button
            key={href}
            onClick={() => router.push(href)}
            className="rounded-2xl p-4 text-left"
            style={{ backgroundColor: color, border: 'none', cursor: 'pointer' }}
          >
            <p className="text-sm font-bold mb-1" style={{ color: textColor }}>{label}</p>
            <p className="text-xs" style={{ color: 'var(--toss-text-secondary)' }}>{desc}</p>
          </button>
        ))}
      </div>

      <BottomNav active="home" />
    </div>
  );
}
