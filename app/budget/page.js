'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import BottomNav from '@/components/BottomNav';
import EmptyState from '@/components/EmptyState';
import { Wallet, Store, AlertTriangle, Edit3 } from 'lucide-react';

/* ─── 업체 종류 ────────────────────────────────────────────────── */
const VENDOR_TYPES = [
  { value: 'hall',    label: '웨딩홀',    color: '#3182f6' },
  { value: 'studio',  label: '스튜디오',  color: '#f06292' },
  { value: 'dress',   label: '드레스',    color: '#ab47bc' },
  { value: 'makeup',  label: '메이크업',  color: '#ff7043' },
  { value: 'hanbok',  label: '한복',      color: '#26a69a' },
  { value: 'food',    label: '음식',      color: '#ffa726' },
  { value: 'flower',  label: '꽃장식',    color: '#ec407a' },
  { value: 'music',   label: '음향/영상', color: '#5c6bc0' },
  { value: 'travel',  label: '신혼여행',  color: '#29b6f6' },
  { value: 'other',   label: '기타',      color: '#8d6e63' },
];

const CONTRACT_STATUS = [
  { value: 'candidate', label: '후보',    color: 'var(--stone)',  bg: 'var(--beige)' },
  { value: 'pending',   label: '미계약',  color: 'var(--amber)',  bg: 'var(--amber-light)' },
  { value: 'signed',    label: '계약완료', color: 'var(--green)', bg: 'var(--green-light)' },
  { value: 'balance',   label: '잔금대기', color: 'var(--rose)',  bg: 'var(--rose-light)' },
  { value: 'done',      label: '완납',    color: 'var(--purple)', bg: 'var(--purple-light)' },
];

const EMPTY_FORM = {
  type: 'hall', name: '', contact_name: '', contact_phone: '',
  deposit: '', balance: '', balance_due: '', contract_status: 'candidate', memo: '',
};

/* ─── 유틸 ─────────────────────────────────────────────────────── */
function getTypeInfo(v) { return VENDOR_TYPES.find(t => t.value === v) || VENDOR_TYPES[VENDOR_TYPES.length - 1]; }
function getStatusInfo(v) { return CONTRACT_STATUS.find(s => s.value === v) || CONTRACT_STATUS[0]; }

function StatusBadge({ value }) {
  const s = getStatusInfo(value);
  return (
    <span className="text-xs font-semibold px-2 py-0.5 rounded-full flex-shrink-0"
      style={{ color: s.color, backgroundColor: s.bg }}>
      {s.label}
    </span>
  );
}

/* ─── 도넛 차트 (업체 기반) ──────────────────────────────────── */
function DonutChart({ vendors }) {
  const R = 70, CX = 100, CY = 100;
  const circumference = 2 * Math.PI * R;

  const typeTotals = VENDOR_TYPES.map(t => ({
    ...t,
    total: vendors
      .filter(v => v.type === t.value)
      .reduce((s, v) => s + (v.deposit || 0) + (v.balance || 0), 0),
  })).filter(t => t.total > 0);

  const grandTotal = typeTotals.reduce((s, t) => s + t.total, 0);
  if (grandTotal === 0) return null;

  let offset = 0;
  const segments = typeTotals.map(t => {
    const ratio = t.total / grandTotal;
    const dash = ratio * circumference;
    const seg = { ...t, ratio, dash, offset };
    offset += dash;
    return seg;
  });

  const FONT = 'Pretendard Variable, Pretendard, sans-serif';

  return (
    <div className="card mb-4">
      <p className="text-sm font-semibold mb-3" style={{ color: 'var(--toss-text-primary)' }}>
        업체별 예상 비용
      </p>
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 20 }}>
        <svg width={160} height={160} viewBox="0 0 200 200">
          <circle cx={CX} cy={CY} r={R} fill="none" stroke="#f2f4f6" strokeWidth={30} />
          <g transform={`rotate(-90 ${CX} ${CY})`}>
            {segments.map((seg, i) => (
              <circle key={i} cx={CX} cy={CY} r={R} fill="none"
                stroke={seg.color} strokeWidth={30}
                strokeDasharray={`${seg.dash - 2} ${circumference - seg.dash + 2}`}
                strokeDashoffset={-seg.offset} strokeLinecap="butt" />
            ))}
          </g>
          <text x={CX} y={CY - 8} textAnchor="middle" fontSize={13} fill="#8b95a1" fontFamily={FONT}>예상 합계</text>
          <text x={CX} y={CY + 12} textAnchor="middle" fontSize={17} fontWeight={700} fill="#191f28" fontFamily={FONT}>
            {grandTotal.toLocaleString()}
          </text>
          <text x={CX} y={CY + 28} textAnchor="middle" fontSize={11} fill="#8b95a1" fontFamily={FONT}>만원</text>
        </svg>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px 12px' }}>
        {segments.map((seg, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 7, minWidth: 0 }}>
            <div style={{ width: 10, height: 10, borderRadius: '50%', backgroundColor: seg.color, flexShrink: 0 }} />
            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 4 }}>
                <span style={{ fontSize: 12, color: '#4e5968', fontWeight: 500, whiteSpace: 'nowrap' }}>{seg.label}</span>
                <span style={{ fontSize: 11, color: '#b0b8c1', flexShrink: 0 }}>{Math.round(seg.ratio * 100)}%</span>
              </div>
              <p style={{ fontSize: 12, fontWeight: 700, color: '#191f28', margin: 0 }}>{seg.total.toLocaleString()}만원</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─── 업체 추가/수정 폼 ─────────────────────────────────────────── */
