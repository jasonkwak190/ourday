'use client';

export const dynamic = 'force-dynamic';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import BottomNav from '@/components/BottomNav';
import { AlertCircle } from 'lucide-react';

const ASSIGNED_LABELS = {
  groom: { label: '신랑', cls: 'tag-stone' },
  bride: { label: '신부', cls: 'tag-rose' },
  both:  { label: '둘다', cls: 'tag-green' },
};

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

// 이번 달 할 일 (긴급 제외)
function getCurrentMonthItems(items, weddingDate) {
  if (!weddingDate || !items.length) return [];
  const diff = getMonthsDiff(weddingDate);
  return items.filter(item => {
    const m = item.due_months_before;
    return m >= diff - 0.5 && m < diff - 0.25;
  });
}

export default function DashboardPage() {
  const router = useRouter();
  const [loading,     setLoading]     = useState(true);
  const [couple,      setCouple]      = useState(null);
  const [items,       setItems]       = useState([]);
  const [decisions,   setDecisions]   = useState([]);
  const [budgetItems, setBudgetItems] = useState([]);
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
      const [coupleRes, itemsRes, decisionsRes, budgetRes] = await Promise.all([
        supabase.from('couples').select('*').eq('id', cId).single(),
        supabase.from('checklist_items').select('*').eq('couple_id', cId),
        supabase.from('decisions').select('id, status').eq('couple_id', cId),
        supabase.from('budget_items').select('estimated_amount, actual_amount').eq('couple_id', cId),
      ]);

      if (coupleRes.error) { setError('데이터를 불러오지 못했어요.'); }
      else {
        setCouple(coupleRes.data);
        setItems(itemsRes.data || []);
        setDecisions(decisionsRes.data || []);
        setBudgetItems(budgetRes.data || []);
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
  const dday          = calcDday(couple?.wedding_date);
  const urgentItems   = getUrgentItems(items, couple?.wedding_date);
  const thisMonthItems = getCurrentMonthItems(items, couple?.wedding_date);
  const totalDone     = items.filter(i => i.is_done).length;
  const totalCount    = items.length;
  const progress      = totalCount > 0 ? Math.round((totalDone / totalCount) * 100) : 0;
  const undecided     = decisions.filter(d => d.status !== 'decided').length;
  const totalBudget   = couple?.total_budget || 0;
  const totalSpent    = budgetItems.reduce((s, b) => s + (b.actual_amount || 0), 0);
  const budgetPct     = totalBudget > 0 ? Math.round((totalSpent / totalBudget) * 100) : 0;

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
        <div className="card text-center" style={{ padding: '16px 8px' }}>
          <p className="text-2xl font-bold tabular-nums" style={{ color: 'var(--toss-text-primary)' }}>
            {totalDone}
            <span className="text-base font-normal" style={{ color: 'var(--toss-text-tertiary)' }}>
              /{totalCount}
            </span>
          </p>
          <p className="text-xs mt-1" style={{ color: 'var(--toss-text-tertiary)' }}>전체 완료</p>
        </div>
        <div className="card text-center" style={{ padding: '16px 8px' }}>
          <p
            className="text-2xl font-bold tabular-nums"
            style={{ color: budgetPct > 100 ? 'var(--toss-red)' : 'var(--toss-text-primary)' }}
          >
            {budgetPct}
            <span className="text-base font-normal" style={{ color: 'var(--toss-text-tertiary)' }}>%</span>
          </p>
          <p className="text-xs mt-1" style={{ color: 'var(--toss-text-tertiary)' }}>예산 사용</p>
        </div>
        <div className="card text-center" style={{ padding: '16px 8px' }}>
          <p className="text-2xl font-bold tabular-nums" style={{ color: undecided > 0 ? 'var(--toss-yellow)' : 'var(--toss-text-primary)' }}>
            {undecided}
          </p>
          <p className="text-xs mt-1" style={{ color: 'var(--toss-text-tertiary)' }}>미결정</p>
        </div>
      </div>

      {/* 전체 진행률 */}
      <div className="card mb-5">
        <div className="flex justify-between items-center mb-2">
          <p className="text-sm font-semibold" style={{ color: 'var(--toss-text-primary)' }}>전체 진행률</p>
          <p className="text-sm font-bold tabular-nums" style={{ color: 'var(--toss-blue)' }}>{progress}%</p>
        </div>
        <div className="progress-bar">
          <div className="progress-fill" style={{ width: `${progress}%` }} />
        </div>
      </div>

      {/* 🔴 긴급 — 이번 주 마감 or 지난 항목 */}
      {urgentItems.length > 0 && (
        <div
          className="card mb-5"
          style={{ borderColor: 'var(--toss-red)', border: '1.5px solid var(--toss-red-light)', backgroundColor: 'var(--toss-red-light)' }}
        >
          <div className="flex items-center gap-2 mb-3">
            <AlertCircle size={16} color="var(--toss-red)" />
            <p className="text-sm font-bold" style={{ color: 'var(--toss-red)' }}>
              지금 해야 해요 · {urgentItems.length}개
            </p>
          </div>
          <ul className="flex flex-col gap-3">
            {urgentItems.map(item => {
              const tag = ASSIGNED_LABELS[item.assigned_to] || ASSIGNED_LABELS.both;
              return (
                <li key={item.id} className="flex items-center gap-3">
                  <button
                    onClick={() => toggleItem(item.id, item.is_done)}
                    className="flex-shrink-0 flex items-center justify-center transition-all"
                    style={{
                      width: 20, height: 20, borderRadius: '50%',
                      border: `2px solid var(--toss-red)`,
                      backgroundColor: 'transparent',
                    }}
                  >
                    {item.is_done && <span style={{ color: 'var(--toss-red)', fontSize: 11 }}>✓</span>}
                  </button>
                  <span className="flex-1 text-sm font-medium" style={{ color: 'var(--toss-text-primary)' }}>
                    {item.title}
                  </span>
                  <span className={`tag ${tag.cls}`}>{tag.label}</span>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {/* 이번 달 할 일 */}
      <div className="card">
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-semibold" style={{ color: 'var(--toss-text-primary)' }}>
            이번 달 할 일
          </p>
          <span className="text-xs tabular-nums" style={{ color: 'var(--toss-text-tertiary)' }}>
            {thisMonthItems.filter(i => i.is_done).length}/{thisMonthItems.length}
          </span>
        </div>

        {thisMonthItems.length === 0 ? (
          <p className="text-sm text-center py-4" style={{ color: 'var(--toss-text-tertiary)' }}>
            이번 달 할 일이 없어요 🎉
          </p>
        ) : (
          <ul className="flex flex-col gap-3">
            {thisMonthItems.map(item => {
              const tag = ASSIGNED_LABELS[item.assigned_to] || ASSIGNED_LABELS.both;
              return (
                <li key={item.id} className="flex items-center gap-3">
                  <button
                    onClick={() => toggleItem(item.id, item.is_done)}
                    className="flex-shrink-0 flex items-center justify-center transition-all"
                    style={{
                      width: 20, height: 20, borderRadius: '50%',
                      border: `2px solid ${item.is_done ? 'var(--toss-blue)' : 'var(--toss-border)'}`,
                      backgroundColor: item.is_done ? 'var(--toss-blue)' : 'transparent',
                    }}
                  >
                    {item.is_done && <span style={{ color: 'white', fontSize: 11 }}>✓</span>}
                  </button>
                  <span
                    className="flex-1 text-sm"
                    style={{
                      color: item.is_done ? 'var(--toss-text-tertiary)' : 'var(--toss-text-primary)',
                      textDecoration: item.is_done ? 'line-through' : 'none',
                    }}
                  >
                    {item.title}
                  </span>
                  <span className={`tag ${tag.cls}`}>{tag.label}</span>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <BottomNav active="home" />
    </div>
  );
}
