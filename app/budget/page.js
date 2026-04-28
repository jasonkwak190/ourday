'use client';

import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { useCouple } from '@/lib/useCouple';
import BottomNav from '@/components/BottomNav';
import EmptyState from '@/components/EmptyState';
import { Wallet, Store, AlertTriangle, Edit3, Download, Paperclip, X, FileText, Image as ImageIcon, Loader2 } from 'lucide-react';

/* ─── 업체 종류 ────────────────────────────────────────────────── */
const VENDOR_TYPES = [
  { value: 'hall',    label: '웨딩홀',    color: '#B89968' },
  { value: 'studio',  label: '스튜디오',  color: '#B57A7A' },
  { value: 'dress',   label: '드레스',    color: '#945E5E' },
  { value: 'makeup',  label: '메이크업',  color: '#B8914A' },
  { value: 'hanbok',  label: '한복',      color: '#7A8B6B' },
  { value: 'food',    label: '음식',      color: '#9C4A3A' },
  { value: 'flower',  label: '꽃장식',    color: '#CDB388' },
  { value: 'music',   label: '음향/영상', color: '#6E6459' },
  { value: 'travel',  label: '신혼여행',  color: '#3A332E' },
  { value: 'other',   label: '기타',      color: '#A79D90' },
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
          <circle cx={CX} cy={CY} r={R} fill="none" stroke="#E2D9C9" strokeWidth={30} />
          <g transform={`rotate(-90 ${CX} ${CY})`}>
            {segments.map((seg, i) => (
              <circle key={i} cx={CX} cy={CY} r={R} fill="none"
                stroke={seg.color} strokeWidth={30}
                strokeDasharray={`${seg.dash - 2} ${circumference - seg.dash + 2}`}
                strokeDashoffset={-seg.offset} strokeLinecap="butt" />
            ))}
          </g>
          <text x={CX} y={CY - 8} textAnchor="middle" fontSize={13} fill="#6E6459" fontFamily={FONT}>예상 합계</text>
          <text x={CX} y={CY + 12} textAnchor="middle" fontSize={17} fontWeight={700} fill="#1A1613" fontFamily={FONT}>
            {grandTotal.toLocaleString()}
          </text>
          <text x={CX} y={CY + 28} textAnchor="middle" fontSize={11} fill="#6E6459" fontFamily={FONT}>만원</text>
        </svg>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px 12px' }}>
        {segments.map((seg, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 7, minWidth: 0 }}>
            <div style={{ width: 10, height: 10, borderRadius: '50%', backgroundColor: seg.color, flexShrink: 0 }} />
            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 4 }}>
                <span style={{ fontSize: 12, color: 'var(--ink-2)', fontWeight: 500, whiteSpace: 'nowrap' }}>{seg.label}</span>
                <span style={{ fontSize: 12, color: 'var(--ink-3)', flexShrink: 0 }}>{Math.round(seg.ratio * 100)}%</span>
              </div>
              <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--ink)', margin: 0 }}>{seg.total.toLocaleString()}만원</p>
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

