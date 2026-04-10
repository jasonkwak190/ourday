'use client';

export const dynamic = 'force-dynamic';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import BottomNav from '@/components/BottomNav';

const CATEGORIES = [
  { value: 'hall',     label: '웨딩홀',   icon: '🏛' },
  { value: 'dress',    label: '스드메',   icon: '👗' },
  { value: 'travel',   label: '신혼여행', icon: '✈️' },
  { value: 'hanbok',   label: '한복',     icon: '👘' },
  { value: 'invite',   label: '청첩장',   icon: '💌' },
  { value: 'other',    label: '기타',     icon: '💼' },
];

function getStatusTag(est, act) {
  if (act === null || act === undefined) return { label: '미결제', cls: 'tag-stone' };
  if (act > est) return { label: '초과', cls: 'tag-rose' };
  return { label: '예산내', cls: 'tag-green' };
}

function getCategoryInfo(value) {
  return CATEGORIES.find((c) => c.value === value) || { label: '기타', icon: '💼' };
}

export default function BudgetPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState([]);
  const [totalBudget, setTotalBudget] = useState(0);
  const [coupleId, setCoupleId] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    category: 'hall',
    name: '',
    estimated_amount: '',
    actual_amount: '',
    memo: '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const load = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.push('/'); return; }

      const { data: user } = await supabase
        .from('users')
        .select('couple_id')
        .eq('id', session.user.id)
        .single();

      if (!user?.couple_id) { router.push('/connect'); return; }
      const cId = user.couple_id;
      setCoupleId(cId);

      const [coupleRes, itemsRes] = await Promise.all([
        supabase.from('couples').select('total_budget').eq('id', cId).single(),
        supabase.from('budget_items').select('*').eq('couple_id', cId).order('created_at'),
      ]);

      setTotalBudget(coupleRes.data?.total_budget || 0);
      setItems(itemsRes.data || []);
      setLoading(false);
    };
    load();
  }, [router]);

  async function handleAdd() {
    setError('');
    if (!form.name.trim()) { setError('이름을 입력해주세요.'); return; }
    if (!form.estimated_amount) { setError('예상 금액을 입력해주세요.'); return; }
    setSaving(true);

    const { data, error: insertError } = await supabase
      .from('budget_items')
      .insert({
        couple_id: coupleId,
        category: form.category,
        name: form.name.trim(),
        estimated_amount: parseInt(form.estimated_amount, 10),
        actual_amount: form.actual_amount ? parseInt(form.actual_amount, 10) : null,
        memo: form.memo.trim() || null,
      })
      .select()
      .single();

    if (insertError) { setError('추가에 실패했어요.'); setSaving(false); return; }
    setItems((prev) => [...prev, data]);
    setForm({ category: 'hall', name: '', estimated_amount: '', actual_amount: '', memo: '' });
    setShowForm(false);
    setSaving(false);
  }

  if (loading) {
    return (
      <div className="page-wrapper flex items-center justify-center">
        <p className="text-sm" style={{ color: 'var(--stone)' }}>불러오는 중...</p>
      </div>
    );
  }

  const totalSpent = items.reduce((s, b) => s + (b.actual_amount || 0), 0);
  const budgetPct = totalBudget > 0 ? Math.min(Math.round((totalSpent / totalBudget) * 100), 100) : 0;
  const remaining = totalBudget - totalSpent;

  return (
    <div className="page-wrapper">
      <h1 className="text-xl font-semibold mb-4" style={{ color: 'var(--ink)' }}>
        💰 예산 관리
      </h1>

      {/* 요약 카드 */}
      <div className="card mb-4">
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <p className="text-xs" style={{ color: 'var(--stone)' }}>총 예산</p>
            <p className="text-lg font-semibold mt-0.5" style={{ color: 'var(--ink)' }}>
              {totalBudget.toLocaleString()}만원
            </p>
          </div>
          <div>
            <p className="text-xs" style={{ color: 'var(--stone)' }}>실제 지출</p>
            <p className="text-lg font-semibold mt-0.5" style={{ color: 'var(--rose)' }}>
              {totalSpent.toLocaleString()}만원
            </p>
          </div>
          <div>
            <p className="text-xs" style={{ color: 'var(--stone)' }}>사용률</p>
            <p className="text-lg font-semibold mt-0.5" style={{ color: budgetPct > 100 ? 'var(--rose)' : 'var(--ink)' }}>
              {budgetPct}%
            </p>
          </div>
          <div>
            <p className="text-xs" style={{ color: 'var(--stone)' }}>남은 예산</p>
            <p className="text-lg font-semibold mt-0.5" style={{ color: remaining < 0 ? 'var(--rose)' : 'var(--green)' }}>
              {remaining.toLocaleString()}만원
            </p>
          </div>
        </div>
        <div className="progress-bar">
          <div
            className="progress-fill"
            style={{
              width: `${budgetPct}%`,
              backgroundColor: budgetPct > 100 ? 'var(--rose)' : 'var(--rose)',
            }}
          />
        </div>
      </div>

      {/* 항목 목록 */}
      <div className="flex flex-col gap-3 mb-4">
        {items.length === 0 ? (
          <div className="card text-center py-8" style={{ color: 'var(--stone)' }}>
            <p className="text-2xl mb-2">💸</p>
            <p className="text-sm">아직 예산 항목이 없어요</p>
          </div>
        ) : (
          items.map((item) => {
            const cat = getCategoryInfo(item.category);
            const status = getStatusTag(item.estimated_amount, item.actual_amount);
            return (
              <div key={item.id} className="card flex items-center gap-3">
                <span className="text-2xl">{cat.icon}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate" style={{ color: 'var(--ink)' }}>
                    {item.name}
                  </p>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--stone)' }}>
                    예상 {item.estimated_amount?.toLocaleString()}만원
                    {item.actual_amount != null && ` · 실제 ${item.actual_amount.toLocaleString()}만원`}
                  </p>
                  {item.memo && (
                    <p className="text-xs mt-0.5" style={{ color: 'var(--stone-light)' }}>
                      {item.memo}
                    </p>
                  )}
                </div>
                <span className={`tag ${status.cls} flex-shrink-0`}>{status.label}</span>
              </div>
            );
          })
        )}
      </div>

      {/* 추가 폼 */}
      {showForm ? (
        <div className="card flex flex-col gap-3 mb-4">
          <p className="text-sm font-semibold" style={{ color: 'var(--ink)' }}>항목 추가</p>

          {/* 카테고리 */}
          <div className="grid grid-cols-3 gap-2">
            {CATEGORIES.map((c) => (
              <button
                key={c.value}
                onClick={() => setForm((f) => ({ ...f, category: c.value }))}
                className="py-2 rounded-xl text-xs font-medium flex flex-col items-center gap-1"
                style={{
                  backgroundColor: form.category === c.value ? 'var(--rose-light)' : 'var(--beige)',
                  color: form.category === c.value ? 'var(--rose)' : 'var(--stone)',
                  border: `1.5px solid ${form.category === c.value ? 'var(--rose)' : 'transparent'}`,
                }}
              >
                <span>{c.icon}</span>
                {c.label}
              </button>
            ))}
          </div>

          <input
            className="input-field"
            placeholder="항목 이름"
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
          />
          <div className="flex gap-2">
            <input
              className="input-field"
              type="number"
              placeholder="예상 금액 (만원)"
              value={form.estimated_amount}
              onChange={(e) => setForm((f) => ({ ...f, estimated_amount: e.target.value }))}
            />
            <input
              className="input-field"
              type="number"
              placeholder="실제 금액 (선택)"
              value={form.actual_amount}
              onChange={(e) => setForm((f) => ({ ...f, actual_amount: e.target.value }))}
            />
          </div>
          <input
            className="input-field"
            placeholder="메모 (선택)"
            value={form.memo}
            onChange={(e) => setForm((f) => ({ ...f, memo: e.target.value }))}
          />

          {error && <p className="text-xs" style={{ color: 'var(--rose)' }}>{error}</p>}

          <div className="flex gap-2">
            <button className="btn-outline flex-1" onClick={() => { setShowForm(false); setError(''); }}>
              취소
            </button>
            <button className="btn-rose flex-1" onClick={handleAdd} disabled={saving}>
              {saving ? '추가 중...' : '추가'}
            </button>
          </div>
        </div>
      ) : (
        <button className="btn-outline w-full" onClick={() => setShowForm(true)}>
          + 항목 추가
        </button>
      )}

      <BottomNav active="budget" />
    </div>
  );
}
