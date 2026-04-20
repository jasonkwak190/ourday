'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import BottomNav from '@/components/BottomNav';
import EmptyState from '@/components/EmptyState';
import { Wallet } from 'lucide-react';

const CATEGORIES = [
  { value: 'hall',   label: '웨딩홀',   icon: '🏛',  color: '#3182f6' },
  { value: 'dress',  label: '스드메',   icon: '👗',  color: '#f06292' },
  { value: 'travel', label: '신혼여행', icon: '✈️',  color: '#26a69a' },
  { value: 'hanbok', label: '한복',     icon: '👘',  color: '#ff7043' },
  { value: 'invite', label: '청첩장',   icon: '💌',  color: '#ab47bc' },
  { value: 'other',  label: '기타',     icon: '💼',  color: '#8d6e63' },
];

// ── 도넛 차트 ────────────────────────────────────────────
function DonutChart({ items }) {
  const R = 70;  // 반지름
  const CX = 100, CY = 100;
  const circumference = 2 * Math.PI * R;

  // 카테고리별 실제 지출 합산
  const catTotals = CATEGORIES.map(cat => ({
    ...cat,
    total: items.filter(i => i.category === cat.value)
                .reduce((s, i) => s + (i.actual_amount || 0), 0),
  })).filter(c => c.total > 0);

  const grandTotal = catTotals.reduce((s, c) => s + c.total, 0);
  if (grandTotal === 0) return null;

  // 각 세그먼트 계산
  let offset = 0;
  const segments = catTotals.map(cat => {
    const ratio = cat.total / grandTotal;
    const dash  = ratio * circumference;
    const seg   = { ...cat, ratio, dash, offset };
    offset += dash;
    return seg;
  });

  return (
    <div className="card mb-4">
      <p className="text-sm font-semibold mb-3" style={{ color: 'var(--toss-text-primary)' }}>
        카테고리별 지출
      </p>

      {/* 도넛 — 가운데 정렬 */}
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 20 }}>
        <svg width={160} height={160} viewBox="0 0 200 200">
          <circle cx={CX} cy={CY} r={R}
            fill="none" stroke="#f2f4f6" strokeWidth={30} />
          <g transform={`rotate(-90 ${CX} ${CY})`}>
            {segments.map((seg, i) => (
              <circle key={i}
                cx={CX} cy={CY} r={R}
                fill="none"
                stroke={seg.color}
                strokeWidth={30}
                strokeDasharray={`${seg.dash - 2} ${circumference - seg.dash + 2}`}
                strokeDashoffset={-seg.offset}
                strokeLinecap="butt"
              />
            ))}
          </g>
          <text x={CX} y={CY - 8} textAnchor="middle"
            fontSize={13} fill="#8b95a1" fontFamily="Pretendard Variable, Pretendard, sans-serif">
            총 지출
          </text>
          <text x={CX} y={CY + 12} textAnchor="middle"
            fontSize={17} fontWeight={700} fill="#191f28" fontFamily="Pretendard Variable, Pretendard, sans-serif">
            {grandTotal.toLocaleString()}
          </text>
          <text x={CX} y={CY + 28} textAnchor="middle"
            fontSize={11} fill="#8b95a1" fontFamily="Pretendard Variable, Pretendard, sans-serif">
            만원
          </text>
        </svg>
      </div>

      {/* 범례 — 2열 그리드 */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px 12px' }}>
        {segments.map((seg, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 7, minWidth: 0 }}>
            <div style={{
              width: 10, height: 10, borderRadius: '50%',
              backgroundColor: seg.color, flexShrink: 0,
            }} />
            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 4 }}>
                <span style={{ fontSize: 12, color: '#4e5968', fontWeight: 500, whiteSpace: 'nowrap' }}>
                  {seg.label}
                </span>
                <span style={{ fontSize: 11, color: '#b0b8c1', flexShrink: 0 }}>
                  {Math.round(seg.ratio * 100)}%
                </span>
              </div>
              <p style={{ fontSize: 12, fontWeight: 700, color: '#191f28', margin: 0 }}>
                {seg.total.toLocaleString()}만원
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function getStatusTag(est, act) {
  if (act === null || act === undefined) return { label: '미결제', cls: 'tag-stone' };
  if (act > est) return { label: '초과', cls: 'tag-rose' };
  return { label: '예산내', cls: 'tag-green' };
}

