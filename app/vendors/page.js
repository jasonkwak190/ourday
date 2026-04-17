'use client';

export const dynamic = 'force-dynamic';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import BottomNav from '@/components/BottomNav';

const VENDOR_TYPES = [
  { value: 'hall',      label: '웨딩홀',   icon: '🏛️' },
  { value: 'studio',   label: '스튜디오', icon: '📸' },
  { value: 'dress',    label: '드레스',   icon: '👗' },
  { value: 'makeup',   label: '메이크업', icon: '💄' },
  { value: 'hanbok',   label: '한복',     icon: '👘' },
  { value: 'food',     label: '음식',     icon: '🍽️' },
  { value: 'flower',   label: '꽃장식',   icon: '💐' },
  { value: 'music',    label: '음향/영상', icon: '🎵' },
  { value: 'travel',   label: '신혼여행', icon: '✈️' },
  { value: 'other',    label: '기타',     icon: '📋' },
];

const CONTRACT_STATUS = [
  { value: 'candidate', label: '후보', color: 'var(--stone)',      bg: 'var(--beige)' },
  { value: 'pending',   label: '미계약', color: 'var(--amber)',    bg: 'var(--amber-light)' },
  { value: 'signed',    label: '계약완료', color: 'var(--green)',  bg: 'var(--green-light)' },
  { value: 'balance',   label: '잔금대기', color: 'var(--rose)',   bg: 'var(--rose-light)' },
  { value: 'done',      label: '완납',  color: 'var(--purple)',    bg: 'var(--purple-light)' },
];

const EMPTY_FORM = {
  type: 'hall',
  name: '',
  contact_name: '',
  contact_phone: '',
  deposit: '',
  balance: '',
  balance_due: '',
  contract_status: 'candidate',
  memo: '',
};

function getTypeInfo(value) {
  return VENDOR_TYPES.find((t) => t.value === value) || VENDOR_TYPES[VENDOR_TYPES.length - 1];
}

function getStatusInfo(value) {
  return CONTRACT_STATUS.find((s) => s.value === value) || CONTRACT_STATUS[0];
}

function StatusTag({ value }) {
  const s = getStatusInfo(value);
  return (
    <span
      className="text-xs font-medium px-2 py-0.5 rounded-full flex-shrink-0"
      style={{ color: s.color, backgroundColor: s.bg }}
    >
      {s.label}
    </span>
  );
}

