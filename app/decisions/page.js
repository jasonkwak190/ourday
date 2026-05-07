'use client';
import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import PageLoader from '@/components/PageLoader';
import { useCouple } from '@/lib/useCouple';
import BottomNav from '@/components/BottomNav';
import EmptyState from '@/components/EmptyState';
import { MessageSquarePlus, Pencil, Trash2 } from 'lucide-react';
import Icon from '@/components/Icon';
import CandidateBoard from '@/components/CandidateBoard';

const FILTERS = [
  { key: 'all',        label: '전체' },
  { key: 'discussing', label: '논의 필요' },
  { key: 'decided',    label: '결정 완료' },
];

const STATUS_TAGS = {
  undiscussed: { label: '미논의', cls: 'tag-stone' },
  discussing:  { label: '논의중', cls: 'tag-amber' },
  decided:     { label: '완료',   cls: 'tag-green' },
};

/* 자주 결정해야 하는 의사결정 템플릿 — 첫 사용자 가이드 */
const DECISION_TEMPLATE = [
  { title: '신혼여행 목적지',           cat: '신혼여행' },
  { title: '신혼여행 일정 (며칠)',       cat: '신혼여행' },
  { title: '웨딩홀 컨셉 (가든/호텔/채플)', cat: '식장' },
  { title: '식순 이벤트 (축가·영상·사회)', cat: '예식 디테일' },
  { title: '폐백 진행 여부',             cat: '예식 디테일' },
  { title: '답례품 종류',                cat: '예식 디테일' },
  { title: '부케 색상·꽃 종류',           cat: '예식 디테일' },
  { title: '예물 종류·예산',              cat: '신혼집·예물' },
  { title: '신혼집 위치',                cat: '신혼집·예물' },
  { title: '혼인신고 일정 (식 전/후)',    cat: '기타' },
];

/* 카테고리 매핑 (체크리스트와 동일 7개) */
const DECISION_CATEGORIES = ['식장', '스드메', '청첩장·하객', '신혼여행', '신혼집·예물', '예식 디테일', '기타'];

/* 제목 키워드 → 카테고리 자동 추론 */
function inferCategory(title) {
  const t = (title || '').toLowerCase();
  if (/웨딩홀|예식장|식장|폐백|식순/.test(t)) return /폐백|식순/.test(t) ? '예식 디테일' : '식장';
  if (/스튜디오|드레스|메이크업|메이컵|헤어/.test(t)) return '스드메';
  if (/청첩장|하객|명단/.test(t)) return '청첩장·하객';
  if (/신혼여행|허니문|여행지/.test(t)) return '신혼여행';
  if (/신혼집|혼수|이사|예물|예단|함/.test(t)) return '신혼집·예물';
  if (/축가|사회|주례|영상|폐백|답례품|부케|식순|꽃/.test(t)) return '예식 디테일';
  return '기타';
}

