'use client';
import { useState, useEffect, useRef, useMemo } from 'react';
import { Plus, X, Star, ExternalLink, Table2, ChevronDown, ChevronUp, Crown, Check } from 'lucide-react';
import Icon from '@/components/Icon';

/**
 * 의사결정 — 후보 비교 보드 (3-way)
 *
 * Props:
 *   decisionId: string
 *   candidates: array (DB의 decisions.candidates jsonb)
 *   myRole: 'groom' | 'bride' | null
 *   onSave: (newCandidates) => Promise<void>
 *   onPickFinal: (candidateName) => void   // 후보를 최종 결정으로 promote
 *
 * 데이터 구조:
 *   { id, name, price, note, url, groom_score, bride_score }
 */

const SCORE_MAX = 5;

function emptyCandidate() {
  return {
    id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `c-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    name: '',
    price: null,
    note: '',
    url: '',
    groom_score: null,
    bride_score: null,
  };
}

/* 별점 1~5 — myRole 본인 칸만 클릭 가능 */
function ScoreStars({ value, onChange, readOnly = false, color = 'var(--champagne-2)' }) {
  return (
    <div style={{ display: 'inline-flex', gap: 1 }}>
      {Array.from({ length: SCORE_MAX }, (_, i) => {
        const n = i + 1;
        const filled = value && n <= value;
        return (
          <button
            key={n}
            type="button"
            onClick={readOnly ? undefined : () => onChange(value === n ? null : n)}
            aria-label={`${n}점`}
            style={{
              padding: 1, background: 'none', border: 'none',
              cursor: readOnly ? 'default' : 'pointer',
              lineHeight: 0,
            }}
          >
            <Star
              size={14}
              strokeWidth={1.5}
              style={{
                color: filled ? color : 'var(--ink-5, #c8c1b6)',
                fill: filled ? color : 'transparent',
              }}
            />
          </button>
        );
      })}
    </div>
  );
}

export default function CandidateBoard({ decisionId, candidates, myRole, onSave, onPickFinal, finalDecision }) {
  const initial = Array.isArray(candidates) ? candidates : [];
  const [expanded, setExpanded] = useState(initial.length > 0);
  const [items, setItems] = useState(initial);
  const [showCompareModal, setShowCompareModal] = useState(false);
  const [savingErr, setSavingErr] = useState('');
  const saveTimer = useRef(null);

  // 부모 prop 변경 동기화 (Realtime)
  useEffect(() => { setItems(Array.isArray(candidates) ? candidates : []); }, [candidates]);

  function scheduleSave(next) {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      try {
        setSavingErr('');
        await onSave(next);
      } catch (e) {
        setSavingErr('저장 실패 — 다시 시도해주세요');
      }
    }, 500);
  }

  function updateItem(id, patch) {
    const next = items.map((c) => (c.id === id ? { ...c, ...patch } : c));
    setItems(next);
    scheduleSave(next);
  }

  function addItem() {
    if (items.length >= 5) return; // 후보 5개 제한 (UX 한계)
    const next = [...items, emptyCandidate()];
    setItems(next);
    scheduleSave(next);
    setExpanded(true);
  }

  function deleteItem(id) {
    const next = items.filter((c) => c.id !== id);
    setItems(next);
    scheduleSave(next);
  }

  /* 평균 점수 (양쪽 모두 매겼을 때만) */
  function avgScore(c) {
    const vals = [c.groom_score, c.bride_score].filter((v) => typeof v === 'number');
    if (vals.length === 0) return null;
    return (vals.reduce((s, v) => s + v, 0) / vals.length).toFixed(1);
  }

  /* 추천 후보 — 평균 점수 최고 (동률 시 첫 번째) */
  const recommendedId = useMemo(() => {
    let best = null;
    let bestVal = -1;
    items.forEach((c) => {
      const a = avgScore(c);
      if (a !== null && parseFloat(a) > bestVal) {
        bestVal = parseFloat(a);
        best = c.id;
      }
    });
    return best;
  }, [items]);

  /* 결정된 후보 — final_decision과 이름이 일치하는 후보 ID */
  const chosenId = useMemo(() => {
    const f = (finalDecision || '').trim();
    if (!f) return null;
    const match = items.find((c) => (c.name || '').trim() === f);
    return match ? match.id : null;
  }, [items, finalDecision]);

  /* 토글 헤더 (후보 0개일 때도 노출 — 추가 진입점) */
  if (items.length === 0 && !expanded) {
    return (
      <button
        onClick={() => { setExpanded(true); addItem(); }}
        style={{
          width: '100%', marginTop: 8,
          padding: '10px 14px', borderRadius: 12,
          border: '1px dashed var(--rule-strong)',
          backgroundColor: 'transparent',
          color: 'var(--ink-3)',
          fontSize: 12, fontWeight: 600,
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
          cursor: 'pointer',
        }}
      >
        <Plus size={14} strokeWidth={2} />
        후보 비교 추가 (A/B/C)
      </button>
    );
  }

  return (
    <div style={{ marginTop: 10 }}>
      {/* 헤더 */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <button
          onClick={() => setExpanded((v) => !v)}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 4,
            background: 'none', border: 'none', padding: 0, cursor: 'pointer',
            fontSize: 12, fontWeight: 600, color: 'var(--ink-2)',
          }}
        >
          {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          후보 비교 ({items.length})
        </button>
        {expanded && items.length >= 2 && (
          <button
            onClick={() => setShowCompareModal(true)}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 4,
              padding: '4px 10px', borderRadius: 999,
              border: '1px solid var(--rule-strong)',
              backgroundColor: 'var(--paper)',
              color: 'var(--ink-2)', cursor: 'pointer',
              fontSize: 11, fontWeight: 600,
            }}
          >
            <Table2 size={12} />
            비교표
          </button>
        )}
      </div>

      {expanded && (
        <>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {items.map((c, idx) => {
              const isChosen = c.id === chosenId;
              const isRec = !isChosen && c.id === recommendedId && items.length >= 2 && !chosenId;
              const myField = myRole === 'groom' ? 'groom_score' : myRole === 'bride' ? 'bride_score' : null;
              const highlight = isChosen || isRec;
              return (
                <div
                  key={c.id}
                  style={{
                    padding: '12px 12px 10px',
                    borderRadius: 12,
                    border: highlight ? '1.5px solid var(--champagne)' : '1px solid var(--rule)',
                    backgroundColor: highlight ? 'var(--champagne-wash)' : 'var(--ivory)',
                    position: 'relative',
                  }}
                >
                  {isChosen && (
                    <div style={{
                      position: 'absolute', top: -8, left: 10,
                      padding: '2px 8px', borderRadius: 999,
                      backgroundColor: 'var(--ink)', color: 'var(--ivory)',
                      fontSize: 10, fontWeight: 700, letterSpacing: '0.04em',
                      display: 'inline-flex', alignItems: 'center', gap: 4,
                    }}>
                      <Check size={10} strokeWidth={2.4} /> 결정됨
                    </div>
                  )}
                  {isRec && (
                    <div style={{
                      position: 'absolute', top: -8, left: 10,
                      padding: '2px 8px', borderRadius: 999,
                      backgroundColor: 'var(--champagne)', color: 'var(--ink)',
                      fontSize: 10, fontWeight: 700, letterSpacing: '0.04em',
                      display: 'inline-flex', alignItems: 'center', gap: 4,
                    }}>
                      <Crown size={10} strokeWidth={2.2} /> 평균 최고
                    </div>
                  )}

                  {/* 라벨(A/B/C) + 이름 + 삭제 */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                    <span className="tabular-nums" style={{
                      flexShrink: 0,
                      width: 22, height: 22, borderRadius: '50%',
                      backgroundColor: 'var(--ink)', color: 'var(--ivory)',
                      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 11, fontWeight: 700,
                      fontFamily: 'var(--font-serif-en)',
                    }}>
                      {String.fromCharCode(65 + idx)}
                    </span>
                    <input
                      aria-label={`후보 ${String.fromCharCode(65 + idx)} 이름`}
                      type="text"
                      value={c.name}
                      onChange={(e) => updateItem(c.id, { name: e.target.value })}
                      placeholder="후보 이름 (예: 포시즌스 호텔)"
                      style={{
                        flex: 1, minWidth: 0,
                        border: 'none', outline: 'none',
                        backgroundColor: 'transparent',
                        fontSize: 14, fontWeight: 600, color: 'var(--ink)',
                      }}
                    />
                    <button
                      onClick={() => deleteItem(c.id)}
                      aria-label="후보 삭제"
                      style={{
                        flexShrink: 0,
                        padding: 4, background: 'none', border: 'none', cursor: 'pointer',
                        color: 'var(--ink-4)', lineHeight: 0,
                      }}
                    >
                      <X size={14} />
                    </button>
                  </div>

                  {/* 가격 + 링크 */}
                  <div style={{ display: 'flex', gap: 6, marginBottom: 6 }}>
                    <div style={{
                      flex: '1 1 0',
                      minWidth: 0,
                      overflow: 'hidden',
                      display: 'flex', alignItems: 'center', gap: 4,
                      padding: '6px 10px', borderRadius: 8,
                      backgroundColor: 'var(--paper)', border: '1px solid var(--rule)',
                      boxSizing: 'border-box',
                    }}>
                      <input
                        aria-label={`후보 ${String.fromCharCode(65 + idx)} 가격 (만원)`}
                        type="number"
                        inputMode="numeric"
                        value={c.price ?? ''}
                        onChange={(e) => {
                          const v = e.target.value;
                          updateItem(c.id, { price: v === '' ? null : Math.max(0, parseInt(v, 10) || 0) });
                        }}
                        placeholder="가격"
                        className="tabular-nums"
                        style={{
                          flex: 1, minWidth: 0, width: '100%',
                          border: 'none', outline: 'none',
                          backgroundColor: 'transparent',
                          fontSize: 12, color: 'var(--ink)', textAlign: 'right',
                        }}
                      />
                      <span style={{ fontSize: 11, color: 'var(--ink-4)', flexShrink: 0 }}>만원</span>
                    </div>
                    <div style={{
                      flex: '1 1 0',
                      minWidth: 0,
                      overflow: 'hidden',
                      display: 'flex', alignItems: 'center', gap: 4,
                      padding: '6px 10px', borderRadius: 8,
                      backgroundColor: 'var(--paper)', border: '1px solid var(--rule)',
                      boxSizing: 'border-box',
                    }}>
                      <ExternalLink size={11} style={{ color: 'var(--ink-4)', flexShrink: 0 }} />
                      <input
                        aria-label={`후보 ${String.fromCharCode(65 + idx)} 후기 링크`}
                        type="url"
                        value={c.url || ''}
                        onChange={(e) => updateItem(c.id, { url: e.target.value })}
                        placeholder="후기 링크"
                        style={{
                          flex: 1, minWidth: 0, width: '100%',
                          border: 'none', outline: 'none',
                          backgroundColor: 'transparent',
                          fontSize: 12, color: 'var(--ink)',
                          textOverflow: 'ellipsis',
                        }}
                      />
                    </div>
                  </div>

                  {/* 메모 */}
                  <textarea
                    aria-label={`후보 ${String.fromCharCode(65 + idx)} 메모`}
                    value={c.note}
                    onChange={(e) => updateItem(c.id, { note: e.target.value })}
                    placeholder="위치/옵션/일정 등 메모"
                    rows={2}
                    style={{
                      width: '100%', resize: 'none',
                      padding: '6px 10px', borderRadius: 8,
                      backgroundColor: 'var(--paper)', border: '1px solid var(--rule)',
                      outline: 'none',
                      fontSize: 12, color: 'var(--ink)',
                      fontFamily: 'var(--font-sans)',
                      marginBottom: 8,
                    }}
                  />

                  {/* 점수 + promote */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 6 }}>
                    <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                        <span style={{ fontSize: 10, color: 'var(--champagne-2)', fontWeight: 600 }}>신랑</span>
                        <ScoreStars
                          value={c.groom_score}
                          onChange={(v) => updateItem(c.id, { groom_score: v })}
                          readOnly={myField !== 'groom_score'}
                          color="var(--champagne-2)"
                        />
                      </div>
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                        <span style={{ fontSize: 10, color: 'var(--rose-ed, #B6678B)', fontWeight: 600 }}>신부</span>
                        <ScoreStars
                          value={c.bride_score}
                          onChange={(v) => updateItem(c.id, { bride_score: v })}
                          readOnly={myField !== 'bride_score'}
                          color="var(--rose-ed, #B6678B)"
                        />
                      </div>
                      {avgScore(c) && (
                        <span className="tabular-nums" style={{
                          fontSize: 11, fontWeight: 700, color: 'var(--ink-2)',
                          padding: '2px 6px', borderRadius: 6,
                          backgroundColor: 'var(--rule)',
                        }}>
                          평균 {avgScore(c)}
                        </span>
                      )}
                    </div>
                    {c.name.trim() && (
                      <button
                        onClick={() => onPickFinal(c.name.trim())}
                        style={{
                          padding: '5px 12px', borderRadius: 999,
                          backgroundColor: 'var(--ink)', color: 'var(--ivory)',
                          border: 'none', cursor: 'pointer',
                          fontSize: 11, fontWeight: 600,
                        }}
                      >
                        이걸로 결정
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {items.length < 5 && (
            <button
              onClick={addItem}
              style={{
                width: '100%', marginTop: 8,
                padding: '8px 12px', borderRadius: 10,
                border: '1px dashed var(--rule-strong)',
                backgroundColor: 'transparent',
                color: 'var(--ink-3)',
                fontSize: 12, fontWeight: 600,
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                cursor: 'pointer',
              }}
            >
              <Plus size={13} strokeWidth={2} />
              후보 추가
            </button>
          )}

          {savingErr && (
            <p style={{ fontSize: 11, color: 'var(--rose, #B6678B)', marginTop: 6 }}>{savingErr}</p>
          )}
        </>
      )}

      {/* 비교표 모달 */}
      {showCompareModal && (
        <div
          onClick={() => setShowCompareModal(false)}
          style={{
            position: 'fixed', inset: 0, zIndex: 100,
            backgroundColor: 'rgba(26, 22, 19, 0.55)',
            display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
            padding: '20px 12px',
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: '100%', maxWidth: 430, maxHeight: '85vh',
              backgroundColor: 'var(--ivory)', borderRadius: 20,
              padding: '20px 16px 16px', overflow: 'hidden',
              display: 'flex', flexDirection: 'column',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <h3 style={{
                fontFamily: 'var(--font-serif-ko)', fontWeight: 500, fontSize: 16,
                color: 'var(--ink)', margin: 0, letterSpacing: '-0.01em',
              }}>
                후보 비교표
              </h3>
              <button
                onClick={() => setShowCompareModal(false)}
                aria-label="닫기"
                style={{ padding: 4, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ink-3)', lineHeight: 0 }}
              >
                <X size={18} />
              </button>
            </div>
            <div style={{ overflow: 'auto', flex: 1, WebkitOverflowScrolling: 'touch' }}>
              <table style={{
                width: '100%', borderCollapse: 'separate', borderSpacing: 0,
                fontSize: 12,
              }}>
                <thead>
                  <tr>
                    <th style={thStyle('left', true)}>항목</th>
                    {items.map((c, idx) => (
                      <th key={c.id} style={thStyle('center', false, c.id === recommendedId)}>
                        <span style={{
                          display: 'inline-flex', alignItems: 'center', gap: 4,
                          fontFamily: 'var(--font-serif-en)', fontWeight: 700,
                        }}>
                          {String.fromCharCode(65 + idx)}
                          {c.id === recommendedId && <Crown size={11} style={{ color: 'var(--champagne)' }} />}
                        </span>
                        <div style={{ fontSize: 11, color: 'var(--ink-2)', marginTop: 2, fontWeight: 600 }}>
                          {c.name || '—'}
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  <Row label="가격" cells={items.map((c) => c.price !== null ? `${c.price.toLocaleString()}만` : '—')} numeric />
                  <Row label="메모" cells={items.map((c) => c.note || '—')} multiline />
                  <Row label="링크" cells={items.map((c) => c.url ? (
                    <a href={c.url} target="_blank" rel="noreferrer" style={{ color: 'var(--champagne-2)', textDecoration: 'underline', wordBreak: 'break-all', fontSize: 11 }}>
                      열기
                    </a>
                  ) : '—')} />
                  <Row label="신랑 점수" cells={items.map((c) => c.groom_score ? `★ ${c.groom_score}` : '—')} numeric />
                  <Row label="신부 점수" cells={items.map((c) => c.bride_score ? `★ ${c.bride_score}` : '—')} numeric />
                  <Row label="평균" cells={items.map((c) => avgScore(c) || '—')} numeric bold />
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function thStyle(align, isLabel, highlight) {
  return {
    padding: '8px 6px',
    textAlign: align,
    fontSize: 10,
    color: 'var(--ink-3)',
    fontWeight: 600,
    backgroundColor: highlight ? 'var(--champagne-wash)' : 'var(--paper)',
    borderBottom: '1px solid var(--rule)',
    position: isLabel ? 'sticky' : undefined,
    left: isLabel ? 0 : undefined,
    zIndex: isLabel ? 1 : undefined,
    minWidth: isLabel ? 60 : 90,
  };
}

function Row({ label, cells, numeric = false, multiline = false, bold = false }) {
  return (
    <tr>
      <td style={{
        padding: '8px 6px',
        fontSize: 11, color: 'var(--ink-3)', fontWeight: 600,
        borderBottom: '1px solid var(--rule)',
        backgroundColor: 'var(--paper)',
        position: 'sticky', left: 0, zIndex: 1,
        whiteSpace: 'nowrap',
      }}>
        {label}
      </td>
      {cells.map((v, i) => (
        <td
          key={i}
          className={numeric ? 'tabular-nums' : ''}
          style={{
            padding: '8px 6px',
            textAlign: numeric ? 'right' : 'left',
            fontSize: 12,
            color: 'var(--ink)',
            fontWeight: bold ? 700 : 500,
            borderBottom: '1px solid var(--rule)',
            verticalAlign: 'top',
            wordBreak: multiline ? 'break-word' : 'normal',
            whiteSpace: multiline ? 'pre-wrap' : 'nowrap',
            maxWidth: multiline ? 140 : undefined,
          }}
        >
          {v}
        </td>
      ))}
    </tr>
  );
}
