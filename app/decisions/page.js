'use client';

export const dynamic = 'force-dynamic';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import BottomNav from '@/components/BottomNav';

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
  const [editingOpinion, setEditingOpinion] = useState(null);
  const [opinionText, setOpinionText] = useState('');
  const [editingFinal, setEditingFinal] = useState(null);
  const [finalText, setFinalText] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const load = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.push('/'); return; }

      const { data: user } = await supabase
        .from('users')
        .select('couple_id, role')
        .eq('id', session.user.id)
        .single();

      if (!user?.couple_id) { router.push('/connect'); return; }
      setCoupleId(user.couple_id);
      setMyRole(user.role);

      const { data } = await supabase
        .from('decisions')
        .select('*')
        .eq('couple_id', user.couple_id)
        .order('created_at');

      setDecisions(data || []);
      setLoading(false);
    };
    load();
  }, [router]);

  async function saveOpinion(decisionId) {
    if (!opinionText.trim()) return;
    setSaving(true);
    const field = myRole === 'groom' ? 'groom_opinion' : 'bride_opinion';
    const { error } = await supabase
      .from('decisions')
      .update({ [field]: opinionText.trim(), status: 'discussing' })
      .eq('id', decisionId);

    if (!error) {
      setDecisions((prev) =>
        prev.map((d) =>
          d.id === decisionId
            ? { ...d, [field]: opinionText.trim(), status: 'discussing' }
            : d
        )
      );
    }
    setEditingOpinion(null);
    setOpinionText('');
    setSaving(false);
  }

  async function saveFinal(decisionId) {
    if (!finalText.trim()) return;
    setSaving(true);
    const { error } = await supabase
      .from('decisions')
      .update({ final_decision: finalText.trim(), status: 'decided' })
      .eq('id', decisionId);

    if (!error) {
      setDecisions((prev) =>
        prev.map((d) =>
          d.id === decisionId
            ? { ...d, final_decision: finalText.trim(), status: 'decided' }
            : d
        )
      );
    }
    setEditingFinal(null);
    setFinalText('');
    setSaving(false);
  }

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
    <div className="page-wrapper">
      <h1 className="text-xl font-semibold mb-4" style={{ color: 'var(--ink)' }}>
        💬 의사결정 보드
      </h1>

      {/* 필터 탭 */}
      <div className="flex gap-2 mb-4">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className="flex-1 py-2 rounded-full text-sm font-medium transition-all"
            style={{
              backgroundColor: filter === f.key ? 'var(--rose)' : 'white',
              color: filter === f.key ? 'white' : 'var(--stone)',
              border: `1.5px solid ${filter === f.key ? 'var(--rose)' : 'var(--stone-light)'}`,
            }}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* 결정 카드 목록 */}
      <div className="flex flex-col gap-4">
        {filtered.length === 0 ? (
          <div className="card text-center py-8" style={{ color: 'var(--stone)' }}>
            <p className="text-2xl mb-2">🤝</p>
            <p className="text-sm">해당 항목이 없어요</p>
          </div>
        ) : (
          filtered.map((d) => {
            const st = STATUS_TAGS[d.status] || STATUS_TAGS.undiscussed;
            const isEditingOp = editingOpinion === d.id;
            const isEditingFin = editingFinal === d.id;

            return (
              <div key={d.id} className="card">
                {/* 제목 + 상태 */}
                <div className="flex items-center justify-between mb-3">
                  <p className="text-sm font-semibold" style={{ color: 'var(--ink)' }}>
                    {d.title}
                  </p>
                  <span className={`tag ${st.cls}`}>{st.label}</span>
                </div>

                {/* 의견 박스 2개 */}
                <div className="grid grid-cols-2 gap-2 mb-3">
                  {/* 신랑 */}
                  <div
                    className="rounded-xl p-3"
                    style={{ backgroundColor: 'var(--beige)' }}
                  >
                    <p className="text-xs font-medium mb-1" style={{ color: 'var(--stone)' }}>
                      신랑 🤵
                    </p>
                    {d.groom_opinion ? (
                      <p className="text-xs" style={{ color: 'var(--ink)' }}>
                        {d.groom_opinion}
                      </p>
                    ) : myRole === 'groom' && !isEditingOp ? (
                      <button
                        onClick={() => { setEditingOpinion(d.id); setOpinionText(''); }}
                        className="text-xs"
                        style={{ color: 'var(--rose)' }}
                      >
                        의견 남기기
                      </button>
                    ) : (
                      <p className="text-xs" style={{ color: 'var(--stone-light)' }}>없음</p>
                    )}
                  </div>

                  {/* 신부 */}
                  <div
                    className="rounded-xl p-3"
                    style={{ backgroundColor: 'var(--rose-light)' }}
                  >
                    <p className="text-xs font-medium mb-1" style={{ color: 'var(--stone)' }}>
                      신부 👰
                    </p>
                    {d.bride_opinion ? (
                      <p className="text-xs" style={{ color: 'var(--ink)' }}>
                        {d.bride_opinion}
                      </p>
                    ) : myRole === 'bride' && !isEditingOp ? (
                      <button
                        onClick={() => { setEditingOpinion(d.id); setOpinionText(''); }}
                        className="text-xs"
                        style={{ color: 'var(--rose)' }}
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
                      <button
                        className="btn-outline flex-1 text-sm py-2"
                        onClick={() => setEditingOpinion(null)}
                      >
                        취소
                      </button>
                      <button
                        className="btn-rose flex-1 text-sm py-2"
                        onClick={() => saveOpinion(d.id)}
                        disabled={saving}
                      >
                        저장
                      </button>
                    </div>
                  </div>
                )}

                {/* 최종 결정 */}
                {d.final_decision ? (
                  <div
                    className="rounded-xl p-3"
                    style={{ backgroundColor: 'var(--green-light)' }}
                  >
                    <p className="text-xs font-medium mb-1" style={{ color: 'var(--green)' }}>
                      ✅ 최종 결정
                    </p>
                    <p className="text-sm" style={{ color: 'var(--ink)' }}>
                      {d.final_decision}
                    </p>
                  </div>
                ) : isEditingFin ? (
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
                        취소
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
                ) : (
                  <button
                    className="w-full py-2 rounded-xl text-xs font-medium mt-1"
                    style={{
                      backgroundColor: 'var(--beige)',
                      color: 'var(--stone)',
                    }}
                    onClick={() => { setEditingFinal(d.id); setFinalText(''); }}
                  >
                    최종 결정 입력하기
                  </button>
                )}
              </div>
            );
          })
        )}
      </div>

      <BottomNav active="decisions" />
    </div>
  );
}