function VendorForm({ form, setForm, onSave, onCancel, saving, error, title }) {
  return (
    <div className="card flex flex-col gap-3 mb-4">
      <p className="text-sm font-semibold" style={{ color: 'var(--ink)' }}>{title}</p>

      {/* 종류 */}
      <div className="grid grid-cols-5 gap-1.5">
        {VENDOR_TYPES.map(t => (
          <button key={t.value} onClick={() => setForm(f => ({ ...f, type: t.value }))}
            className="py-2 rounded-xl text-xs font-semibold flex items-center justify-center"
            style={{
              backgroundColor: form.type === t.value ? 'var(--rose-light)' : 'var(--beige)',
              color: form.type === t.value ? 'var(--rose)' : 'var(--stone)',
              border: `1.5px solid ${form.type === t.value ? 'var(--rose)' : 'transparent'}`,
            }}>
            {t.label}
          </button>
        ))}
      </div>

      <input className="input-field" placeholder="업체명 *" value={form.name}
        onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />

      <div className="flex gap-2">
        <input className="input-field flex-1" placeholder="담당자" value={form.contact_name}
          onChange={e => setForm(f => ({ ...f, contact_name: e.target.value }))} />
        <input className="input-field flex-1" placeholder="연락처" value={form.contact_phone}
          onChange={e => setForm(f => ({ ...f, contact_phone: e.target.value }))} />
      </div>

      <div className="flex gap-2">
        <div className="flex-1">
          <p className="text-xs mb-1" style={{ color: 'var(--stone)' }}>계약금 (만원)</p>
          <input className="input-field" type="number" placeholder="0" value={form.deposit}
            onChange={e => setForm(f => ({ ...f, deposit: e.target.value }))} />
        </div>
        <div className="flex-1">
          <p className="text-xs mb-1" style={{ color: 'var(--stone)' }}>잔금 (만원)</p>
          <input className="input-field" type="number" placeholder="0" value={form.balance}
            onChange={e => setForm(f => ({ ...f, balance: e.target.value }))} />
        </div>
      </div>

      <div>
        <p className="text-xs mb-1" style={{ color: 'var(--stone)' }}>잔금 납부일</p>
        <input className="input-field" type="date" value={form.balance_due}
          onChange={e => setForm(f => ({ ...f, balance_due: e.target.value }))} />
      </div>

      <div>
        <p className="text-xs mb-2" style={{ color: 'var(--stone)' }}>계약 상태</p>
        <div className="flex flex-wrap gap-2">
          {CONTRACT_STATUS.map(s => (
            <button key={s.value} onClick={() => setForm(f => ({ ...f, contract_status: s.value }))}
              className="px-3 py-1.5 rounded-xl text-xs font-semibold"
              style={{
                backgroundColor: form.contract_status === s.value ? s.bg : 'var(--beige)',
                color: form.contract_status === s.value ? s.color : 'var(--stone)',
                border: `1.5px solid ${form.contract_status === s.value ? s.color : 'transparent'}`,
              }}>
              {s.label}
            </button>
          ))}
        </div>
      </div>

      <textarea className="input-field text-sm resize-none" rows={2} placeholder="메모 (선택)"
        value={form.memo} onChange={e => setForm(f => ({ ...f, memo: e.target.value }))} />

      {error && <p className="text-xs" style={{ color: 'var(--rose)' }}>{error}</p>}
      <div className="flex gap-2">
        <button className="btn-outline flex-1" onClick={onCancel}>취소</button>
        <button className="btn-rose flex-1" onClick={onSave} disabled={saving}>
          {saving ? '저장 중...' : '저장'}
        </button>
      </div>
    </div>
  );
}