function VendorForm({ form, setForm, onSave, onCancel, saving, error, title }) {
  return (
    <div className="card flex flex-col gap-3">
      <p className="text-sm font-semibold" style={{ color: 'var(--ink)' }}>{title}</p>

      {/* 업체 종류 */}
      <div className="grid grid-cols-5 gap-1.5">
        {VENDOR_TYPES.map((t) => (
          <button
            key={t.value}
            onClick={() => setForm((f) => ({ ...f, type: t.value }))}
            className="py-2 rounded-xl text-xs font-medium flex flex-col items-center gap-0.5"
            style={{
              backgroundColor: form.type === t.value ? 'var(--rose-light)' : 'var(--beige)',
              color: form.type === t.value ? 'var(--rose)' : 'var(--stone)',
              border: `1.5px solid ${form.type === t.value ? 'var(--rose)' : 'transparent'}`,
            }}
          >
            <span className="text-base">{t.icon}</span>
            <span className="leading-none">{t.label}</span>
          </button>
        ))}
      </div>

      <input className="input-field" placeholder="업체명 *" value={form.name}
        onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />

      <div className="flex gap-2">
        <input className="input-field flex-1" placeholder="담당자 이름" value={form.contact_name}
          onChange={(e) => setForm((f) => ({ ...f, contact_name: e.target.value }))} />
        <input className="input-field flex-1" placeholder="연락처" value={form.contact_phone}
          onChange={(e) => setForm((f) => ({ ...f, contact_phone: e.target.value }))} />
      </div>

      <div className="flex gap-2">
        <div className="flex-1">
          <p className="text-xs mb-1" style={{ color: 'var(--stone)' }}>계약금 (만원)</p>
          <input className="input-field" type="number" placeholder="0" value={form.deposit}
            onChange={(e) => setForm((f) => ({ ...f, deposit: e.target.value }))} />
        </div>
        <div className="flex-1">
          <p className="text-xs mb-1" style={{ color: 'var(--stone)' }}>잔금 (만원)</p>
          <input className="input-field" type="number" placeholder="0" value={form.balance}
            onChange={(e) => setForm((f) => ({ ...f, balance: e.target.value }))} />
        </div>
      </div>

      <div>
        <p className="text-xs mb-1" style={{ color: 'var(--stone)' }}>잔금 납부일</p>
        <input className="input-field" type="date" value={form.balance_due}
          onChange={(e) => setForm((f) => ({ ...f, balance_due: e.target.value }))} />
      </div>

      {/* 계약 상태 */}
      <div>
        <p className="text-xs mb-2" style={{ color: 'var(--stone)' }}>계약 상태</p>
        <div className="flex flex-wrap gap-2">
          {CONTRACT_STATUS.map((s) => (
            <button
              key={s.value}
              onClick={() => setForm((f) => ({ ...f, contract_status: s.value }))}
              className="px-3 py-1.5 rounded-xl text-xs font-medium"
              style={{
                backgroundColor: form.contract_status === s.value ? s.bg : 'var(--beige)',
                color: form.contract_status === s.value ? s.color : 'var(--stone)',
                border: `1.5px solid ${form.contract_status === s.value ? s.color : 'transparent'}`,
              }}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      <input className="input-field" placeholder="메모 (선택)" value={form.memo}
        onChange={(e) => setForm((f) => ({ ...f, memo: e.target.value }))} />

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

export default function VendorsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [coupleId, setCoupleId] = useState(null);
  const [vendors, setVendors] = useState([]);

  // 필터
  const [filterType, setFilterType] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');

  // 추가/수정 폼
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

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

      const { data } = await supabase
        .from('vendors')
        .select('*')
        .eq('couple_id', cId)
        .order('created_at');

      setVendors(data || []);
      setLoading(false);
    };
    load();
  }, [router]);

  // Realtime
  useEffect(() => {
    if (!coupleId) return;
    const channel = supabase
      .channel(`vendors-${coupleId}`)
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'vendors',
        filter: `couple_id=eq.${coupleId}`,
      }, (payload) => {
        if (payload.eventType === 'INSERT') {
          setVendors((prev) => prev.find((v) => v.id === payload.new.id) ? prev : [...prev, payload.new]);
        } else if (payload.eventType === 'UPDATE') {
          setVendors((prev) => prev.map((v) => v.id === payload.new.id ? payload.new : v));
        } else if (payload.eventType === 'DELETE') {
          setVendors((prev) => prev.filter((v) => v.id !== payload.old.id));
        }
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [coupleId]);

  async function handleAdd() {
    setError('');
    if (!form.name.trim()) { setError('업체명을 입력해주세요.'); return; }
    setSaving(true);
    const { data, error: e } = await supabase
      .from('vendors')
      .insert({
        couple_id: coupleId,
        type: form.type,
        name: form.name.trim(),
        contact_name: form.contact_name.trim() || null,
        contact_phone: form.contact_phone.trim() || null,
        deposit: form.deposit ? parseInt(form.deposit, 10) : null,
        balance: form.balance ? parseInt(form.balance, 10) : null,
        balance_due: form.balance_due || null,
        contract_status: form.contract_status,
        memo: form.memo.trim() || null,
      })
      .select().single();
    if (e) { setError('추가에 실패했어요.'); setSaving(false); return; }
    setVendors((prev) => [...prev, data]);
    setForm(EMPTY_FORM);
    setShowForm(false);
    setSaving(false);
  }

  function startEdit(vendor) {
    setEditingId(vendor.id);
    setEditForm({
      type: vendor.type,
      name: vendor.name,
      contact_name: vendor.contact_name || '',
      contact_phone: vendor.contact_phone || '',
      deposit: vendor.deposit != null ? String(vendor.deposit) : '',
      balance: vendor.balance != null ? String(vendor.balance) : '',
      balance_due: vendor.balance_due || '',
      contract_status: vendor.contract_status || 'candidate',
      memo: vendor.memo || '',
    });
    setMenuId(null);
  }

  async function handleEdit() {
    setError('');
    if (!editForm.name.trim()) { setError('업체명을 입력해주세요.'); return; }
    setSaving(true);
    const updates = {
      type: editForm.type,
      name: editForm.name.trim(),
      contact_name: editForm.contact_name.trim() || null,
      contact_phone: editForm.contact_phone.trim() || null,
      deposit: editForm.deposit ? parseInt(editForm.deposit, 10) : null,
      balance: editForm.balance ? parseInt(editForm.balance, 10) : null,
      balance_due: editForm.balance_due || null,
      contract_status: editForm.contract_status,
      memo: editForm.memo.trim() || null,
    };
    const { error: e } = await supabase.from('vendors').update(updates).eq('id', editingId);
    if (!e) setVendors((prev) => prev.map((v) => v.id === editingId ? { ...v, ...updates } : v));
    setEditingId(null);
    setSaving(false);
  }

  async function deleteVendor(id) {
    setVendors((prev) => prev.filter((v) => v.id !== id));
    await supabase.from('vendors').delete().eq('id', id);
    setMenuId(null);
  }

  if (loading) {
    return (
      <div className="page-wrapper flex items-center justify-center">
        <p className="text-sm" style={{ color: 'var(--stone)' }}>불러오는 중...</p>
      </div>
    );
  }

  // 잔금 임박 (7일 이내)
  const today = new Date();
  const urgentVendors = vendors.filter((v) => {
    if (!v.balance_due || v.contract_status === 'done') return false;
    const due = new Date(v.balance_due);
    const diff = Math.ceil((due - today) / (1000 * 60 * 60 * 24));
    return diff >= 0 && diff <= 7;
  });

  // 필터 적용
  const filtered = vendors.filter((v) => {
    const typeOk = filterType === 'all' || v.type === filterType;
    const statusOk = filterStatus === 'all' || v.contract_status === filterStatus;
    return typeOk && statusOk;
  });

  // 계약 현황 집계
  const signedCount = vendors.filter((v) => ['signed', 'balance', 'done'].includes(v.contract_status)).length;
  const totalDeposit = vendors.reduce((s, v) => s + (v.deposit || 0), 0);
  const totalBalance = vendors.reduce((s, v) => s + (v.balance || 0), 0);

  return (
    <div className="page-wrapper" onClick={() => setMenuId(null)}>
      <h1 className="text-xl font-semibold mb-4" style={{ color: 'var(--ink)' }}>
        🏢 업체 관리
      </h1>

      {/* 잔금 임박 알림 */}
      {urgentVendors.length > 0 && (
        <div
          className="rounded-2xl px-4 py-3 mb-4 flex items-start gap-2"
          style={{ backgroundColor: 'var(--amber-light)', border: '1.5px solid var(--amber)' }}
        >
          <span>⚠️</span>
          <div>
            <p className="text-xs font-semibold" style={{ color: 'var(--amber)' }}>잔금 납부 임박</p>
            {urgentVendors.map((v) => {
              const due = new Date(v.balance_due);
              const diff = Math.ceil((due - today) / (1000 * 60 * 60 * 24));
              return (
                <p key={v.id} className="text-xs mt-0.5" style={{ color: 'var(--ink-soft)' }}>
                  {v.name} — {diff === 0 ? '오늘!' : `D-${diff}`} ({v.balance?.toLocaleString()}만원)
                </p>
              );
            })}
          </div>
        </div>
      )}

      {/* 요약 카드 */}
      <div className="card mb-4">
        <div className="grid grid-cols-3 gap-3 text-center">
          <div>
            <p className="text-xs mb-1" style={{ color: 'var(--stone)' }}>등록 업체</p>
            <p className="text-xl font-bold" style={{ color: 'var(--ink)' }}>{vendors.length}개</p>
          </div>
          <div>
            <p className="text-xs mb-1" style={{ color: 'var(--stone)' }}>계약 완료</p>
            <p className="text-xl font-bold" style={{ color: 'var(--green)' }}>{signedCount}개</p>
          </div>
          <div>
            <p className="text-xs mb-1" style={{ color: 'var(--stone)' }}>총 잔금</p>
            <p className="text-xl font-bold" style={{ color: 'var(--rose)' }}>{totalBalance.toLocaleString()}만원</p>
          </div>
        </div>
      </div>

      {/* 종류 필터 */}
      <div className="flex gap-2 overflow-x-auto pb-1 mb-2" style={{ scrollbarWidth: 'none' }}>
        <button
          onClick={() => setFilterType('all')}
          className="flex-shrink-0 px-3 py-1.5 rounded-xl text-xs font-medium"
          style={{
            backgroundColor: filterType === 'all' ? 'var(--rose-light)' : 'var(--beige)',
            color: filterType === 'all' ? 'var(--rose)' : 'var(--stone)',
            border: `1.5px solid ${filterType === 'all' ? 'var(--rose)' : 'transparent'}`,
          }}
        >전체 {vendors.length}</button>
        {VENDOR_TYPES.filter((t) => vendors.some((v) => v.type === t.value)).map((t) => (
          <button
            key={t.value}
            onClick={() => setFilterType(t.value)}
            className="flex-shrink-0 px-3 py-1.5 rounded-xl text-xs font-medium"
            style={{
              backgroundColor: filterType === t.value ? 'var(--rose-light)' : 'var(--beige)',
              color: filterType === t.value ? 'var(--rose)' : 'var(--stone)',
              border: `1.5px solid ${filterType === t.value ? 'var(--rose)' : 'transparent'}`,
            }}
          >
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {/* 상태 필터 */}
      <div className="flex gap-2 overflow-x-auto pb-2 mb-3" style={{ scrollbarWidth: 'none' }}>
        <button
          onClick={() => setFilterStatus('all')}
          className="flex-shrink-0 px-3 py-1.5 rounded-xl text-xs font-medium"
          style={{
            backgroundColor: filterStatus === 'all' ? 'var(--ink)' : 'var(--beige)',
            color: filterStatus === 'all' ? 'white' : 'var(--stone)',
            border: 'none',
          }}
        >전체</button>
        {CONTRACT_STATUS.map((s) => (
          <button
            key={s.value}
            onClick={() => setFilterStatus(s.value)}
            className="flex-shrink-0 px-3 py-1.5 rounded-xl text-xs font-medium"
            style={{
              backgroundColor: filterStatus === s.value ? s.bg : 'var(--beige)',
              color: filterStatus === s.value ? s.color : 'var(--stone)',
              border: `1.5px solid ${filterStatus === s.value ? s.color : 'transparent'}`,
            }}
          >
            {s.label}
          </button>
        ))}
      </div>

      {/* 목록 */}
      <div className="flex flex-col gap-3 mb-4">
        {filtered.length === 0 ? (
          <div className="card text-center py-8">
            <p className="text-2xl mb-2">🏢</p>
            <p className="text-sm" style={{ color: 'var(--stone)' }}>
              {vendors.length === 0 ? '아직 등록된 업체가 없어요' : '해당 조건의 업체가 없어요'}
            </p>
          </div>
        ) : (
          filtered.map((vendor) => {
            const typeInfo = getTypeInfo(vendor.type);
            const isEditing = editingId === vendor.id;
            const isMenuOpen = menuId === vendor.id;

            if (isEditing) {
              return (
                <VendorForm
                  key={vendor.id}
                  form={editForm}
                  setForm={setEditForm}
                  onSave={handleEdit}
                  onCancel={() => { setEditingId(null); setError(''); }}
                  saving={saving}
                  error={error}
                  title="업체 수정"
                />
              );
            }

            // 잔금 D-day 계산
            let balanceDday = null;
            if (vendor.balance_due && vendor.contract_status !== 'done') {
              const due = new Date(vendor.balance_due);
              const diff = Math.ceil((due - today) / (1000 * 60 * 60 * 24));
              balanceDday = diff;
            }

            return (
              <div
                key={vendor.id}
                className="card relative"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-start gap-3">
                  <span className="text-2xl flex-shrink-0 mt-0.5">{typeInfo.icon}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-semibold" style={{ color: 'var(--ink)' }}>{vendor.name}</p>
                      <StatusTag value={vendor.contract_status} />
                    </div>
                    <p className="text-xs mt-0.5" style={{ color: 'var(--stone)' }}>
                      {typeInfo.label}
                      {vendor.contact_name && ` · ${vendor.contact_name}`}
                      {vendor.contact_phone && ` · ${vendor.contact_phone}`}
                    </p>

                    {/* 금액 정보 */}
                    {(vendor.deposit != null || vendor.balance != null) && (
                      <div className="flex gap-3 mt-1.5">
                        {vendor.deposit != null && (
                          <div>
                            <p className="text-xs" style={{ color: 'var(--stone-light)' }}>계약금</p>
                            <p className="text-xs font-medium" style={{ color: 'var(--ink-soft)' }}>
                              {vendor.deposit.toLocaleString()}만원
                            </p>
                          </div>
                        )}
                        {vendor.balance != null && (
                          <div>
                            <p className="text-xs" style={{ color: 'var(--stone-light)' }}>잔금</p>
                            <p className="text-xs font-medium" style={{ color: 'var(--rose)' }}>
                              {vendor.balance.toLocaleString()}만원
                            </p>
                          </div>
                        )}
                        {vendor.balance_due && (
                          <div>
                            <p className="text-xs" style={{ color: 'var(--stone-light)' }}>납부일</p>
                            <p
                              className="text-xs font-medium"
                              style={{
                                color: balanceDday !== null && balanceDday <= 7
                                  ? 'var(--amber)'
                                  : 'var(--ink-soft)',
                              }}
                            >
                              {new Date(vendor.balance_due).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })}
                              {balanceDday !== null && (
                                <span className="ml-1">
                                  ({balanceDday === 0 ? '오늘!' : balanceDday < 0 ? '기한 초과' : `D-${balanceDday}`})
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

                  <button
                    onClick={(e) => { e.stopPropagation(); setMenuId(isMenuOpen ? null : vendor.id); }}
                    className="text-lg flex-shrink-0"
                    style={{ color: 'var(--stone)', background: 'none', border: 'none', cursor: 'pointer', padding: '0 2px' }}
                  >
                    ···
                  </button>
                </div>

                {isMenuOpen && (
                  <div
                    className="absolute right-0 z-10 rounded-xl shadow-lg overflow-hidden"
                    style={{ top: '40px', backgroundColor: 'white', border: '1.5px solid var(--stone-light)', minWidth: '110px' }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <button
                      className="w-full text-left px-4 py-3 text-sm font-medium"
                      style={{ color: 'var(--ink)', background: 'none', border: 'none', cursor: 'pointer' }}
                      onClick={() => startEdit(vendor)}
                    >
                      ✏️ 수정
                    </button>
                    <div style={{ height: '1px', backgroundColor: 'var(--beige)' }} />
                    <button
                      className="w-full text-left px-4 py-3 text-sm font-medium"
                      style={{ color: 'var(--rose)', background: 'none', border: 'none', cursor: 'pointer' }}
                      onClick={() => deleteVendor(vendor.id)}
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
        <div className="mb-4">
          <VendorForm
            form={form}
            setForm={setForm}
            onSave={handleAdd}
            onCancel={() => { setShowForm(false); setError(''); setForm(EMPTY_FORM); }}
            saving={saving}
            error={error}
            title="업체 추가"
          />
        </div>
      ) : (
        <button className="btn-outline w-full mb-4" onClick={() => setShowForm(true)}>
          + 업체 추가
        </button>
      )}

      <BottomNav active="vendors" />
    </div>
  );
}
