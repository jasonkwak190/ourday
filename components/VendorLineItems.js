'use client';
import { useState, useEffect, useRef } from 'react';
import { Plus, X, ChevronDown, Receipt } from 'lucide-react';
import { buildDefaultLineItems, sumLineItems } from '@/lib/vendorLineTemplates';

/**
 * 업체 세부 라인 편집 (vendor 카드 안에서 expand)
 *
 * Props:
 *   vendorId: string
 *   vendorType: hall|studio|...
 *   lineItems: array (DB의 line_items)
 *   onSave: (newItems) => Promise<void>  — Supabase 업데이트는 부모가 처리
 *
 * UX:
 *   - 라인 0개 + expand → 디폴트 템플릿 자동 채움 (한 번만)
 *   - 각 라인: 라벨 input + 금액 input + X 삭제
 *   - + 항목 추가 (custom)
 *   - 합계 표시
 *   - blur 시 저장 (디바운스)
 */
export default function VendorLineItems({ vendorId, vendorType, lineItems, onSave }) {
  const [expanded, setExpanded] = useState(false);
  const [items, setItems] = useState(lineItems || []);
  const [savingError, setSavingError] = useState('');
  const saveTimer = useRef(null);

  // 부모 prop 변경 시 동기화 (Realtime 등)
  useEffect(() => { setItems(lineItems || []); }, [lineItems]);

  // 첫 expand 시 라인 0개 + 디폴트 있으면 자동 채움
  function handleExpand() {
    setExpanded((prev) => {
      const next = !prev;
      if (next && items.length === 0) {
        const defaults = buildDefaultLineItems(vendorType);
        if (defaults.length > 0) {
          setItems(defaults);
          scheduleSave(defaults);
        }
      }
      return next;
    });
  }

  function scheduleSave(nextItems) {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      try {
        setSavingError('');
        await onSave(nextItems);
      } catch (e) {
        setSavingError('저장 실패');
        console.error('[VendorLineItems] save:', e.message);
      }
    }, 600);
  }

  function update(id, field, value) {
    const next = items.map((it) => it.id === id ? { ...it, [field]: value } : it);
    setItems(next);
    scheduleSave(next);
  }

  function remove(id) {
    const next = items.filter((it) => it.id !== id);
    setItems(next);
    scheduleSave(next);
  }

  function addCustom() {
    const newItem = {
      id: `custom-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      label: '',
      amount: 0,
      source: 'custom',
    };
    const next = [...items, newItem];
    setItems(next);
    scheduleSave(next);
  }

  const total = sumLineItems(items);
  const filledCount = items.filter((i) => Number(i.amount) > 0).length;

  return (
    <div style={{ marginTop: 10, borderTop: '1px dashed var(--rule)', paddingTop: 8 }}>
      {/* 토글 헤더 */}
      <button
        onClick={handleExpand}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '6px 0', background: 'none', border: 'none', cursor: 'pointer',
        }}
      >
        <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <Receipt size={12} color="var(--ink-3)" strokeWidth={2.2} />
          <span style={{ fontSize: 11, color: 'var(--ink-3)' }}>
            세부 내역 {filledCount > 0 && `(${filledCount})`}
          </span>
          {total > 0 && (
            <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--ink-2)', marginLeft: 4 }}>
              · 합 {total.toLocaleString()}만
            </span>
          )}
        </span>
        <ChevronDown
          size={14} color="var(--ink-3)"
          style={{ transition: 'transform 0.2s', transform: expanded ? 'rotate(0)' : 'rotate(-90deg)' }}
        />
      </button>

      {expanded && (
        <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 6 }}>
          {items.length === 0 && (
            <p style={{ fontSize: 11, color: 'var(--ink-4)', textAlign: 'center', padding: 8 }}>
              세부 항목이 없어요. 아래 버튼으로 추가하세요.
            </p>
          )}

          {items.map((it) => (
            <div
              key={it.id}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '6px 8px', borderRadius: 8,
                backgroundColor: 'var(--paper)',
                border: '1px solid var(--rule)',
              }}
            >
              {/* 라벨 input */}
              <input
                aria-label="항목명"
                type="text"
                value={it.label}
                onChange={(e) => update(it.id, 'label', e.target.value)}
                placeholder="항목명"
                readOnly={it.source === 'default'}
                style={{
                  flex: 1, minWidth: 0,
                  border: 'none', background: 'transparent',
                  fontSize: 12, color: 'var(--ink)',
                  fontWeight: it.source === 'default' ? 500 : 400,
                  padding: '2px 4px',
                  outline: 'none',
                }}
              />
              {/* 금액 input */}
              <input
                aria-label={`${it.label || '항목'} 금액 (만원)`}
                type="number"
                value={it.amount === 0 ? '' : it.amount}
                onChange={(e) => update(it.id, 'amount', parseInt(e.target.value, 10) || 0)}
                placeholder="0"
                style={{
                  width: 70, textAlign: 'right',
                  border: 'none', background: 'transparent',
                  fontSize: 12, color: 'var(--ink)',
                  padding: '2px 4px',
                  outline: 'none',
                }}
                className="tabular-nums"
              />
              <span style={{ fontSize: 11, color: 'var(--ink-3)', flexShrink: 0 }}>만</span>
              {/* 삭제 버튼 */}
              <button
                onClick={() => remove(it.id)}
                aria-label={`${it.label || '항목'} 삭제`}
                style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  padding: 2, display: 'flex', alignItems: 'center',
                  color: 'var(--ink-4)',
                  flexShrink: 0,
                }}
              >
                <X size={11} strokeWidth={2.2} />
              </button>
            </div>
          ))}

          {/* + 항목 추가 */}
          <button
            onClick={addCustom}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4,
              padding: '6px 8px', borderRadius: 8,
              background: 'none',
              border: '1px dashed var(--rule-strong)',
              cursor: 'pointer',
              fontSize: 11, color: 'var(--ink-3)',
              fontWeight: 500,
            }}
          >
            <Plus size={11} strokeWidth={2.2} />
            항목 추가
          </button>

          {savingError && (
            <p style={{ fontSize: 10, color: 'var(--toss-red)', textAlign: 'right' }}>
              {savingError}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
