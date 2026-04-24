'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import BottomNav from '@/components/BottomNav';
import EmptyState from '@/components/EmptyState';
import { MessageSquarePlus, Pencil, Trash2 } from 'lucide-react';
import Icon from '@/components/Icon';

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

export default function DecisionsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [decisions, setDecisions] = useState([]);
  const [filter, setFilter] = useState('all');
  const [myRole, setMyRole] = useState(null);
  const [coupleId, setCoupleId] = useState(null);
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

  useEffect(() => {
    const load = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.push('/'); return; }

      const { data: user } = await supabase
        .from('users').select('couple_id, role').eq('id', session.user.id).single();

      if (!user?.couple_id) { router.push('/setup'); return; }
      setCoupleId(user.couple_id);
      setMyRole(user.role);

      const { data } = await supabase
        .from('decisions').select('*').eq('couple_id', user.couple_id).order('created_at');

      setDecisions(data || []);
      setLoading(false);
    };
    load();
  }, [router]);

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
    if (!error && data) setDecisions((prev) => [...prev, data]);
    setNewTitle('');
    setAdding(false);
    setSaving(false);
  }

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

  if (loading) {
    return (
      <div className="page-wrapper flex items-center justify-center">
        <p className="text-sm" style={{ color: 'var(--stone)' }}>불러오는 중...</p>
      </div>
    );
  }

  return (
    <div className="page-wrapper" onClick={() => setMenuId(null)}>
      {/* 저장 토스트 */}
      {toast && (
        <div className="fixed left-1/2 z-50 px-5 py-3 rounded-2xl text-sm font-semibold shadow-lg"
          style={{ bottom: 96, transform: 'translateX(-50%)', backgroundColor: 'var(--ink)', color: 'white', pointerEvents: 'none', whiteSpace: 'nowrap' }}>
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
                      <p className="text-xs" style={{ color: 'var(--stone-light)' }}>없음</p>
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
                      <p className="text-xs" style={{ color: 'var(--stone-light)' }}>없음</p>
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
                      onChange={(e) => setOpinionText(e.target.value)}
                      autoFocus
                    />
                    <div className="flex gap-2">
                      <button className="btn-outline flex-1 text-sm py-2" onClick={() => setEditingOpinion(null)}>취소</button>
                      <button className="btn-rose flex-1 text-sm py-2" onClick={() => saveOpinion(d.id)} disabled={saving}>저장</button>
                    </div>
                  </div>
                )}

                {/* 최종 결정 */}
                {isEditingFin ? (
                  <div className="flex flex-col gap-2">
                    <textarea
                      className="input-field text-sm resize-none"
                      rows={2}
                      placeholder="최종 결정 내용을 입력해주세요"
                      value={finalText}
                      onChange={(e) => setFinalText(e.target.value)}
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
                    <span className="flex items-center gap-1.5">
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

      {/* 항목 추가 */}
      {adding ? (
        <div className="card flex flex-col gap-3 mb-4">
          <input
            className="input-field"
            placeholder="결정해야 할 주제 (예: 신혼여행지)"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            autoFocus
            onKeyDown={(e) => e.key === 'Enter' && addDecision()}
          />
          <div className="flex gap-2">
            <button className="btn-outline flex-1" onClick={() => { setAdding(false); setNewTitle(''); }}>취소</button>
            <button className="btn-rose flex-1" onClick={addDecision} disabled={saving || !newTitle.trim()}>
              {saving ? '추가 중...' : '추가'}
            </button>
          </div>
        </div>
      ) : (
        <button className="btn-outline w-full" onClick={() => setAdding(true)}>
          + 결정 항목 추가
        </button>
      )}

      <BottomNav active="decisions" />
    </div>
  );
}