/* ─── 메인 ────────────────────────────────────────────────────── */
export default function BudgetPage() {
  const router = useRouter();
  const today  = new Date();

  const [loading,     setLoading]     = useState(true);
  const [coupleId,    setCoupleId]    = useState(null);
  const [vendors,     setVendors]     = useState([]);
  const [totalBudget, setTotalBudget] = useState(0);

  // 총예산 수정
  const [editingBudget, setEditingBudget] = useState(false);
  const [budgetInput,   setBudgetInput]   = useState('');

  // 업체 추가
  const [showForm, setShowForm] = useState(false);
  const [form,     setForm]     = useState(EMPTY_FORM);
  const [saving,   setSaving]   = useState(false);
  const [error,    setError]    = useState('');

  // 업체 수정/삭제
  const [menuId,     setMenuId]     = useState(null);
  const [editingId,  setEditingId]  = useState(null);
  const [editForm,   setEditForm]   = useState(EMPTY_FORM);

  // 필터
  const [filterType,   setFilterType]   = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');

  /* ─ 데이터 로드 ─ */
  useEffect(() => {
    const load = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.push('/'); return; }
      const { data: user } = await supabase.from('users').select('couple_id').eq('id', session.user.id).single();
      if (!user?.couple_id) { router.push('/setup'); return; }
      const cId = user.couple_id;
      setCoupleId(cId);
      const [coupleRes, vendorRes] = await Promise.all([
        supabase.from('couples').select('total_budget').eq('id', cId).single(),
        supabase.from('vendors').select('*').eq('couple_id', cId).order('created_at'),
      ]);
      setTotalBudget(coupleRes.data?.total_budget || 0);
      setVendors(vendorRes.data || []);
      setLoading(false);
    };
    load();
  }, [router]);

  /* ─ Realtime ─ */
  useEffect(() => {
    if (!coupleId) return;
    const ch = supabase.channel(`budget-vendors-${coupleId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'vendors', filter: `couple_id=eq.${coupleId}` }, p => {
        if (p.eventType === 'INSERT') setVendors(prev => prev.find(v => v.id === p.new.id) ? prev : [...prev, p.new]);
        if (p.eventType === 'UPDATE') setVendors(prev => prev.map(v => v.id === p.new.id ? p.new : v));
        if (p.eventType === 'DELETE') setVendors(prev => prev.filter(v => v.id !== p.old.id));
      }).subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [coupleId]);

  /* ─ 총예산 저장 ─ */
  async function saveTotalBudget() {
    const val = parseInt(budgetInput, 10);
    if (isNaN(val) || val < 0) return;
    await supabase.from('couples').update({ total_budget: val }).eq('id', coupleId);
    setTotalBudget(val);
    setEditingBudget(false);
  }

  /* ─ 업체 CRUD ─ */
  async function handleAdd() {
    setError('');
    if (!form.name.trim()) { setError('업체명을 입력해주세요.'); return; }
    setSaving(true);
    const { data, error: e } = await supabase.from('vendors').insert({
      couple_id: coupleId, type: form.type, name: form.name.trim(),
      contact_name: form.contact_name.trim() || null, contact_phone: form.contact_phone.trim() || null,
      deposit: form.deposit ? parseInt(form.deposit, 10) : null,
      balance: form.balance ? parseInt(form.balance, 10) : null,
      balance_due: form.balance_due || null, contract_status: form.contract_status,
      memo: form.memo.trim() || null,
    }).select().single();
    if (e) { setError('추가에 실패했어요.'); setSaving(false); return; }
    setVendors(prev => [...prev, data]);
    setForm(EMPTY_FORM); setShowForm(false); setSaving(false);
  }

  function startEdit(vendor) {
    setEditingId(vendor.id);
    setEditForm({
      type: vendor.type, name: vendor.name,
      contact_name: vendor.contact_name || '', contact_phone: vendor.contact_phone || '',
      deposit: vendor.deposit != null ? String(vendor.deposit) : '',
      balance: vendor.balance != null ? String(vendor.balance) : '',
      balance_due: vendor.balance_due || '', contract_status: vendor.contract_status || 'candidate',
      memo: vendor.memo || '',
    });
    setMenuId(null);
  }

  async function handleEdit() {
    setError('');
    if (!editForm.name.trim()) { setError('업체명을 입력해주세요.'); return; }
    setSaving(true);
    const updates = {
      type: editForm.type, name: editForm.name.trim(),
      contact_name: editForm.contact_name.trim() || null, contact_phone: editForm.contact_phone.trim() || null,
      deposit: editForm.deposit ? parseInt(editForm.deposit, 10) : null,
      balance: editForm.balance ? parseInt(editForm.balance, 10) : null,
      balance_due: editForm.balance_due || null, contract_status: editForm.contract_status,
      memo: editForm.memo.trim() || null,
    };
    const { error: e } = await supabase.from('vendors').update(updates).eq('id', editingId);
    if (!e) setVendors(prev => prev.map(v => v.id === editingId ? { ...v, ...updates } : v));
    setEditingId(null); setSaving(false);
  }

  async function deleteVendor(id) {
    setVendors(prev => prev.filter(v => v.id !== id));
    await supabase.from('vendors').delete().eq('id', id);
    setMenuId(null);
  }

  /* ─ 계산 ─ */
  // 예상 총 비용 = 모든 업체의 계약금+잔금 합계
  const totalExpected = vendors.reduce((s, v) => s + (v.deposit || 0) + (v.balance || 0), 0);
  // 이미 납부 = 계약완료/잔금대기/완납 업체의 계약금 + 완납 업체의 잔금
  const totalPaid = vendors.reduce((s, v) => {
    if (!['signed', 'balance', 'done'].includes(v.contract_status)) return s;
    let paid = v.deposit || 0;
    if (v.contract_status === 'done') paid += (v.balance || 0);
    return s + paid;
  }, 0);
  // 남은 잔금 = 잔금대기 업체의 잔금
  const pendingBalance = vendors
    .filter(v => v.contract_status === 'balance')
    .reduce((s, v) => s + (v.balance || 0), 0);

  const budgetPct     = totalBudget > 0 ? Math.min(Math.round((totalExpected / totalBudget) * 100), 100) : 0;
  const remaining     = totalBudget - totalExpected;

  // 잔금 임박 (7일 이내)
  const urgentVendors = vendors.filter(v => {
    if (!v.balance_due || v.contract_status === 'done') return false;
    const diff = Math.ceil((new Date(v.balance_due) - today) / (1000 * 60 * 60 * 24));
    return diff >= 0 && diff <= 7;
  });

  // 필터 적용
  const filtered = vendors.filter(v =>
    (filterType === 'all' || v.type === filterType) &&
    (filterStatus === 'all' || v.contract_status === filterStatus)
  );

  if (loading) {
    return (
      <div className="page-wrapper flex items-center justify-center">
        <p className="text-sm" style={{ color: 'var(--stone)' }}>불러오는 중...</p>
      </div>
    );
  }

  return (
    <div className="page-wrapper" onClick={() => setMenuId(null)}>
      <h1 className="text-xl font-semibold mb-4" style={{ color: 'var(--ink)' }}>예산·업체</h1>

      {/* ── 예산 요약 카드 ── */}
      <div className="card mb-4">
        {/* 총예산 헤더 */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-xs mb-0.5" style={{ color: 'var(--stone)' }}>총 예산</p>
            {editingBudget ? (
              <div className="flex items-center gap-1.5">
                <input
                  className="input-field text-sm py-1 px-2 tabular-nums"
                  style={{ width: 96 }} type="number" value={budgetInput}
                  onChange={e => setBudgetInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && saveTotalBudget()} autoFocus />
                <span className="text-sm" style={{ color: 'var(--stone)' }}>만원</span>
                <button onClick={saveTotalBudget} className="text-xs font-semibold" style={{ color: 'var(--rose)', background: 'none', border: 'none', cursor: 'pointer' }}>저장</button>
                <button onClick={() => setEditingBudget(false)} className="text-xs" style={{ color: 'var(--stone)', background: 'none', border: 'none', cursor: 'pointer' }}>취소</button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <p className="text-xl font-bold tabular-nums" style={{ color: 'var(--ink)' }}>
                  {totalBudget > 0 ? `${totalBudget.toLocaleString()}만원` : '미설정'}
                </p>
                <button onClick={() => { setBudgetInput(String(totalBudget)); setEditingBudget(true); }}
                  style={{ color: 'var(--stone)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                  <Edit3 size={14} strokeWidth={2} />
                </button>
              </div>
            )}
          </div>
          <div className="text-right">
            <p className="text-xs mb-0.5" style={{ color: 'var(--stone)' }}>예상 총액</p>
            <p className="text-xl font-bold tabular-nums" style={{ color: remaining < 0 ? 'var(--rose)' : 'var(--ink)' }}>
              {totalExpected.toLocaleString()}만원
            </p>
          </div>
        </div>

        {/* 프로그레스 바 */}
        {totalBudget > 0 && (
          <div className="mb-4">
            <div className="flex justify-between text-xs mb-1.5">
              <span style={{ color: 'var(--stone)' }}>
                {remaining >= 0
                  ? `여유 ${remaining.toLocaleString()}만원`
                  : `초과 ${Math.abs(remaining).toLocaleString()}만원`}
              </span>
              <span style={{ color: remaining < 0 ? 'var(--rose)' : 'var(--stone)' }}>{budgetPct}%</span>
            </div>
            <div className="progress-bar">
              <div className="progress-fill" style={{ width: `${budgetPct}%`, backgroundColor: remaining < 0 ? 'var(--rose)' : undefined }} />
            </div>
          </div>
        )}

        {/* 세부 수치 */}
        <div className="grid grid-cols-3 gap-3 text-center">
          <div style={{ padding: '10px 0', borderRadius: 12, backgroundColor: 'var(--toss-bg)' }}>
            <p className="text-xs mb-1" style={{ color: 'var(--stone)' }}>이미 납부</p>
            <p className="text-base font-bold tabular-nums" style={{ color: 'var(--green)' }}>
              {totalPaid.toLocaleString()}만
            </p>
          </div>
          <div style={{ padding: '10px 0', borderRadius: 12, backgroundColor: 'var(--toss-bg)' }}>
            <p className="text-xs mb-1" style={{ color: 'var(--stone)' }}>남은 잔금</p>
            <p className="text-base font-bold tabular-nums" style={{ color: pendingBalance > 0 ? 'var(--rose)' : 'var(--stone)' }}>
              {pendingBalance.toLocaleString()}만
            </p>
          </div>
          <div style={{ padding: '10px 0', borderRadius: 12, backgroundColor: 'var(--toss-bg)' }}>
            <p className="text-xs mb-1" style={{ color: 'var(--stone)' }}>등록 업체</p>
            <p className="text-base font-bold tabular-nums" style={{ color: 'var(--ink)' }}>
              {vendors.length}개
            </p>
          </div>
        </div>
      </div>

      {/* ── 도넛 차트 ── */}
      <DonutChart vendors={vendors} />

      {/* ── 잔금 임박 알림 ── */}
      {urgentVendors.length > 0 && (
        <div className="rounded-2xl px-4 py-3 mb-4 flex items-start gap-3"
          style={{ backgroundColor: 'var(--amber-light)', border: '1.5px solid var(--amber)' }}>
          <AlertTriangle size={16} color="var(--amber)" strokeWidth={2} style={{ flexShrink: 0, marginTop: 2 }} />
          <div>
            <p className="text-xs font-semibold mb-1" style={{ color: 'var(--amber)' }}>잔금 납부 임박</p>
            {urgentVendors.map(v => {
              const diff = Math.ceil((new Date(v.balance_due) - today) / (1000 * 60 * 60 * 24));
              return (
                <p key={v.id} className="text-xs" style={{ color: 'var(--ink-soft)' }}>
                  {v.name} — {diff === 0 ? '오늘!' : `D-${diff}`} ({(v.balance || 0).toLocaleString()}만원)
                </p>
              );
            })}
          </div>
        </div>
      )}

      {/* ── 필터 ── */}
      {vendors.length > 0 && (
        <>
          <div className="flex gap-2 overflow-x-auto pb-1 mb-2" style={{ scrollbarWidth: 'none' }}>
            <button onClick={() => setFilterType('all')}
              className="flex-shrink-0 px-3 py-1.5 rounded-xl text-xs font-semibold"
              style={{ backgroundColor: filterType === 'all' ? 'var(--rose-light)' : 'var(--beige)', color: filterType === 'all' ? 'var(--rose)' : 'var(--stone)', border: `1.5px solid ${filterType === 'all' ? 'var(--rose)' : 'transparent'}` }}>
              전체 {vendors.length}
            </button>
            {VENDOR_TYPES.filter(t => vendors.some(v => v.type === t.value)).map(t => (
              <button key={t.value} onClick={() => setFilterType(t.value)}
                className="flex-shrink-0 px-3 py-1.5 rounded-xl text-xs font-semibold"
                style={{ backgroundColor: filterType === t.value ? 'var(--rose-light)' : 'var(--beige)', color: filterType === t.value ? 'var(--rose)' : 'var(--stone)', border: `1.5px solid ${filterType === t.value ? 'var(--rose)' : 'transparent'}` }}>
                {t.label}
              </button>
            ))}
          </div>

          <div className="flex gap-2 overflow-x-auto pb-2 mb-3" style={{ scrollbarWidth: 'none' }}>
            <button onClick={() => setFilterStatus('all')}
              className="flex-shrink-0 px-3 py-1.5 rounded-xl text-xs font-semibold"
              style={{ backgroundColor: filterStatus === 'all' ? 'var(--ink)' : 'var(--beige)', color: filterStatus === 'all' ? 'white' : 'var(--stone)', border: 'none' }}>
              전체
            </button>
            {CONTRACT_STATUS.map(s => (
              <button key={s.value} onClick={() => setFilterStatus(s.value)}
                className="flex-shrink-0 px-3 py-1.5 rounded-xl text-xs font-semibold"
                style={{ backgroundColor: filterStatus === s.value ? s.bg : 'var(--beige)', color: filterStatus === s.value ? s.color : 'var(--stone)', border: `1.5px solid ${filterStatus === s.value ? s.color : 'transparent'}` }}>
                {s.label}
              </button>
            ))}
          </div>
        </>
      )}

      {/* ── 업체 목록 ── */}
      <div className="flex flex-col gap-3 mb-4">
        {filtered.length === 0 ? (
          <div className="card">
            <EmptyState
              icon={Store}
              title={vendors.length === 0 ? '아직 등록된 업체가 없어요' : '해당 조건의 업체가 없어요'}
              description={vendors.length === 0 ? '웨딩홀, 스튜디오, 드레스샵 등 계약 정보를 등록해보세요' : '다른 카테고리나 상태로 찾아보세요'}
              action={vendors.length === 0 ? { label: '첫 업체 추가하기', onClick: () => setShowForm(true) } : undefined}
            />
          </div>
        ) : (
          filtered.map(vendor => {
            const typeInfo = getTypeInfo(vendor.type);
            if (editingId === vendor.id) {
              return (
                <VendorForm key={vendor.id} form={editForm} setForm={setEditForm}
                  onSave={handleEdit}
                  onCancel={() => { setEditingId(null); setError(''); }}
                  saving={saving} error={error} title="업체 수정" />
              );
            }
            let balanceDday = null;
            if (vendor.balance_due && vendor.contract_status !== 'done') {
              balanceDday = Math.ceil((new Date(vendor.balance_due) - today) / (1000 * 60 * 60 * 24));
            }
            const vendorTotal = (vendor.deposit || 0) + (vendor.balance || 0);
            return (
              <div key={vendor.id} className="card relative" onClick={e => e.stopPropagation()}>
                <div className="flex items-start gap-3">
                  {/* 업체 유형 컬러 바 */}
                  <div className="flex-shrink-0 w-1 self-stretch rounded-full"
                    style={{ backgroundColor: typeInfo.color, minHeight: 40 }} />

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-0.5">
                      <p className="text-sm font-bold" style={{ color: 'var(--ink)' }}>{vendor.name}</p>
                      <StatusBadge value={vendor.contract_status} />
                    </div>
                    <p className="text-xs" style={{ color: 'var(--stone)' }}>
                      <span style={{ color: typeInfo.color, fontWeight: 600 }}>{typeInfo.label}</span>
                      {vendor.contact_name && ` · ${vendor.contact_name}`}
                      {vendor.contact_phone && ` · ${vendor.contact_phone}`}
                    </p>

                    {vendorTotal > 0 && (
                      <div className="flex items-baseline gap-3 mt-2">
                        {vendor.deposit != null && (
                          <div>
                            <p className="text-xs" style={{ color: 'var(--stone)' }}>계약금</p>
                            <p className="text-xs font-semibold tabular-nums" style={{ color: 'var(--ink)' }}>
                              {vendor.deposit.toLocaleString()}만원
                            </p>
                          </div>
                        )}
                        {vendor.balance != null && (
                          <div>
                            <p className="text-xs" style={{ color: 'var(--stone)' }}>잔금</p>
                            <p className="text-xs font-semibold tabular-nums" style={{ color: 'var(--ink)' }}>
                              {vendor.balance.toLocaleString()}만원
                            </p>
                          </div>
                        )}
                        {vendorTotal > 0 && (
                          <div>
                            <p className="text-xs" style={{ color: 'var(--stone)' }}>합계</p>
                            <p className="text-xs font-bold tabular-nums" style={{ color: 'var(--ink)' }}>
                              {vendorTotal.toLocaleString()}만원
                            </p>
                          </div>
                        )}
                        {vendor.balance_due && (
                          <div>
                            <p className="text-xs" style={{ color: 'var(--stone)' }}>납부일</p>
                            <p className="text-xs font-semibold tabular-nums"
                              style={{ color: balanceDday !== null && balanceDday <= 7 ? 'var(--amber)' : 'var(--ink)' }}>
                              {new Date(vendor.balance_due).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })}
                              {balanceDday !== null && (
                                <span className="ml-1">
                                  {balanceDday === 0 ? '(오늘!)' : balanceDday < 0 ? '(초과)' : `(D-${balanceDday})`}
                                </span>
                              )}
                            </p>
                          </div>
                        )}
                      </div>
                    )}

                    {vendor.memo && (
                      <p className="text-xs mt-1.5" style={{ color: 'var(--stone-light)' }}>{vendor.memo}</p>
                    )}
                  </div>

                  <button onClick={e => { e.stopPropagation(); setMenuId(menuId === vendor.id ? null : vendor.id); }}
                    className="flex-shrink-0 text-lg"
                    style={{ color: 'var(--stone)', background: 'none', border: 'none', cursor: 'pointer', padding: '0 2px' }}>
                    ···
                  </button>
                </div>

                {menuId === vendor.id && (
                  <div className="absolute right-0 z-10 rounded-xl shadow-lg overflow-hidden"
                    style={{ top: 40, backgroundColor: 'white', border: '1.5px solid var(--stone-light)', minWidth: 110 }}
                    onClick={e => e.stopPropagation()}>
                    <button className="w-full flex items-center gap-2 px-4 py-3 text-sm font-medium"
                      style={{ color: 'var(--ink)', background: 'none', border: 'none', cursor: 'pointer' }}
                      onClick={() => startEdit(vendor)}>
                      <Edit3 size={14} /> 수정
                    </button>
                    <div style={{ height: 1, backgroundColor: 'var(--beige)' }} />
                    <button className="w-full flex items-center gap-2 px-4 py-3 text-sm font-medium"
                      style={{ color: 'var(--rose)', background: 'none', border: 'none', cursor: 'pointer' }}
                      onClick={() => deleteVendor(vendor.id)}>
                      <Store size={14} /> 삭제
                    </button>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* ── 업체 추가 ── */}
      {showForm ? (
        <VendorForm form={form} setForm={setForm} onSave={handleAdd}
          onCancel={() => { setShowForm(false); setError(''); setForm(EMPTY_FORM); }}
          saving={saving} error={error} title="업체 추가" />
      ) : (
        <button className="btn-outline w-full" onClick={() => setShowForm(true)}>
          + 업체 추가
        </button>
      )}

      <BottomNav active="budget" />
    </div>
  );
}