function getCategoryInfo(value) {
  return CATEGORIES.find((c) => c.value === value) || { label: '기타', icon: '💼' };
}

const EMPTY_FORM = { category: 'hall', name: '', estimated_amount: '', actual_amount: '', memo: '' };

export default function BudgetPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState([]);
  const [totalBudget, setTotalBudget] = useState(0);
  const [coupleId, setCoupleId] = useState(null);

  // 추가 폼
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // 총 예산 수정
  const [editingBudget, setEditingBudget] = useState(false);
  const [budgetInput, setBudgetInput] = useState('');

  // 수정/삭제
  const [menuId, setMenuId] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState(EMPTY_FORM);

  useEffect(() => {
    const load = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.push('/'); return; }

      const { data: user } = await supabase
        .from('users').select('couple_id').eq('id', session.user.id).single();

      if (!user?.couple_id) { router.push('/setup'); return; }
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

  // Realtime 구독
  useEffect(() => {
    if (!coupleId) return;
    const channel = supabase
      .channel(`budget-${coupleId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'budget_items',
        filter: `couple_id=eq.${coupleId}`,
      }, (payload) => {
        if (payload.eventType === 'INSERT') {
          setItems((prev) => {
            if (prev.find((i) => i.id === payload.new.id)) return prev;
            return [...prev, payload.new];
          });
        } else if (payload.eventType === 'UPDATE') {
          setItems((prev) => prev.map((i) => i.id === payload.new.id ? payload.new : i));
        } else if (payload.eventType === 'DELETE') {
          setItems((prev) => prev.filter((i) => i.id !== payload.old.id));
        }
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [coupleId]);

  async function saveTotalBudget() {
    const val = parseInt(budgetInput, 10);
    if (isNaN(val) || val < 0) return;
    await supabase.from('couples').update({ total_budget: val }).eq('id', coupleId);
    setTotalBudget(val);
    setEditingBudget(false);
  }

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
      .select().single();

    if (insertError) { setError('추가에 실패했어요.'); setSaving(false); return; }
    setItems((prev) => [...prev, data]);
    setForm(EMPTY_FORM);
    setShowForm(false);
    setSaving(false);
  }

  function startEdit(item) {
    setEditingId(item.id);
    setEditForm({
      category: item.category,
      name: item.name,
      estimated_amount: String(item.estimated_amount ?? ''),
      actual_amount: String(item.actual_amount ?? ''),
      memo: item.memo ?? '',
    });
    setMenuId(null);
  }

  async function handleEdit() {
    setError('');
    if (!editForm.name.trim()) { setError('이름을 입력해주세요.'); return; }
    if (!editForm.estimated_amount) { setError('예상 금액을 입력해주세요.'); return; }
    setSaving(true);

    const updates = {
      category: editForm.category,
      name: editForm.name.trim(),
      estimated_amount: parseInt(editForm.estimated_amount, 10),
      actual_amount: editForm.actual_amount ? parseInt(editForm.actual_amount, 10) : null,
      memo: editForm.memo.trim() || null,
    };

    const { error: updateError } = await supabase
      .from('budget_items').update(updates).eq('id', editingId);

    if (!updateError) {
      setItems((prev) => prev.map((it) => it.id === editingId ? { ...it, ...updates } : it));
    }
    setEditingId(null);
    setSaving(false);
  }

  async function deleteItem(id) {
    setItems((prev) => prev.filter((it) => it.id !== id));
    await supabase.from('budget_items').delete().eq('id', id);
    setMenuId(null);
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
    <div className="page-wrapper" onClick={() => setMenuId(null)}>
      <h1 className="text-xl font-semibold mb-4" style={{ color: 'var(--ink)' }}>
        💰 예산 관리
      </h1>

      {/* 요약 카드 */}
      <div className="card mb-4">
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <p className="text-xs" style={{ color: 'var(--stone)' }}>총 예산</p>
            {editingBudget ? (
              <div className="flex items-center gap-1 mt-0.5">
                <input
                  className="input-field text-sm py-1 px-2"
                  style={{ width: '90px' }}
                  type="number"
                  value={budgetInput}
                  onChange={(e) => setBudgetInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && saveTotalBudget()}
                  autoFocus
                />
                <span className="text-sm" style={{ color: 'var(--stone)' }}>만원</span>
                <button onClick={saveTotalBudget} className="text-xs font-medium" style={{ color: 'var(--rose)', background: 'none', border: 'none', cursor: 'pointer' }}>저장</button>
                <button onClick={() => setEditingBudget(false)} className="text-xs" style={{ color: 'var(--stone)', background: 'none', border: 'none', cursor: 'pointer' }}>취소</button>
              </div>
            ) : (
              <div className="flex items-center gap-2 mt-0.5">
                <p className="text-lg font-semibold tabular-nums" style={{ color: 'var(--ink)' }}>
                  {totalBudget.toLocaleString()}만원
                </p>
                <button
                  onClick={() => { setBudgetInput(String(totalBudget)); setEditingBudget(true); }}
                  className="text-xs"
                  style={{ color: 'var(--stone)', background: 'none', border: 'none', cursor: 'pointer' }}
                >
                  ✏️
                </button>
              </div>
            )}
          </div>
          <div>
            <p className="text-xs" style={{ color: 'var(--stone)' }}>실제 지출</p>
            <p className="text-lg font-semibold mt-0.5 tabular-nums" style={{ color: 'var(--rose)' }}>
              {totalSpent.toLocaleString()}만원
            </p>
          </div>
          <div>
            <p className="text-xs" style={{ color: 'var(--stone)' }}>사용률</p>
            <p className="text-lg font-semibold mt-0.5 tabular-nums" style={{ color: budgetPct >= 100 ? 'var(--rose)' : 'var(--ink)' }}>
              {budgetPct}%
            </p>
          </div>
          <div>
            <p className="text-xs" style={{ color: 'var(--stone)' }}>남은 예산</p>
            <p className="text-lg font-semibold mt-0.5 tabular-nums" style={{ color: remaining < 0 ? 'var(--rose)' : 'var(--green)' }}>
              {remaining.toLocaleString()}만원
            </p>
          </div>
        </div>
        <div className="progress-bar">
          <div className="progress-fill" style={{ width: `${budgetPct}%` }} />
        </div>
      </div>

      {/* 도넛 차트 */}
      <DonutChart items={items} />

      {/* 항목 목록 */}
      <div className="flex flex-col gap-3 mb-4">
        {items.length === 0 ? (
          <div className="card">
            <EmptyState
              icon={Wallet}
              title="아직 예산 항목이 없어요"
              description="웨딩홀, 스드메, 신혼여행 등 항목을 추가해보세요"
              action={{ label: '첫 항목 추가하기', onClick: () => setShowForm(true) }}
            />
          </div>
        ) : (
          items.map((item) => {
            const cat = getCategoryInfo(item.category);
            const status = getStatusTag(item.estimated_amount, item.actual_amount);
            const isEditing = editingId === item.id;
            const isMenuOpen = menuId === item.id;

            if (isEditing) {
              return (
                <div key={item.id} className="card flex flex-col gap-3">
                  <p className="text-sm font-semibold" style={{ color: 'var(--ink)' }}>항목 수정</p>
                  <div className="grid grid-cols-3 gap-2">
                    {CATEGORIES.map((c) => (
                      <button
                        key={c.value}
                        onClick={() => setEditForm((f) => ({ ...f, category: c.value }))}
                        className="py-2 rounded-xl text-xs font-medium flex flex-col items-center gap-1"
                        style={{
                          backgroundColor: editForm.category === c.value ? 'var(--rose-light)' : 'var(--beige)',
                          color: editForm.category === c.value ? 'var(--rose)' : 'var(--stone)',
                          border: `1.5px solid ${editForm.category === c.value ? 'var(--rose)' : 'transparent'}`,
                        }}
                      >
                        <span>{c.icon}</span>{c.label}
                      </button>
                    ))}
                  </div>
                  <input className="input-field" placeholder="항목 이름" value={editForm.name}
                    onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))} />
                  <div className="flex gap-2">
                    <input className="input-field" type="number" placeholder="예상 금액 (만원)"
                      value={editForm.estimated_amount}
                      onChange={(e) => setEditForm((f) => ({ ...f, estimated_amount: e.target.value }))} />
                    <input className="input-field" type="number" placeholder="실제 금액 (선택)"
                      value={editForm.actual_amount}
                      onChange={(e) => setEditForm((f) => ({ ...f, actual_amount: e.target.value }))} />
                  </div>
                  <input className="input-field" placeholder="메모 (선택)" value={editForm.memo}
                    onChange={(e) => setEditForm((f) => ({ ...f, memo: e.target.value }))} />
                  {error && <p className="text-xs" style={{ color: 'var(--rose)' }}>{error}</p>}
                  <div className="flex gap-2">
                    <button className="btn-outline flex-1" onClick={() => { setEditingId(null); setError(''); }}>취소</button>
                    <button className="btn-rose flex-1" onClick={handleEdit} disabled={saving}>
                      {saving ? '저장 중...' : '저장'}
                    </button>
                  </div>
                </div>
              );
            }

            return (
              <div key={item.id} className="card flex items-center gap-3 relative" onClick={(e) => e.stopPropagation()}>
                <span className="text-2xl">{cat.icon}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate" style={{ color: 'var(--ink)' }}>{item.name}</p>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--stone)' }}>
                    예상 {item.estimated_amount?.toLocaleString()}만원
                    {item.actual_amount != null && ` · 실제 ${item.actual_amount.toLocaleString()}만원`}
                  </p>
                  {item.memo && <p className="text-xs mt-0.5" style={{ color: 'var(--stone-light)' }}>{item.memo}</p>}
                </div>
                <span className={`tag ${status.cls} flex-shrink-0`}>{status.label}</span>
                <button
                  onClick={(e) => { e.stopPropagation(); setMenuId(isMenuOpen ? null : item.id); }}
                  className="text-lg flex-shrink-0"
                  style={{ color: 'var(--stone)', background: 'none', border: 'none', cursor: 'pointer', padding: '0 2px' }}
                >
                  ···
                </button>

                {isMenuOpen && (
                  <div
                    className="absolute right-0 z-10 rounded-xl shadow-lg overflow-hidden"
                    style={{ top: '100%', backgroundColor: 'white', border: '1.5px solid var(--stone-light)', minWidth: '100px' }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <button
                      className="w-full text-left px-4 py-3 text-sm font-medium"
                      style={{ color: 'var(--ink)', background: 'none', border: 'none', cursor: 'pointer' }}
                      onClick={() => startEdit(item)}
                    >
                      ✏️ 수정
                    </button>
                    <div style={{ height: '1px', backgroundColor: 'var(--beige)' }} />
                    <button
                      className="w-full text-left px-4 py-3 text-sm font-medium"
                      style={{ color: 'var(--rose)', background: 'none', border: 'none', cursor: 'pointer' }}
                      onClick={() => deleteItem(item.id)}
                    >
                      🗑 삭제
                    </button>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* 추가 폼 */}
      {showForm ? (
        <div className="card flex flex-col gap-3 mb-4">
          <p className="text-sm font-semibold" style={{ color: 'var(--ink)' }}>항목 추가</p>
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
                <span>{c.icon}</span>{c.label}
              </button>
            ))}
          </div>
          <input className="input-field" placeholder="항목 이름" value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
          <div className="flex gap-2">
            <input className="input-field" type="number" placeholder="예상 금액 (만원)"
              value={form.estimated_amount}
              onChange={(e) => setForm((f) => ({ ...f, estimated_amount: e.target.value }))} />
            <input className="input-field" type="number" placeholder="실제 금액 (선택)"
              value={form.actual_amount}
              onChange={(e) => setForm((f) => ({ ...f, actual_amount: e.target.value }))} />
          </div>
          <input className="input-field" placeholder="메모 (선택)" value={form.memo}
            onChange={(e) => setForm((f) => ({ ...f, memo: e.target.value }))} />
          {error && <p className="text-xs" style={{ color: 'var(--rose)' }}>{error}</p>}
          <div className="flex gap-2">
            <button className="btn-outline flex-1" onClick={() => { setShowForm(false); setError(''); setForm(EMPTY_FORM); }}>취소</button>
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