export default function DecisionsPage() {
  const { coupleId, userData, loading: authLoading } = useCouple('couple_id, role');
  const myRole = userData?.role ?? null;

  const [loading, setLoading] = useState(true);
  const [decisions, setDecisions] = useState([]);
  const [filter, setFilter] = useState('all');
  const [saving, setSaving] = useState(false);

  // 의견 편집
  const [editingOpinion, setEditingOpinion] = useState(null);
  const [opinionText, setOpinionText] = useState('');

  // 최종 결정 편집
  const [editingFinal, setEditingFinal] = useState(null);
  const [finalText, setFinalText] = useState('');

  // 결정 철회 확인
  const [confirmClearId, setConfirmClearId] = useState(null);

  // 저장 피드백 토스트
  const [toast, setToast] = useState('');
  function showToast(msg) {
    setToast(msg);
    setTimeout(() => setToast(''), 2000);
  }

  // 항목 추가
  const [adding, setAdding] = useState(false);
  const [newTitle, setNewTitle] = useState('');

  // 수정/삭제 메뉴
  const [menuId, setMenuId] = useState(null);
  const [editingTitle, setEditingTitle] = useState(null);
  const [editTitleText, setEditTitleText] = useState('');
  const [conflictToast, setConflictToast] = useState('');

  useEffect(() => {
    if (authLoading) return;
    if (!coupleId) { setLoading(false); return; }
    const load = async () => {
      const { data } = await supabase
        .from('decisions')
        .select('id, title, groom_opinion, bride_opinion, final_decision, status, candidates, created_at')
        .eq('couple_id', coupleId)
        .order('created_at');
      setDecisions(data || []);
      setLoading(false);
    };
    load();
  }, [authLoading, coupleId]);

  // Realtime 구독
  useEffect(() => {
    if (!coupleId) return;
    const channel = supabase
      .channel(`decisions-${coupleId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'decisions',
        filter: `couple_id=eq.${coupleId}`,
      }, (payload) => {
        if (payload.eventType === 'INSERT') {
          setDecisions((prev) => {
            if (prev.find((d) => d.id === payload.new.id)) return prev;
            return [...prev, payload.new];
          });
        } else if (payload.eventType === 'UPDATE') {
          // Q-007 동시편집 충돌: 사용자가 이 row를 편집 중이면 로컬 편집을 보존하고 알림만 띄움
          // (덮어쓰면 사용자가 방금 친 내용 사라짐)
          const isLocallyEditing =
            editingOpinion === payload.new.id ||
            editingFinal === payload.new.id ||
            editingTitle === payload.new.id;
          if (isLocallyEditing) {
            setConflictToast('상대방이 방금 변경했어요. 저장 후 충돌 가능');
            setTimeout(() => setConflictToast(''), 2800);
            return;
          }
          setDecisions((prev) => prev.map((d) => d.id === payload.new.id ? payload.new : d));
        } else if (payload.eventType === 'DELETE') {
          setDecisions((prev) => prev.filter((d) => d.id !== payload.old.id));
        }
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [coupleId]);

  async function addDecision() {
    if (!newTitle.trim() || !coupleId) return;
    setSaving(true);
    const { data, error } = await supabase
      .from('decisions')
      .insert({ couple_id: coupleId, title: newTitle.trim(), status: 'undiscussed' })
      .select().single();
    if (!error && data) setDecisions((prev) => prev.find(d => d.id === data.id) ? prev : [...prev, data]);
    setNewTitle('');
    setAdding(false);
    setSaving(false);
  }

  /* 빠른 추가 — title 직접 받음 (인라인 입력에서 호출) */
  async function quickAddDecision(title) {
    const t = (title || '').trim();
    if (!t || !coupleId) return;
    const { data, error } = await supabase
      .from('decisions')
      .insert({ couple_id: coupleId, title: t, status: 'undiscussed' })
      .select().single();
    if (error) { console.error('[quickAddDecision]', error.message); return; }
    if (data) setDecisions((prev) => prev.find(d => d.id === data.id) ? prev : [...prev, data]);
  }

  /* 통계 */
  const decisionStats = useMemo(() => {
    const total = decisions.length;
    const decided = decisions.filter(d => d.status === 'decided').length;
    const discussing = decisions.filter(d => d.status === 'discussing').length;
    const undiscussed = decisions.filter(d => d.status === 'undiscussed').length;
    const pct = total > 0 ? Math.round(decided / total * 100) : 0;
    return { total, decided, discussing, undiscussed, pct };
  }, [decisions]);

  /* 카테고리별 통계 */
  const decisionCategoryStats = useMemo(() => {
    const map = {};
    DECISION_CATEGORIES.forEach(c => { map[c] = { total: 0, decided: 0 }; });
    decisions.forEach(d => {
      const c = inferCategory(d.title);
      if (!map[c]) map[c] = { total: 0, decided: 0 };
      map[c].total++;
      if (d.status === 'decided') map[c].decided++;
    });
    return DECISION_CATEGORIES
      .map(c => ({ name: c, ...map[c], pct: map[c].total > 0 ? Math.round(map[c].decided / map[c].total * 100) : 0 }))
      .filter(x => x.total > 0);
  }, [decisions]);

  /* 추천 결정 항목 — 이미 추가된 것은 제외 */
  const availableTemplates = useMemo(() => {
    const existing = new Set(decisions.map(d => d.title.toLowerCase()));
    return DECISION_TEMPLATE.filter(t => !existing.has(t.title.toLowerCase()));
  }, [decisions]);

  async function deleteDecision(id) {
    setDecisions((prev) => prev.filter((d) => d.id !== id));
    await supabase.from('decisions').delete().eq('id', id);
    setMenuId(null);
  }

  async function saveTitle(id) {
    if (!editTitleText.trim()) return;
    await supabase.from('decisions').update({ title: editTitleText.trim() }).eq('id', id);
    setDecisions((prev) => prev.map((d) => d.id === id ? { ...d, title: editTitleText.trim() } : d));
    setEditingTitle(null);
    setMenuId(null);
  }

  async function saveOpinion(decisionId) {
    if (!opinionText.trim()) return;
    setSaving(true);
    const field = myRole === 'groom' ? 'groom_opinion' : 'bride_opinion';
    const { error } = await supabase
      .from('decisions').update({ [field]: opinionText.trim(), status: 'discussing' }).eq('id', decisionId);
    if (!error) {
      setDecisions((prev) => prev.map((d) =>
        d.id === decisionId ? { ...d, [field]: opinionText.trim(), status: 'discussing' } : d
      ));
      showToast('의견이 저장됐어요');
    }
    setEditingOpinion(null);
    setOpinionText('');
    setSaving(false);
  }

  async function saveFinal(decisionId) {
    if (!finalText.trim()) return;
    setSaving(true);
    const { error } = await supabase
      .from('decisions').update({ final_decision: finalText.trim(), status: 'decided' }).eq('id', decisionId);
    if (!error) {
      setDecisions((prev) => prev.map((d) =>
        d.id === decisionId ? { ...d, final_decision: finalText.trim(), status: 'decided' } : d
      ));
      showToast('최종 결정이 저장됐어요');
    }
    setEditingFinal(null);
    setFinalText('');
    setSaving(false);
  }

  async function saveCandidates(decisionId, nextCandidates) {
    setDecisions((prev) => prev.map((d) =>
      d.id === decisionId ? { ...d, candidates: nextCandidates } : d
    ));
    const { error } = await supabase
      .from('decisions')
      .update({ candidates: nextCandidates })
      .eq('id', decisionId);
    if (error) throw error;
  }

  async function pickFinalFromCandidate(decisionId, candidateName) {
    setSaving(true);
    const { error } = await supabase
      .from('decisions')
      .update({ final_decision: candidateName, status: 'decided' })
      .eq('id', decisionId);
    if (!error) {
      setDecisions((prev) => prev.map((d) =>
        d.id === decisionId ? { ...d, final_decision: candidateName, status: 'decided' } : d
      ));
      // Q-015: 큰 결정 = medium 햅틱
      const { hapticNotify } = await import('@/components/NativeBridge');
      hapticNotify('success');
      showToast('최종 결정으로 저장됐어요');
    }
    setSaving(false);
  }

  async function clearFinal(decisionId) {
    await supabase.from('decisions')
      .update({ final_decision: null, status: 'discussing' }).eq('id', decisionId);
    setDecisions((prev) => prev.map((d) =>
      d.id === decisionId ? { ...d, final_decision: null, status: 'discussing' } : d
    ));
  }

  const myOpinionField = myRole === 'groom' ? 'groom_opinion' : 'bride_opinion';

  const filtered = decisions.filter((d) => {
    if (filter === 'all') return true;
    if (filter === 'discussing') return d.status !== 'decided';
    if (filter === 'decided') return d.status === 'decided';
    return true;
  });

  if (loading) return <PageLoader />;

  return (
    <div className="page-wrapper" onClick={() => setMenuId(null)}>
      {conflictToast && (
        <div role="status" aria-live="polite"
          style={{
            position: 'fixed', top: 'calc(env(safe-area-inset-top) + 12px)',
            left: '50%', transform: 'translateX(-50%)', zIndex: 60,
            backgroundColor: 'var(--ink)', color: 'white',
            padding: '10px 16px', borderRadius: 24,
            fontSize: 13, fontWeight: 600,
            boxShadow: '0 4px 12px rgba(0,0,0,.18)',
            pointerEvents: 'none', whiteSpace: 'nowrap',
          }}>
          {conflictToast}
        </div>
      )}
      {/* 저장 토스트 — BottomNav 위에 항상 표시 */}
      {toast && (
        <div className="fixed left-1/2 px-5 py-3 rounded-2xl text-sm font-semibold shadow-lg"
          style={{
            bottom: 'calc(92px + env(safe-area-inset-bottom))',
            zIndex: 60,
            transform: 'translateX(-50%)',
            backgroundColor: 'var(--ink)',
            color: 'white',
            pointerEvents: 'none',
            whiteSpace: 'nowrap',
          }}>
          {toast}
        </div>
      )}

      <div className="mb-4">
        <h1 style={{ fontFamily: 'var(--font-serif-ko)', fontWeight: 500, fontSize: 20, color: 'var(--ink)', margin: 0, letterSpacing: '-0.01em' }}>
          의사결정 보드
        </h1>
        <p style={{ fontFamily: 'var(--font-serif-en)', fontStyle: 'italic', fontSize: 12, color: 'var(--champagne-2)', margin: '2px 0 0', letterSpacing: '0.04em' }}>
          together we decide
        </p>
      </div>

      {/* ── 인사이트 헤더 카드 ── */}
      {decisionStats.total > 0 && (
        <div className="card mb-4" style={{ padding: '18px 20px' }}>
          <div className="flex items-end justify-between mb-3">
            <div>
              <p style={{ fontSize: 10, color: 'var(--ink-3)', letterSpacing: '0.18em', textTransform: 'uppercase', margin: 0, fontFamily: 'var(--font-serif-en)', fontStyle: 'italic' }}>
                · together we decide ·
              </p>
              <p className="tabular-nums" style={{ fontSize: 30, fontWeight: 800, color: 'var(--ink)', lineHeight: 1.05, margin: '4px 0 0', letterSpacing: '-0.03em' }}>
                {decisionStats.decided} <span style={{ fontSize: 18, color: 'var(--ink-4)', fontWeight: 600 }}>/ {decisionStats.total} 결정</span>
              </p>
            </div>
            <p className="tabular-nums" style={{ fontSize: 26, fontWeight: 800, color: 'var(--champagne-2)', lineHeight: 1, margin: 0, letterSpacing: '-0.02em' }}>
              {decisionStats.pct}%
            </p>
          </div>
          <div style={{ height: 6, backgroundColor: 'var(--rule)', borderRadius: 999, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${decisionStats.pct}%`, backgroundColor: 'var(--champagne)', transition: 'width 0.4s ease' }} />
          </div>
          {(decisionStats.discussing > 0 || decisionStats.undiscussed > 0) && (
            <div className="flex flex-wrap gap-2 mt-3">
              {decisionStats.undiscussed > 0 && (
                <span style={{ fontSize: 12, fontWeight: 600, padding: '4px 10px', borderRadius: 999, backgroundColor: 'var(--paper)', color: 'var(--ink-3)', border: '1px solid var(--rule)' }}>
                  미논의 {decisionStats.undiscussed}개
                </span>
              )}
              {decisionStats.discussing > 0 && (
                <span style={{ fontSize: 12, fontWeight: 600, padding: '4px 10px', borderRadius: 999, backgroundColor: 'var(--ochre-wash, #F4ECDA)', color: 'var(--ochre, #A37D2C)' }}>
                  논의중 {decisionStats.discussing}개
                </span>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── 빠른 결정 추가 인라인 ── */}
      <div className="flex items-center gap-2 mb-3" style={{
        padding: '6px 6px 6px 14px',
        borderRadius: 999,
        border: '1px solid var(--rule)',
        backgroundColor: 'var(--paper)',
      }}>
        <span style={{ flexShrink: 0, color: 'var(--ink-4)', fontSize: 16, lineHeight: 1, fontWeight: 600 }}>+</span>
        <input
          type="text"
          value={newTitle}
          onChange={e => setNewTitle(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && newTitle.trim() && addDecision()}
          placeholder="결정 항목 빠르게 추가 (예: 신혼집 위치)"
          style={{
            flex: 1, minWidth: 0,
            border: 'none', outline: 'none',
            backgroundColor: 'transparent',
            fontSize: 14, color: 'var(--ink)',
            fontFamily: 'var(--font-sans)',
          }}
        />
        <button
          onClick={() => newTitle.trim() && addDecision()}
          disabled={!newTitle.trim() || saving}
          style={{
            flexShrink: 0,
            padding: '7px 16px', borderRadius: 999,
            backgroundColor: newTitle.trim() ? 'var(--ink)' : 'var(--rule)',
            color: newTitle.trim() ? 'var(--ivory)' : 'var(--ink-4)',
            border: 'none', cursor: newTitle.trim() ? 'pointer' : 'not-allowed',
            fontSize: 13, fontWeight: 600,
          }}
        >
          {saving ? '...' : '추가'}
        </button>
      </div>

      {/* ── 추천 결정 항목 (이미 추가된 것 제외) ── */}
      {availableTemplates.length > 0 && (
        <div className="mb-4">
          <p className="t-kicker" style={{ marginBottom: 8 }}>· 자주 결정하는 항목 ·</p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {availableTemplates.slice(0, 8).map(({ title }) => (
              <button
                key={title}
                onClick={() => quickAddDecision(title)}
                style={{
                  fontSize: 12, padding: '6px 12px', borderRadius: 999,
                  backgroundColor: 'var(--paper)', color: 'var(--ink-2)',
                  border: '1px dashed var(--rule-strong)',
                  cursor: 'pointer', transition: 'all 0.15s',
                }}
                onMouseEnter={e => { e.currentTarget.style.backgroundColor = 'var(--champagne-wash)'; e.currentTarget.style.borderStyle = 'solid'; }}
                onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'var(--paper)'; e.currentTarget.style.borderStyle = 'dashed'; }}
              >
                + {title}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── 카테고리 진행률 row ── */}
      {decisionCategoryStats.length > 0 && (
        <div className="mb-4">
          <p className="t-kicker" style={{ marginBottom: 8 }}>· 카테고리별 진행 ·</p>
          <div style={{ display: 'flex', gap: 8, overflowX: 'auto', scrollbarWidth: 'none', paddingBottom: 4, marginLeft: -4, marginRight: -4, paddingLeft: 4, paddingRight: 4 }}>
            {decisionCategoryStats.map(cat => (
              <div key={cat.name} style={{
                flexShrink: 0, minWidth: 110, padding: '10px 12px',
                borderRadius: 12, backgroundColor: 'var(--paper)',
                border: '1px solid var(--rule)',
              }}>
                <p style={{ fontSize: 11, fontWeight: 600, margin: 0, color: 'var(--ink-2)', whiteSpace: 'nowrap' }}>{cat.name}</p>
                <p className="tabular-nums" style={{ fontSize: 14, fontWeight: 700, margin: '4px 0 0', color: 'var(--ink)' }}>
                  {cat.decided}/{cat.total}
                  <span style={{ fontSize: 11, color: 'var(--ink-4)', fontWeight: 500, marginLeft: 6 }}>{cat.pct}%</span>
                </p>
                <div style={{ height: 3, backgroundColor: 'var(--rule)', borderRadius: 99, overflow: 'hidden', marginTop: 6 }}>
                  <div style={{ height: '100%', width: `${cat.pct}%`, backgroundColor: 'var(--champagne)', transition: 'width 0.3s' }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 필터 탭 */}
      <div className="flex gap-2 mb-4">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className="flex-1 py-2 text-sm font-medium transition-all"
            style={{
              borderRadius: 20,
              backgroundColor: filter === f.key ? 'var(--ink)' : 'transparent',
              color: filter === f.key ? 'var(--ivory)' : 'var(--ink-3)',
              border: `1.5px solid ${filter === f.key ? 'var(--ink)' : 'var(--rule-strong)'}`,
              fontFamily: 'var(--font-sans)',
            }}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* 결정 카드 목록 */}
      <div className="flex flex-col gap-4 mb-4">
        {filtered.length === 0 ? (
          <div className="card">
            <EmptyState
              icon={MessageSquarePlus}
              title="아직 의사결정 항목이 없어요"
              description="웨딩홀 선택, 신혼여행지 등 함께 결정해야 할 것들을 추가해보세요"
              action={{ label: '첫 의제 추가하기', onClick: () => setAdding(true) }}
            />
          </div>
        ) : (
          filtered.map((d) => {
            const st = STATUS_TAGS[d.status] || STATUS_TAGS.undiscussed;
            const isEditingOp = editingOpinion === d.id;
            const isEditingFin = editingFinal === d.id;
            const isEditingTit = editingTitle === d.id;
            const isMenuOpen = menuId === d.id;
            const myOpinion = d[myOpinionField];

            return (
              <div key={d.id} className="card relative" onClick={(e) => e.stopPropagation()}>
                {/* 제목 + 상태 + 메뉴 */}
                <div className="flex items-center justify-between mb-3">
                  {isEditingTit ? (
                    <div className="flex gap-2 flex-1 mr-2">
                      <input
                        className="input-field text-sm flex-1"
                        value={editTitleText}
                        onChange={(e) => setEditTitleText(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && saveTitle(d.id)}
                        autoFocus
                      />
                      <button className="btn-rose text-xs px-3 py-1" onClick={() => saveTitle(d.id)}>저장</button>
                      <button className="btn-outline text-xs px-3 py-1" onClick={() => setEditingTitle(null)}>취소</button>
                    </div>
                  ) : (
                    <p className="text-sm font-semibold flex-1" style={{ color: 'var(--ink)' }}>{d.title}</p>
                  )}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className={`tag ${st.cls}`}>{st.label}</span>
                    <button
                      onClick={(e) => { e.stopPropagation(); setMenuId(isMenuOpen ? null : d.id); }}
                      className="text-lg"
                      style={{ color: 'var(--stone)', background: 'none', border: 'none', cursor: 'pointer', padding: '0 2px' }}
                    >
                      ···
                    </button>
                  </div>
                </div>

                {/* 드롭다운 메뉴 */}
                {isMenuOpen && (
                  <div
                    className="absolute right-4 z-10 rounded-xl shadow-lg overflow-hidden"
                    style={{ top: '48px', backgroundColor: 'white', border: '1.5px solid var(--stone-light)', minWidth: '100px' }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <button
                      className="w-full text-left px-4 py-3 text-sm font-medium"
                      style={{ color: 'var(--ink)', background: 'none', border: 'none', cursor: 'pointer' }}
                      onClick={() => { setEditingTitle(d.id); setEditTitleText(d.title); setMenuId(null); }}
                    >
                      <span className="flex items-center gap-2"><Pencil size={14} />제목 수정</span>
                    </button>
                    <div style={{ height: '1px', backgroundColor: 'var(--beige)' }} />
                    <button
                      className="w-full text-left px-4 py-3 text-sm font-medium"
                      style={{ color: 'var(--rose)', background: 'none', border: 'none', cursor: 'pointer' }}
                      onClick={() => deleteDecision(d.id)}
                    >
                      <span className="flex items-center gap-2"><Trash2 size={14} />삭제</span>
                    </button>
                  </div>
                )}

                {/* 의견 박스 */}
                <div className="grid grid-cols-2 gap-2 mb-3">
                  {/* 신랑 */}
                  <div className="rounded-xl p-3" style={{ backgroundColor: 'var(--champagne-wash)' }}>
                    <p className="text-xs font-medium mb-1 flex items-center gap-1" style={{ color: 'var(--champagne-2)' }}>
                      <Icon name="groom" size={13} color="var(--champagne-2)" />신랑
                    </p>
                    {d.groom_opinion ? (
                      <div>
                        <p className="text-xs" style={{ color: 'var(--ink)' }}>{d.groom_opinion}</p>
                        {myRole === 'groom' && !isEditingOp && (
                          <button
                            onClick={() => { setEditingOpinion(d.id); setOpinionText(d.groom_opinion); }}
                            className="text-xs mt-1"
                            style={{ color: 'var(--stone)', background: 'none', border: 'none', cursor: 'pointer' }}
                          >
                            수정
                          </button>
                        )}
                      </div>
                    ) : myRole === 'groom' && !isEditingOp ? (
                      <button
                        onClick={() => { setEditingOpinion(d.id); setOpinionText(''); }}
                        className="text-xs"
                        style={{ color: 'var(--rose)', background: 'none', border: 'none', cursor: 'pointer' }}
                      >
                        의견 남기기
                      </button>
                    ) : (
                      <p className="text-xs" style={{ color: 'var(--ink-3)' }}>없음</p>
                    )}
                  </div>

                  {/* 신부 */}
                  <div className="rounded-xl p-3" style={{ backgroundColor: 'var(--rose-ed-wash)' }}>
                    <p className="text-xs font-medium mb-1 flex items-center gap-1" style={{ color: 'var(--rose-ed)' }}>
                      <Icon name="bride" size={13} color="var(--rose-ed)" />신부
                    </p>
                    {d.bride_opinion ? (
                      <div>
                        <p className="text-xs" style={{ color: 'var(--ink)' }}>{d.bride_opinion}</p>
                        {myRole === 'bride' && !isEditingOp && (
                          <button
                            onClick={() => { setEditingOpinion(d.id); setOpinionText(d.bride_opinion); }}
                            className="text-xs mt-1"
                            style={{ color: 'var(--stone)', background: 'none', border: 'none', cursor: 'pointer' }}
                          >
                            수정
                          </button>
                        )}
                      </div>
                    ) : myRole === 'bride' && !isEditingOp ? (
                      <button
                        onClick={() => { setEditingOpinion(d.id); setOpinionText(''); }}
                        className="text-xs"
                        style={{ color: 'var(--rose)', background: 'none', border: 'none', cursor: 'pointer' }}
                      >
                        의견 남기기
                      </button>
                    ) : (
                      <p className="text-xs" style={{ color: 'var(--ink-3)' }}>없음</p>
                    )}
                  </div>
                </div>

                {/* 의견 입력 폼 */}
                {isEditingOp && (
                  <div className="flex flex-col gap-2 mb-3">
                    <textarea
                      className="input-field text-sm resize-none"
                      rows={3}
                      placeholder="의견을 입력해주세요"
                      value={opinionText}
                      onChange={(e) => setOpinionText(e.target.value.slice(0, 500))}
                      maxLength={500}
                      autoFocus
                    />
                    <div className="flex gap-2">
                      <button className="btn-outline flex-1 text-sm py-2" onClick={() => setEditingOpinion(null)}>취소</button>
                      <button className="btn-rose flex-1 text-sm py-2" onClick={() => saveOpinion(d.id)} disabled={saving}>저장</button>
                    </div>
                  </div>
                )}

                {/* 후보 비교 보드 (3-way) */}
                <CandidateBoard
                  decisionId={d.id}
                  candidates={d.candidates}
                  myRole={myRole}
                  onSave={(next) => saveCandidates(d.id, next)}
                  onPickFinal={(name) => pickFinalFromCandidate(d.id, name)}
                />

                {/* 최종 결정 */}
                {isEditingFin ? (
                  <div className="flex flex-col gap-2">
                    <textarea
                      className="input-field text-sm resize-none"
                      rows={2}
                      placeholder="최종 결정 내용을 입력해주세요"
                      value={finalText}
                      onChange={(e) => setFinalText(e.target.value.slice(0, 500))}
                      maxLength={500}
                      autoFocus
                    />
                    <div className="flex gap-2">
                      <button
                        className="btn-outline flex-1 text-sm py-2"
                        onClick={() => setEditingFinal(null)}
                      >
                        편집 취소
                      </button>
                      <button
                        className="btn-rose flex-1 text-sm py-2"
                        onClick={() => saveFinal(d.id)}
                        disabled={saving}
                      >
                        저장
                      </button>
                    </div>
                  </div>
                ) : d.final_decision ? (
                  <div className="rounded-xl p-3" style={{ backgroundColor: 'var(--green-light)' }}>
                    <div className="flex justify-between items-center mb-1">
                      <p className="text-xs font-medium flex items-center gap-1" style={{ color: 'var(--green)' }}>
                        <Icon name="check" size={12} color="var(--sage)" />
                        최종 결정
                      </p>
                      <button
                        onClick={() => { setEditingFinal(d.id); setFinalText(d.final_decision); }}
                        className="text-xs font-medium px-2 py-0.5 rounded-lg"
                        style={{
                          color: 'var(--stone)',
                          backgroundColor: 'rgba(0,0,0,0.06)',
                          border: 'none',
                          cursor: 'pointer',
                        }}
                      >
                        <span className="flex items-center gap-1.5"><Pencil size={13} />수정</span>
                      </button>
                    </div>
                    <p className="text-sm" style={{ color: 'var(--ink)' }}>{d.final_decision}</p>
                    {confirmClearId === d.id ? (
                      <div className="mt-2 flex items-center gap-2">
                        <p className="text-xs flex-1" style={{ color: 'var(--rose)' }}>
                          최종 결정을 지울까요?
                        </p>
                        <button
                          onClick={() => { clearFinal(d.id); setConfirmClearId(null); }}
                          className="text-xs font-semibold px-2 py-1 rounded-lg"
                          style={{ backgroundColor: 'var(--rose)', color: 'white', border: 'none', cursor: 'pointer' }}
                        >
                          네, 철회
                        </button>
                        <button
                          onClick={() => setConfirmClearId(null)}
                          className="text-xs font-semibold px-2 py-1 rounded-lg"
                          style={{ backgroundColor: 'rgba(0,0,0,0.06)', color: 'var(--stone)', border: 'none', cursor: 'pointer' }}
                        >
                          취소
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setConfirmClearId(d.id)}
                        className="mt-2 text-xs"
                        style={{ color: 'var(--stone)', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}
                      >
                        결정 철회하기
                      </button>
                    )}
                  </div>
                ) : (
                  <button
                    className="w-full py-2 rounded-xl text-xs font-medium mt-1"
                    style={{ backgroundColor: 'var(--beige)', color: 'var(--stone)' }}
                    onClick={() => { setEditingFinal(d.id); setFinalText(''); }}
                  >
                    <span className="flex items-center justify-center gap-1.5">
                      <Icon name="check" size={13} color="currentColor" />
                      최종 결정 입력하기
                    </span>
                  </button>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* 항목 추가는 페이지 상단의 인라인 입력으로 통합됨 — 기존 모달 폼/버튼 제거 */}

      <BottomNav active="decisions" />
    </div>
  );
}
