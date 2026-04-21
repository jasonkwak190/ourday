'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import BottomNav from '@/components/BottomNav';
import { Copy, Check, UserPlus, ClipboardList } from 'lucide-react';
import EmptyState from '@/components/EmptyState';
import GalleryTab from '@/components/GalleryTab';

const RELATIONS = ['가족', '친척', '친구', '직장', '지인', '기타'];

const EMPTY_FORM = {
  name: '',
  side: 'groom',
  relation: '친구',
  meal_count: 1,
  phone: '',
  memo: '',
};

function StatBadge({ label, value, color }) {
  return (
    <div className="flex flex-col items-center gap-0.5">
      <p className="text-xl font-bold" style={{ color }}>{value}</p>
      <p className="text-xs" style={{ color: 'var(--stone)' }}>{label}</p>
    </div>
  );
}

export default function GuestsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [coupleId, setCoupleId] = useState(null);
  const [guests, setGuests] = useState([]);
  const [budgetItems, setBudgetItems] = useState([]);

  // 탭: 'list' | 'gift' | 'rsvp'
  const [tab, setTab] = useState('list');

  // RSVP
  const [rsvpList, setRsvpList]   = useState([]);
  const [rsvpCopied, setRsvpCopied] = useState(false);

  // 필터: 'all' | 'groom' | 'bride'
  const [filter, setFilter] = useState('all');

  // 추가 폼
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // 수정/삭제/메뉴
  const [menuId, setMenuId] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState(EMPTY_FORM);

  // 축의금 입력
  const [giftEditId, setGiftEditId] = useState(null);
  const [giftInput, setGiftInput] = useState('');

  useEffect(() => {
    const load = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.push('/'); return; }

      const { data: user } = await supabase
        .from('users').select('couple_id').eq('id', session.user.id).single();

      if (!user?.couple_id) { router.push('/setup'); return; }
      const cId = user.couple_id;
      setCoupleId(cId);

      const [guestRes, budgetRes, rsvpRes] = await Promise.all([
        supabase.from('guests').select('*').eq('couple_id', cId).order('created_at'),
        supabase.from('budget_items').select('actual_amount').eq('couple_id', cId),
        supabase.from('rsvp_responses').select('*').eq('couple_id', cId).order('created_at', { ascending: false }),
      ]);

      setGuests(guestRes.data || []);
      setBudgetItems(budgetRes.data || []);
      setRsvpList(rsvpRes.data || []);
      setLoading(false);
    };
    load();
  }, [router]);

  // Realtime
  useEffect(() => {
    if (!coupleId) return;
    const channel = supabase
      .channel(`guests-${coupleId}`)
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'guests',
        filter: `couple_id=eq.${coupleId}`,
      }, (payload) => {
        if (payload.eventType === 'INSERT') {
          setGuests((prev) => prev.find((g) => g.id === payload.new.id) ? prev : [...prev, payload.new]);
        } else if (payload.eventType === 'UPDATE') {
          setGuests((prev) => prev.map((g) => g.id === payload.new.id ? payload.new : g));
        } else if (payload.eventType === 'DELETE') {
          setGuests((prev) => prev.filter((g) => g.id !== payload.old.id));
        }
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [coupleId]);

  async function handleAdd() {
    setError('');
    if (!form.name.trim()) { setError('이름을 입력해주세요.'); return; }
    setSaving(true);
    const { data, error: e } = await supabase
      .from('guests')
      .insert({
        couple_id: coupleId,
        name: form.name.trim(),
        side: form.side,
        relation: form.relation,
        meal_count: Number(form.meal_count) || 1,
        phone: form.phone.trim() || null,
        memo: form.memo.trim() || null,
      })
      .select().single();
    if (e) { setError('추가에 실패했어요.'); setSaving(false); return; }
    setGuests((prev) => [...prev, data]);
    setForm(EMPTY_FORM);
    setShowForm(false);
    setSaving(false);
  }

  function startEdit(guest) {
    setEditingId(guest.id);
    setEditForm({
      name: guest.name,
      side: guest.side,
      relation: guest.relation || '친구',
      meal_count: guest.meal_count ?? 1,
      phone: guest.phone || '',
      memo: guest.memo || '',
    });
    setMenuId(null);
  }

  async function handleEdit() {
    setError('');
    if (!editForm.name.trim()) { setError('이름을 입력해주세요.'); return; }
    setSaving(true);
    const updates = {
      name: editForm.name.trim(),
      side: editForm.side,
      relation: editForm.relation,
      meal_count: Number(editForm.meal_count) || 1,
      phone: editForm.phone.trim() || null,
      memo: editForm.memo.trim() || null,
    };
    const { error: e } = await supabase.from('guests').update(updates).eq('id', editingId);
    if (!e) setGuests((prev) => prev.map((g) => g.id === editingId ? { ...g, ...updates } : g));
    setEditingId(null);
    setSaving(false);
  }

  async function deleteGuest(id) {
    setGuests((prev) => prev.filter((g) => g.id !== id));
    await supabase.from('guests').delete().eq('id', id);
    setMenuId(null);
  }

  async function saveGiftAmount(guestId) {
    const val = parseInt(giftInput, 10);
    if (isNaN(val) || val < 0) { setGiftEditId(null); return; }
    const { error: e } = await supabase
      .from('guests').update({ gift_amount: val }).eq('id', guestId);
    if (!e) setGuests((prev) => prev.map((g) => g.id === guestId ? { ...g, gift_amount: val } : g));
    setGiftEditId(null);
  }

  if (loading) {
    return (
      <div className="page-wrapper flex items-center justify-center">
        <p className="text-sm" style={{ color: 'var(--stone)' }}>불러오는 중...</p>
      </div>
    );
  }

  // 집계
  const groomGuests = guests.filter((g) => g.side === 'groom');
  const brideGuests = guests.filter((g) => g.side === 'bride');
  const totalMeals = guests.reduce((s, g) => s + (g.meal_count || 1), 0);
  const groomMeals = groomGuests.reduce((s, g) => s + (g.meal_count || 1), 0);
  const brideMeals = brideGuests.reduce((s, g) => s + (g.meal_count || 1), 0);
  const totalGift = guests.reduce((s, g) => s + (g.gift_amount || 0), 0);
  const totalSpent = budgetItems.reduce((s, b) => s + (b.actual_amount || 0), 0);
  const balance = totalGift - totalSpent;

  const filtered = filter === 'all' ? guests
    : filter === 'groom' ? groomGuests
    : brideGuests;

  const SIDE_LABEL = { groom: '신랑측', bride: '신부측' };
  const SIDE_COLOR = { groom: 'var(--rose)', bride: 'var(--purple)' };

  return (
    <div className="page-wrapper" onClick={() => { setMenuId(null); setGiftEditId(null); }}>
      <h1 className="text-xl font-semibold mb-4" style={{ color: 'var(--ink)' }}>
        🎊 하객 관리
      </h1>

      {/* 요약 카드 */}
      <div className="card mb-4">
        <div className="flex justify-around py-1">
          <StatBadge label="신랑측" value={`${groomGuests.length}명`} color="var(--rose)" />
          <div style={{ width: '1px', backgroundColor: 'var(--beige)' }} />
          <StatBadge label="신부측" value={`${brideGuests.length}명`} color="var(--purple)" />
          <div style={{ width: '1px', backgroundColor: 'var(--beige)' }} />
          <StatBadge label="총 하객" value={`${guests.length}명`} color="var(--ink)" />
        </div>
        <div
          className="mt-3 pt-3 flex justify-around text-center"
          style={{ borderTop: '1px solid var(--beige)' }}
        >
          <div>
            <p className="text-xs" style={{ color: 'var(--stone)' }}>총 식사 수</p>
            <p className="text-base font-semibold mt-0.5" style={{ color: 'var(--ink)' }}>{totalMeals}식</p>
          </div>
          <div>
            <p className="text-xs" style={{ color: 'var(--stone)' }}>신랑측 식사</p>
            <p className="text-base font-semibold mt-0.5" style={{ color: 'var(--rose)' }}>{groomMeals}식</p>
          </div>
          <div>
            <p className="text-xs" style={{ color: 'var(--stone)' }}>신부측 식사</p>
            <p className="text-base font-semibold mt-0.5" style={{ color: 'var(--purple)' }}>{brideMeals}식</p>
          </div>
        </div>
      </div>

      {/* 탭 */}
      <div
        className="flex mb-4 rounded-2xl overflow-hidden"
        style={{ backgroundColor: 'var(--beige)' }}
      >
        {[{ key: 'list', label: '👥 명단' }, { key: 'gift', label: '💝 축의금' }, { key: 'rsvp', label: '✅ 참석' }, { key: 'photo', label: '📷 사진' }].map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className="flex-1 py-2.5 text-sm font-medium transition-all"
            style={{
              background: tab === t.key ? 'white' : 'none',
              color: tab === t.key ? 'var(--rose)' : 'var(--stone)',
              border: 'none',
              cursor: 'pointer',
              borderRadius: '1rem',
              margin: '4px',
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ── 하객 명단 탭 ── */}
      {tab === 'list' && (
        <>
          {/* 측 필터 */}
          <div className="flex gap-2 mb-3">
            {[
              { key: 'all', label: '전체' },
              { key: 'groom', label: '신랑측' },
              { key: 'bride', label: '신부측' },
            ].map((f) => (
              <button
                key={f.key}
                onClick={() => setFilter(f.key)}
                className="px-3 py-1.5 rounded-xl text-xs font-medium"
                style={{
                  backgroundColor: filter === f.key ? 'var(--rose-light)' : 'var(--beige)',
                  color: filter === f.key ? 'var(--rose)' : 'var(--stone)',
                  border: `1.5px solid ${filter === f.key ? 'var(--rose)' : 'transparent'}`,
                }}
              >
                {f.label} {f.key === 'all' ? guests.length : f.key === 'groom' ? groomGuests.length : brideGuests.length}
              </button>
            ))}
          </div>

          {/* 목록 */}
          <div className="flex flex-col gap-3 mb-4">
            {filtered.length === 0 ? (
              <div className="card">
                <EmptyState
                  icon={UserPlus}
                  title={filter === 'all' ? '아직 등록된 하객이 없어요' : `${SIDE_LABEL[filter]} 하객이 없어요`}
                  description={filter === 'all' ? '신랑·신부측 하객을 등록하고 축의금을 관리해보세요' : undefined}
                  action={filter === 'all' ? { label: '하객 추가하기', onClick: () => setShowForm(true) } : undefined}
                />
              </div>
            ) : (
              filtered.map((guest) => {
                const isEditing = editingId === guest.id;
                const isMenuOpen = menuId === guest.id;

                if (isEditing) {
                  return (
                    <div key={guest.id} className="card flex flex-col gap-3">
                      <p className="text-sm font-semibold" style={{ color: 'var(--ink)' }}>하객 수정</p>

                      {/* 신랑/신부측 선택 */}
                      <div className="flex gap-2">
                        {['groom', 'bride'].map((s) => (
                          <button
                            key={s}
                            onClick={() => setEditForm((f) => ({ ...f, side: s }))}
                            className="flex-1 py-2 rounded-xl text-sm font-medium"
                            style={{
                              backgroundColor: editForm.side === s ? 'var(--rose-light)' : 'var(--beige)',
                              color: editForm.side === s ? 'var(--rose)' : 'var(--stone)',
                              border: `1.5px solid ${editForm.side === s ? 'var(--rose)' : 'transparent'}`,
                            }}
                          >
                            {SIDE_LABEL[s]}
                          </button>
                        ))}
                      </div>

                      <input className="input-field" placeholder="이름" value={editForm.name}
                        onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))} />

                      {/* 관계 선택 */}
                      <div className="flex flex-wrap gap-2">
                        {RELATIONS.map((r) => (
                          <button
                            key={r}
                            onClick={() => setEditForm((f) => ({ ...f, relation: r }))}
                            className="px-3 py-1.5 rounded-xl text-xs font-medium"
                            style={{
                              backgroundColor: editForm.relation === r ? 'var(--rose-light)' : 'var(--beige)',
                              color: editForm.relation === r ? 'var(--rose)' : 'var(--stone)',
                              border: `1.5px solid ${editForm.relation === r ? 'var(--rose)' : 'transparent'}`,
                            }}
                          >
                            {r}
                          </button>
                        ))}
                      </div>

                      <div className="flex gap-2">
                        <div className="flex-1">
                          <p className="text-xs mb-1" style={{ color: 'var(--stone)' }}>식사 수</p>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => setEditForm((f) => ({ ...f, meal_count: Math.max(1, Number(f.meal_count) - 1) }))}
                              className="w-8 h-8 rounded-lg text-lg font-bold flex items-center justify-center"
                              style={{ backgroundColor: 'var(--beige)', color: 'var(--ink)', border: 'none', cursor: 'pointer' }}
                            >−</button>
                            <span className="text-base font-semibold w-6 text-center" style={{ color: 'var(--ink)' }}>{editForm.meal_count}</span>
                            <button
                              onClick={() => setEditForm((f) => ({ ...f, meal_count: Number(f.meal_count) + 1 }))}
                              className="w-8 h-8 rounded-lg text-lg font-bold flex items-center justify-center"
                              style={{ backgroundColor: 'var(--rose-light)', color: 'var(--rose)', border: 'none', cursor: 'pointer' }}
                            >+</button>
                          </div>
                        </div>
                        <input className="input-field flex-1" placeholder="연락처 (선택)" value={editForm.phone}
                          onChange={(e) => setEditForm((f) => ({ ...f, phone: e.target.value }))} />
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
                  <div
                    key={guest.id}
                    className="card flex items-center gap-3 relative"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {/* 측 컬러 바 */}
                    <div
                      className="w-1 self-stretch rounded-full flex-shrink-0"
                      style={{ backgroundColor: SIDE_COLOR[guest.side] }}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold" style={{ color: 'var(--ink)' }}>{guest.name}</p>
                        <span
                          className="text-xs px-2 py-0.5 rounded-full"
                          style={{
                            backgroundColor: guest.side === 'groom' ? 'var(--rose-light)' : 'var(--purple-light)',
                            color: SIDE_COLOR[guest.side],
                          }}
                        >
                          {SIDE_LABEL[guest.side]}
                        </span>
                      </div>
                      <p className="text-xs mt-0.5" style={{ color: 'var(--stone)' }}>
                        {guest.relation} · 식사 {guest.meal_count || 1}식
                        {guest.phone && ` · ${guest.phone}`}
                      </p>
                      {guest.memo && <p className="text-xs mt-0.5" style={{ color: 'var(--stone-light)' }}>{guest.memo}</p>}
                    </div>

                    <button
                      onClick={(e) => { e.stopPropagation(); setMenuId(isMenuOpen ? null : guest.id); }}
                      className="text-lg flex-shrink-0"
                      style={{ color: 'var(--stone)', background: 'none', border: 'none', cursor: 'pointer', padding: '0 2px' }}
                    >
                      ···
                    </button>

                    {isMenuOpen && (
                      <div
                        className="absolute right-0 z-10 rounded-xl shadow-lg overflow-hidden"
                        style={{ top: '100%', backgroundColor: 'white', border: '1.5px solid var(--stone-light)', minWidth: '110px' }}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button
                          className="w-full text-left px-4 py-3 text-sm font-medium"
                          style={{ color: 'var(--ink)', background: 'none', border: 'none', cursor: 'pointer' }}
                          onClick={() => startEdit(guest)}
                        >
                          ✏️ 수정
                        </button>
                        <div style={{ height: '1px', backgroundColor: 'var(--beige)' }} />
                        <button
                          className="w-full text-left px-4 py-3 text-sm font-medium"
                          style={{ color: 'var(--rose)', background: 'none', border: 'none', cursor: 'pointer' }}
                          onClick={() => deleteGuest(guest.id)}
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
              <p className="text-sm font-semibold" style={{ color: 'var(--ink)' }}>하객 추가</p>

              <div className="flex gap-2">
                {['groom', 'bride'].map((s) => (
                  <button
                    key={s}
                    onClick={() => setForm((f) => ({ ...f, side: s }))}
                    className="flex-1 py-2 rounded-xl text-sm font-medium"
                    style={{
                      backgroundColor: form.side === s ? 'var(--rose-light)' : 'var(--beige)',
                      color: form.side === s ? 'var(--rose)' : 'var(--stone)',
                      border: `1.5px solid ${form.side === s ? 'var(--rose)' : 'transparent'}`,
                    }}
                  >
                    {SIDE_LABEL[s]}
                  </button>
                ))}
              </div>

              <input className="input-field" placeholder="이름" value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />

              <div className="flex flex-wrap gap-2">
                {RELATIONS.map((r) => (
                  <button
                    key={r}
                    onClick={() => setForm((f) => ({ ...f, relation: r }))}
                    className="px-3 py-1.5 rounded-xl text-xs font-medium"
                    style={{
                      backgroundColor: form.relation === r ? 'var(--rose-light)' : 'var(--beige)',
                      color: form.relation === r ? 'var(--rose)' : 'var(--stone)',
                      border: `1.5px solid ${form.relation === r ? 'var(--rose)' : 'transparent'}`,
                    }}
                  >
                    {r}
                  </button>
                ))}
              </div>

              <div className="flex gap-2 items-end">
                <div className="flex-1">
                  <p className="text-xs mb-1" style={{ color: 'var(--stone)' }}>식사 수</p>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setForm((f) => ({ ...f, meal_count: Math.max(1, Number(f.meal_count) - 1) }))}
                      className="w-8 h-8 rounded-lg text-lg font-bold flex items-center justify-center"
                      style={{ backgroundColor: 'var(--beige)', color: 'var(--ink)', border: 'none', cursor: 'pointer' }}
                    >−</button>
                    <span className="text-base font-semibold w-6 text-center" style={{ color: 'var(--ink)' }}>{form.meal_count}</span>
                    <button
                      onClick={() => setForm((f) => ({ ...f, meal_count: Number(f.meal_count) + 1 }))}
                      className="w-8 h-8 rounded-lg text-lg font-bold flex items-center justify-center"
                      style={{ backgroundColor: 'var(--rose-light)', color: 'var(--rose)', border: 'none', cursor: 'pointer' }}
                    >+</button>
                  </div>
                </div>
                <input className="input-field flex-1" placeholder="연락처 (선택)" value={form.phone}
                  onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} />
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
            <button className="btn-outline w-full mb-4" onClick={() => setShowForm(true)}>
              + 하객 추가
            </button>
          )}
        </>
      )}

      {/* ── 축의금 탭 ── */}
      {tab === 'gift' && (
        <>
          {/* 측별 축의금 통계 */}
          {(() => {
            const groomGift   = groomGuests.reduce((s, g) => s + (g.gift_amount || 0), 0);
            const brideGift   = brideGuests.reduce((s, g) => s + (g.gift_amount || 0), 0);
            const recordedAll = guests.filter(g => g.gift_amount != null);
            const recordedGroom = groomGuests.filter(g => g.gift_amount != null);
            const recordedBride = brideGuests.filter(g => g.gift_amount != null);
            const avgAll   = recordedAll.length   > 0 ? Math.round(totalGift / recordedAll.length)   : 0;
            const avgGroom = recordedGroom.length > 0 ? Math.round(groomGift / recordedGroom.length) : 0;
            const avgBride = recordedBride.length > 0 ? Math.round(brideGift / recordedBride.length) : 0;

            return (
              <>
                {/* 측별 비교 */}
                <div className="card mb-4">
                  <p className="text-xs font-semibold mb-3" style={{ color: 'var(--toss-text-tertiary)' }}>측별 축의금</p>
                  <div className="flex gap-3">
                    {[
                      { label: '신랑측', gift: groomGift, avg: avgGroom, count: recordedGroom.length, color: 'var(--rose)' },
                      { label: '신부측', gift: brideGift, avg: avgBride, count: recordedBride.length, color: 'var(--toss-blue)' },
                    ].map(s => (
                      <div key={s.label} className="flex-1 rounded-2xl p-3" style={{ backgroundColor: 'var(--toss-bg)' }}>
                        <p className="text-xs font-semibold mb-2" style={{ color: s.color }}>{s.label}</p>
                        <p className="text-base font-bold tabular-nums" style={{ color: 'var(--toss-text-primary)' }}>
                          {s.gift.toLocaleString()}<span className="text-xs font-normal" style={{ color: 'var(--toss-text-tertiary)' }}>만원</span>
                        </p>
                        <p className="text-xs mt-1" style={{ color: 'var(--toss-text-tertiary)' }}>
                          평균 {s.avg.toLocaleString()}만원
                          {s.count > 0 && <span className="ml-1">({s.count}명 집계)</span>}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 손익 요약 */}
                <div className="card mb-4">
                  <p className="text-xs font-semibold mb-3" style={{ color: 'var(--toss-text-tertiary)' }}>축의금 vs 지출</p>
                  <div className="grid grid-cols-3 gap-3 text-center mb-3">
                    <div>
                      <p className="text-xs mb-1" style={{ color: 'var(--toss-text-tertiary)' }}>총 축의금</p>
                      <p className="text-base font-bold tabular-nums" style={{ color: 'var(--toss-green)' }}>
                        {totalGift.toLocaleString()}<span className="text-xs font-normal">만</span>
                      </p>
                    </div>
                    <div>
                      <p className="text-xs mb-1" style={{ color: 'var(--toss-text-tertiary)' }}>실제 지출</p>
                      <p className="text-base font-bold tabular-nums" style={{ color: 'var(--toss-red)' }}>
                        {totalSpent.toLocaleString()}<span className="text-xs font-normal">만</span>
                      </p>
                    </div>
                    <div>
                      <p className="text-xs mb-1" style={{ color: 'var(--toss-text-tertiary)' }}>인당 평균</p>
                      <p className="text-base font-bold tabular-nums" style={{ color: 'var(--toss-text-primary)' }}>
                        {avgAll.toLocaleString()}<span className="text-xs font-normal">만</span>
                      </p>
                    </div>
                  </div>
                  {totalSpent > 0 && (
                    <div>
                      <div className="flex justify-between text-xs mb-1" style={{ color: 'var(--toss-text-tertiary)' }}>
                        <span>손익</span>
                        <span style={{ color: balance >= 0 ? 'var(--toss-green)' : 'var(--toss-red)', fontWeight: 700 }}>
                          {balance >= 0 ? '+' : ''}{balance.toLocaleString()}만원
                        </span>
                      </div>
                      <div className="progress-bar">
                        <div className="progress-fill" style={{
                          width: `${Math.min(100, Math.round((totalGift / totalSpent) * 100))}%`,
                          backgroundColor: balance >= 0 ? 'var(--toss-green)' : 'var(--toss-red)',
                        }} />
                      </div>
                      <p className="text-xs mt-1 text-right" style={{ color: 'var(--toss-text-tertiary)' }}>
                        지출 대비 {Math.round((totalGift / totalSpent) * 100)}%
                      </p>
                    </div>
                  )}
                </div>
              </>
            );
          })()}

          {/* 하객별 축의금 목록 */}
          <div className="flex flex-col gap-3 mb-4">
            {guests.length === 0 ? (
              <div className="card text-center py-8">
                <p className="text-2xl mb-2">💝</p>
                <p className="text-sm" style={{ color: 'var(--stone)' }}>
                  먼저 하객 명단 탭에서 하객을 추가해주세요
                </p>
              </div>
            ) : (
              guests.map((guest) => {
                const isGiftEditing = giftEditId === guest.id;
                return (
                  <div
                    key={guest.id}
                    className="card flex items-center gap-3"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div
                      className="w-1 self-stretch rounded-full flex-shrink-0"
                      style={{ backgroundColor: SIDE_COLOR[guest.side] }}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold" style={{ color: 'var(--ink)' }}>{guest.name}</p>
                      <p className="text-xs mt-0.5" style={{ color: 'var(--stone)' }}>
                        {SIDE_LABEL[guest.side]} · {guest.relation}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {isGiftEditing ? (
                        <>
                          <input
                            className="input-field text-sm py-1 px-2 text-right"
                            style={{ width: '80px' }}
                            type="number"
                            placeholder="0"
                            value={giftInput}
                            onChange={(e) => setGiftInput(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && saveGiftAmount(guest.id)}
                            autoFocus
                          />
                          <span className="text-xs" style={{ color: 'var(--stone)' }}>만원</span>
                          <button
                            onClick={() => saveGiftAmount(guest.id)}
                            className="text-xs font-medium"
                            style={{ color: 'var(--rose)', background: 'none', border: 'none', cursor: 'pointer' }}
                          >저장</button>
                        </>
                      ) : (
                        <button
                          onClick={() => {
                            setGiftEditId(guest.id);
                            setGiftInput(String(guest.gift_amount ?? ''));
                          }}
                          className="text-right"
                          style={{ background: 'none', border: 'none', cursor: 'pointer' }}
                        >
                          {guest.gift_amount != null ? (
                            <p className="text-sm font-semibold" style={{ color: 'var(--green)' }}>
                              {guest.gift_amount.toLocaleString()}만원
                            </p>
                          ) : (
                            <p className="text-sm" style={{ color: 'var(--stone-light)' }}>입력</p>
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </>
      )}

      {/* ── RSVP 탭 ── */}
      {tab === 'rsvp' && (
        <>
          {/* 참석 확인 링크 공유 */}
          <div className="card mb-4">
            <p className="text-xs font-semibold mb-1" style={{ color: 'var(--toss-text-tertiary)' }}>
              참석 확인 링크를 하객에게 공유하세요
            </p>
            <p className="text-xs mb-3" style={{ color: 'var(--toss-text-tertiary)' }}>
              링크를 열면 참석 여부를 바로 알려줄 수 있어요
            </p>
            <button
              onClick={async () => {
                const url = `${window.location.origin}/rsvp/${coupleId}`;
                await navigator.clipboard.writeText(url);
                setRsvpCopied(true);
                setTimeout(() => setRsvpCopied(false), 2000);
              }}
              style={{
                width: '100%', height: 48, borderRadius: 12,
                border: '1.5px solid var(--toss-blue)',
                backgroundColor: rsvpCopied ? 'var(--toss-blue-light)' : 'transparent',
                color: 'var(--toss-blue)', fontWeight: 700, fontSize: 14,
                cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              }}
            >
              {rsvpCopied
                ? <><Check size={16} />복사됐어요!</>
                : <><Copy size={16} />참석 확인 링크 복사</>
              }
            </button>
          </div>

          {/* RSVP 집계 */}
          {rsvpList.length > 0 && (
            <div className="card mb-4">
              <div className="flex justify-around py-1">
                <div className="flex flex-col items-center gap-0.5">
                  <p className="text-xl font-bold" style={{ color: 'var(--toss-blue)' }}>
                    {rsvpList.filter(r => r.attending).length}
                  </p>
                  <p className="text-xs" style={{ color: 'var(--toss-text-tertiary)' }}>참석</p>
                </div>
                <div style={{ width: 1, backgroundColor: 'var(--toss-border)' }} />
                <div className="flex flex-col items-center gap-0.5">
                  <p className="text-xl font-bold" style={{ color: 'var(--toss-text-secondary)' }}>
                    {rsvpList.filter(r => !r.attending).length}
                  </p>
                  <p className="text-xs" style={{ color: 'var(--toss-text-tertiary)' }}>불참</p>
                </div>
                <div style={{ width: 1, backgroundColor: 'var(--toss-border)' }} />
                <div className="flex flex-col items-center gap-0.5">
                  <p className="text-xl font-bold" style={{ color: 'var(--toss-text-primary)' }}>
                    {rsvpList.filter(r => r.attending).reduce((s, r) => s + (r.meal_count || 1), 0)}
                  </p>
                  <p className="text-xs" style={{ color: 'var(--toss-text-tertiary)' }}>총 식사</p>
                </div>
              </div>
            </div>
          )}

          {/* RSVP 응답 목록 */}
          <div className="flex flex-col gap-3 mb-4">
            {rsvpList.length === 0 ? (
              <div className="card">
                <EmptyState
                  icon={ClipboardList}
                  title="아직 참석 확인 답변이 없어요"
                  description="위 링크를 하객에게 공유하면 답변이 여기에 모여요"
                  compact
                />
              </div>
            ) : (
              rsvpList.map((r) => (
                <div key={r.id} className="card flex items-start gap-3">
                  <div
                    className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-base"
                    style={{ backgroundColor: r.attending ? 'var(--toss-blue-light)' : '#f2f4f6' }}
                  >
                    {r.attending ? '🎉' : '🙏'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold" style={{ color: 'var(--toss-text-primary)' }}>
                        {r.name}
                      </p>
                      <span
                        className="text-xs px-2 py-0.5 rounded-full font-medium"
                        style={{
                          backgroundColor: r.attending ? 'var(--toss-blue-light)' : '#f2f4f6',
                          color: r.attending ? 'var(--toss-blue)' : 'var(--toss-text-tertiary)',
                        }}
                      >
                        {r.attending ? `참석 · ${r.meal_count || 1}명` : '불참'}
                      </span>
                    </div>
                    {r.phone && (
                      <p className="text-xs mt-0.5" style={{ color: 'var(--toss-text-tertiary)' }}>{r.phone}</p>
                    )}
                    {r.message && (
                      <p className="text-xs mt-1 italic" style={{ color: 'var(--toss-text-secondary)' }}>
                        "{r.message}"
                      </p>
                    )}
                    <p className="text-xs mt-0.5" style={{ color: 'var(--toss-text-tertiary)' }}>
                      {new Date(r.created_at).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </>
      )}

      {/* ── 사진 탭 ── */}
      {tab === 'photo' && <GalleryTab />}

      <BottomNav active="guests" />
    </div>
  );
}