/* ─── 첨부파일 칩 + 업로드 버튼 ─────────────────────────────────── */
function VendorAttachments({ vendor, onUpload, onOpen, onRemove }) {
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef(null);
  const items = vendor.attachments || [];

  async function handleFiles(files) {
    if (!files || files.length === 0) return;
    setUploading(true);
    for (const f of files) await onUpload(vendor, f);
    setUploading(false);
    if (fileRef.current) fileRef.current.value = '';
  }

  return (
    <div className="mt-3" style={{ borderTop: '1px dashed var(--rule)', paddingTop: 10 }}>
      <div className="flex items-center justify-between mb-1.5">
        <p className="text-xs flex items-center gap-1" style={{ color: 'var(--stone)' }}>
          <Paperclip size={11} strokeWidth={2.2} />
          첨부 ({items.length})
        </p>
        <button
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          className="text-xs flex items-center gap-1"
          style={{
            background: 'none',
            border: '1px solid var(--rule-strong)',
            borderRadius: 999,
            padding: '3px 10px',
            cursor: uploading ? 'wait' : 'pointer',
            color: 'var(--ink-2)',
            fontWeight: 600,
          }}
        >
          {uploading ? <Loader2 size={11} className="animate-spin" /> : <Paperclip size={11} />}
          {uploading ? '업로드 중' : '파일 추가'}
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="image/*,application/pdf"
          multiple
          onChange={e => handleFiles(e.target.files)}
          style={{ display: 'none' }}
        />
      </div>
      {items.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {items.map((att) => (
            <div
              key={att.path}
              className="inline-flex items-center gap-1.5"
              style={{
                backgroundColor: 'var(--paper)',
                border: '1px solid var(--rule)',
                borderRadius: 8,
                padding: '4px 4px 4px 8px',
                maxWidth: '100%',
              }}
            >
              <button
                onClick={() => onOpen(att)}
                className="flex items-center gap-1.5 min-w-0"
                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: 'var(--ink-2)' }}
                title={att.name}
              >
                {(att.type || '').startsWith('image/')
                  ? <ImageIcon size={11} strokeWidth={2.2} style={{ flexShrink: 0 }} />
                  : <FileText size={11} strokeWidth={2.2} style={{ flexShrink: 0 }} />}
                <span
                  className="text-xs"
                  style={{
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    maxWidth: 140, display: 'inline-block',
                  }}
                >
                  {att.name}
                </span>
              </button>
              <button
                onClick={() => onRemove(att)}
                aria-label={`${att.name} 삭제`}
                style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  padding: 2, display: 'flex', alignItems: 'center',
                  color: 'var(--ink-4)',
                }}
              >
                <X size={11} strokeWidth={2.4} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ─── 메인 ────────────────────────────────────────────────────── */
export default function BudgetPage() {
  const today  = new Date();

  const { coupleId, loading: authLoading } = useCouple('couple_id');

  const [loading,     setLoading]     = useState(true);
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
  const [menuId,         setMenuId]         = useState(null);
  const [editingId,      setEditingId]      = useState(null);
  const [editForm,       setEditForm]       = useState(EMPTY_FORM);
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);

  // 필터
  const [filterType,   setFilterType]   = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');

  /* ─ 데이터 로드 ─ */
  useEffect(() => {
    if (authLoading) return;
    if (!coupleId) { setLoading(false); return; }
    const load = async () => {
      const [coupleRes, vendorRes] = await Promise.all([
        supabase.from('couples').select('total_budget').eq('id', coupleId).single(),
        supabase.from('vendors').select('id, type, name, contact_name, contact_phone, deposit, balance, balance_due, contract_status, memo, attachments, created_at').eq('couple_id', coupleId).order('created_at'),
      ]);
      setTotalBudget(coupleRes.data?.total_budget || 0);
      setVendors(vendorRes.data || []);
      setLoading(false);
    };
    load();
  }, [authLoading, coupleId]);

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

  /* ─ Excel 다운로드 (xlsx, 한글 헤더, 컬럼 너비 자동) ─ */
  async function downloadExcel() {
    if (vendors.length === 0) return;
    // xlsx는 600KB+로 큰 라이브러리 — 클릭 시점에만 lazy load
    const XLSX = await import('xlsx');
    const today = new Date().toISOString().slice(0, 10);
    const headers = ['종류', '업체명', '담당자', '연락처', '계약금(만원)', '잔금(만원)', '합계(만원)', '잔금일', '계약상태', '메모'];
    const rows = vendors.map(v => {
      const sum = (v.deposit || 0) + (v.balance || 0);
      return [
        getTypeInfo(v.type).label,
        v.name,
        v.contact_name || '',
        v.contact_phone || '',
        v.deposit ?? '',
        v.balance ?? '',
        sum || '',
        v.balance_due || '',
        getStatusInfo(v.contract_status).label,
        v.memo || '',
      ];
    });
    const totalDeposit = vendors.reduce((s, v) => s + (v.deposit || 0), 0);
    const totalBalance = vendors.reduce((s, v) => s + (v.balance || 0), 0);
    const totalSum     = totalDeposit + totalBalance;
    rows.push(['', '합계', '', '', totalDeposit, totalBalance, totalSum, '', '', '']);
    if (totalBudget > 0) {
      rows.push(['', '총 예산', '', '', '', '', totalBudget, '', '', '']);
      rows.push(['', '예산 대비', '', '', '', '', totalSum - totalBudget, '', '', totalSum > totalBudget ? '초과' : '여유']);
    }

    const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
    // 컬럼 너비
    ws['!cols'] = [
      { wch: 10 }, { wch: 20 }, { wch: 12 }, { wch: 16 },
      { wch: 14 }, { wch: 14 }, { wch: 14 }, { wch: 14 },
      { wch: 12 }, { wch: 24 },
    ];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, '예산·업체');
    XLSX.writeFile(wb, `ourday_budget_${today}.xlsx`);
  }

  /* ─ CSV 다운로드 (Excel 호환, 한글 BOM 포함) ─ */
  function downloadCSV() {
    if (vendors.length === 0) return;
    const escape = (s) => {
      const v = s == null ? '' : String(s);
      return /[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
    };
    const headers = ['종류', '업체명', '담당자', '연락처', '계약금(만원)', '잔금(만원)', '합계(만원)', '잔금일', '계약상태', '메모'];
    const rows = vendors.map(v => {
      const sum = (v.deposit || 0) + (v.balance || 0);
      return [
        getTypeInfo(v.type).label,
        v.name,
        v.contact_name || '',
        v.contact_phone || '',
        v.deposit ?? '',
        v.balance ?? '',
        sum || '',
        v.balance_due || '',
        getStatusInfo(v.contract_status).label,
        v.memo || '',
      ].map(escape).join(',');
    });
    // 합계 라인
    const totalDeposit  = vendors.reduce((s, v) => s + (v.deposit || 0), 0);
    const totalBalance  = vendors.reduce((s, v) => s + (v.balance || 0), 0);
    const totalSum      = totalDeposit + totalBalance;
    rows.push(['', '합계', '', '', totalDeposit, totalBalance, totalSum, '', '', ''].map(escape).join(','));
    if (totalBudget > 0) {
      rows.push(['', '총 예산', '', '', '', '', totalBudget, '', '', ''].map(escape).join(','));
      rows.push(['', '예산 대비', '', '', '', '', totalSum - totalBudget, '', '', totalSum > totalBudget ? '초과' : '여유'].map(escape).join(','));
    }
    const csv = '﻿' + [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const today = new Date().toISOString().slice(0, 10);
    a.download = `ourday_budget_${today}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

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
    const target = vendors.find(v => v.id === id);
    setVendors(prev => prev.filter(v => v.id !== id));
    // Storage 파일 정리 (실패해도 vendor는 삭제 — 고아 파일은 추후 cron 정리)
    const paths = (target?.attachments || []).map(a => a.path).filter(Boolean);
    if (paths.length > 0) {
      try { await supabase.storage.from('vendor-attachments').remove(paths); }
      catch { /* 무시 */ }
    }
    await supabase.from('vendors').delete().eq('id', id);
    setMenuId(null);
    setDeleteConfirmId(null);
  }

  /* ─ 첨부파일 추가 ─ */
  async function uploadAttachment(vendor, file) {
    if (!file || !coupleId || !vendor?.id) return null;
    if (file.size > 10 * 1024 * 1024) {
      alert('파일은 10MB 이하만 첨부할 수 있어요.');
      return null;
    }
    // 안전한 경로: {couple_id}/{vendor_id}/{timestamp}_{safe_name}
    const safeName = file.name.replace(/[^\w가-힣ㄱ-ㅎㅏ-ㅣ.\-]/g, '_').slice(0, 80);
    const path = `${coupleId}/${vendor.id}/${Date.now()}_${safeName}`;
    const { error: upErr } = await supabase.storage
      .from('vendor-attachments')
      .upload(path, file, { contentType: file.type, upsert: false });
    if (upErr) {
      alert('업로드에 실패했어요: ' + upErr.message);
      return null;
    }
    const meta = {
      path,
      name: file.name,
      size: file.size,
      type: file.type,
      uploaded_at: new Date().toISOString(),
    };
    const newList = [...(vendor.attachments || []), meta];
    const { error: updErr } = await supabase
      .from('vendors')
      .update({ attachments: newList })
      .eq('id', vendor.id);
    if (updErr) {
      // DB 업데이트 실패 시 storage 롤백
      await supabase.storage.from('vendor-attachments').remove([path]);
      alert('저장에 실패했어요. 다시 시도해주세요.');
      return null;
    }
    setVendors(prev => prev.map(v => v.id === vendor.id ? { ...v, attachments: newList } : v));
    return meta;
  }

  /* ─ 첨부파일 열기 (signed URL) ─ */
  async function openAttachment(att) {
    const { data, error: e } = await supabase.storage
      .from('vendor-attachments')
      .createSignedUrl(att.path, 60 * 5); // 5분
    if (e || !data?.signedUrl) {
      alert('파일을 열 수 없어요.');
      return;
    }
    window.open(data.signedUrl, '_blank', 'noopener,noreferrer');
  }

  /* ─ 첨부파일 삭제 ─ */
  async function removeAttachment(vendor, att) {
    const newList = (vendor.attachments || []).filter(a => a.path !== att.path);
    setVendors(prev => prev.map(v => v.id === vendor.id ? { ...v, attachments: newList } : v));
    const [storageRes, dbRes] = await Promise.all([
      supabase.storage.from('vendor-attachments').remove([att.path]),
      supabase.from('vendors').update({ attachments: newList }).eq('id', vendor.id),
    ]);
    if (storageRes.error || dbRes.error) {
      // 실패 시 롤백
      setVendors(prev => prev.map(v => v.id === vendor.id ? { ...v, attachments: vendor.attachments } : v));
      alert('삭제에 실패했어요.');
    }
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

  // 잔금 임박 (7일 이내) + 연체 (이미 지남)
  const urgentVendors = vendors.filter(v => {
    if (!v.balance_due || v.contract_status === 'done') return false;
    const diff = Math.ceil((new Date(v.balance_due) - today) / (1000 * 60 * 60 * 24));
    return diff <= 7; // 연체(음수) 포함
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
      <div className="mb-4 flex justify-between items-end">
        <div>
          <h1 style={{ fontFamily: 'var(--font-serif-ko)', fontWeight: 500, fontSize: 20, color: 'var(--ink)', margin: 0, letterSpacing: '-0.01em' }}>예산·업체</h1>
          <p style={{ fontFamily: 'var(--font-serif-en)', fontStyle: 'italic', fontSize: 12, color: 'var(--champagne-2)', margin: '2px 0 0', letterSpacing: '0.04em' }}>budget &amp; vendors</p>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            onClick={downloadExcel}
            disabled={vendors.length === 0}
            aria-label="예산 내역 Excel 다운로드"
            className="flex items-center gap-1.5"
            style={{
              background: vendors.length === 0 ? 'transparent' : 'var(--ink)',
              border: '1px solid var(--ink)',
              borderRadius: 999,
              padding: '6px 12px',
              cursor: vendors.length === 0 ? 'not-allowed' : 'pointer',
              color: vendors.length === 0 ? 'var(--ink-4)' : 'var(--ivory)',
              fontSize: 11,
              fontWeight: 600,
              letterSpacing: '0.02em',
              opacity: vendors.length === 0 ? 0.5 : 1,
            }}
          >
            <Download size={12} strokeWidth={2.2} />
            Excel
          </button>
          <button
            onClick={downloadCSV}
            disabled={vendors.length === 0}
            aria-label="예산 내역 CSV 다운로드"
            className="flex items-center gap-1.5"
            style={{
              background: 'none',
              border: '1px solid var(--rule-strong)',
              borderRadius: 999,
              padding: '6px 10px',
              cursor: vendors.length === 0 ? 'not-allowed' : 'pointer',
              color: vendors.length === 0 ? 'var(--ink-4)' : 'var(--ink-3)',
              fontSize: 11,
              fontWeight: 600,
              letterSpacing: '0.02em',
              opacity: vendors.length === 0 ? 0.5 : 1,
            }}
          >
            CSV
          </button>
        </div>
      </div>

      {/* ── 예산 초과 경고 ── */}
      {totalBudget > 0 && totalExpected > totalBudget && (
        <div className="flex items-start gap-3 mb-4 px-4 py-3 rounded-2xl"
          style={{ backgroundColor: '#FFF0F0', border: '1.5px solid var(--toss-red)' }}>
          <AlertTriangle size={18} color="var(--toss-red)" style={{ flexShrink: 0, marginTop: 1 }} />
          <div>
            <p className="text-sm font-semibold" style={{ color: 'var(--toss-red)' }}>예산 초과</p>
            <p className="text-xs mt-0.5" style={{ color: 'var(--toss-red)', opacity: 0.8 }}>
              예상 총액이 설정 예산보다{' '}
              <span className="font-bold">{(totalExpected - totalBudget).toLocaleString()}만원</span> 초과됐어요
            </p>
          </div>
        </div>
      )}

      {/* ── 잔금 D-7 긴급 경고 ── */}
      {urgentVendors.length > 0 && (
        <div className="flex items-start gap-3 mb-4 px-4 py-3 rounded-2xl"
          style={{ backgroundColor: '#FFFBEA', border: '1.5px solid var(--toss-yellow, #F5A623)' }}>
          <AlertTriangle size={18} color="var(--toss-yellow, #F5A623)" style={{ flexShrink: 0, marginTop: 1 }} />
          <div style={{ flex: 1 }}>
            <p className="text-sm font-semibold" style={{ color: '#8B6914' }}>잔금 마감 임박</p>
            {urgentVendors.map(v => {
              const diff = Math.ceil((new Date(v.balance_due) - today) / (1000 * 60 * 60 * 24));
              return (
                <p key={v.id} className="text-xs mt-0.5" style={{ color: '#8B6914' }}>
                  <span className="font-semibold">{v.name}</span> —{' '}
                  {diff < 0 ? `${Math.abs(diff)}일 연체` : diff === 0 ? '오늘 마감!' : `D-${diff}`}{' '}
                  ({(v.balance || 0).toLocaleString()}만원)
                </p>
              );
            })}
          </div>
        </div>
      )}

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

      {/* ── 잔금 임박·연체 알림 ── */}
      {urgentVendors.length > 0 && (() => {
        const overdue  = urgentVendors.filter(v => Math.ceil((new Date(v.balance_due) - today) / 86400000) < 0);
        const hasOverdue = overdue.length > 0;
        return (
          <div className="rounded-2xl px-4 py-3 mb-4 flex items-start gap-3"
            style={{ backgroundColor: hasOverdue ? 'var(--rose-light)' : 'var(--amber-light)', border: `1.5px solid ${hasOverdue ? 'var(--rose)' : 'var(--amber)'}` }}>
            <AlertTriangle size={16} color={hasOverdue ? 'var(--rose)' : 'var(--amber)'} strokeWidth={2} style={{ flexShrink: 0, marginTop: 2 }} />
            <div>
              <p className="text-xs font-semibold mb-1" style={{ color: hasOverdue ? 'var(--rose)' : 'var(--amber)' }}>
                {hasOverdue ? `잔금 연체 ${overdue.length}건 포함` : '잔금 납부 임박'}
              </p>
              {urgentVendors.map(v => {
                const diff = Math.ceil((new Date(v.balance_due) - today) / 86400000);
                const isLate = diff < 0;
                return (
                  <p key={v.id} className="text-xs" style={{ color: isLate ? 'var(--rose)' : 'var(--ink-soft)', fontWeight: isLate ? 600 : 400 }}>
                    {v.name} — {isLate ? `${Math.abs(diff)}일 연체` : diff === 0 ? '오늘 마감!' : `D-${diff}`} ({(v.balance || 0).toLocaleString()}만원)
                  </p>
                );
              })}
            </div>
          </div>
        );
      })()}

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

                <VendorAttachments
                  vendor={vendor}
                  onUpload={uploadAttachment}
                  onOpen={openAttachment}
                  onRemove={att => removeAttachment(vendor, att)}
                />

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
                      onClick={() => { setDeleteConfirmId(vendor.id); setMenuId(null); }}>
                      <Store size={14} /> 삭제
                    </button>
                  </div>
                )}

                {/* 삭제 확인 모달 */}
                {deleteConfirmId === vendor.id && (
                  <div className="absolute right-0 left-0 z-20 rounded-2xl p-4"
                    style={{ top: 0, backgroundColor: 'white', border: '1.5px solid var(--rose-light)', boxShadow: '0 4px 20px rgba(0,0,0,0.12)' }}
                    onClick={e => e.stopPropagation()}>
                    <p className="text-sm font-semibold mb-1" style={{ color: 'var(--ink)' }}>업체를 삭제할까요?</p>
                    <p className="text-xs mb-3" style={{ color: 'var(--stone)' }}>
                      <span className="font-medium">{vendor.name}</span> 정보가 영구 삭제돼요
                    </p>
                    <div className="flex gap-2">
                      <button className="btn-outline flex-1 text-sm"
                        style={{ height: 40 }}
                        onClick={() => setDeleteConfirmId(null)}>취소</button>
                      <button className="flex-1 text-sm font-semibold rounded-xl"
                        style={{ height: 40, backgroundColor: 'var(--rose)', color: 'white', border: 'none', cursor: 'pointer' }}
                        onClick={() => deleteVendor(vendor.id)}>삭제</button>
                    </div>
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
