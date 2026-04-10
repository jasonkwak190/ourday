'use client';

export const dynamic = 'force-dynamic';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import BottomNav from '@/components/BottomNav';

const TABS = [
  { label: '이번달',    value: 'current' },
  { label: '12개월 전', value: 12 },
  { label: '10개월 전', value: 10 },
  { label: '8개월 전',  value: 8 },
  { label: '6개월 전',  value: 6 },
  { label: '4개월 전',  value: 4 },
  { label: '3개월 전',  value: 3 },
  { label: '2개월 전',  value: 2 },
  { label: '1개월 전',  value: 1 },
  { label: 'D-2주',    value: 0.5 },
  { label: 'D-1주',    value: 0.25 },
  { label: '전체',     value: 'all' },
];

const TIME_PERIODS = [
  { label: '12개월 전', value: 12 },
  { label: '10개월 전', value: 10 },
  { label: '8개월 전',  value: 8 },
  { label: '6개월 전',  value: 6 },
  { label: '4개월 전',  value: 4 },
  { label: '3개월 전',  value: 3 },
  { label: '2개월 전',  value: 2 },
  { label: '1개월 전',  value: 1 },
  { label: 'D-2주',    value: 0.5 },
  { label: 'D-1주',    value: 0.25 },
];

const ASSIGNED_LABELS = {
  groom: { label: '신랑', cls: 'tag-stone' },
  bride: { label: '신부', cls: 'tag-rose' },
  both:  { label: '둘다', cls: 'tag-green' },
};
const ASSIGNED_OPTIONS = ['both', 'groom', 'bride'];

const VENUE_CHECKLIST = [
  { category: '💰 비용', items: ['대관료 (부가세 포함 여부)', '식대 (대인/소인 구분)', '추가 인원 식대 적용 방식', '현금 결제 시 추가 할인 혜택', '부가세 및 봉사료 포함 여부'] },
  { category: '📝 계약', items: ['보증 인원 및 좌석 수', '계약금 / 중도금 / 잔금', '계약금 환불 기간 (100%/70%/50%/불가)', '당일 계약 혜택 확인 (사회자·포토테이블·플라워샤워 등)'] },
  { category: '📸 촬영', items: ['본식스냅·DVD 연계 업체 유무', '외부 업체 이용 가능 여부'] },
  { category: '🍽 식사', items: ['음식 가짓수 (뷔페/코스/한식)', '식사 이용 시간', '주류·음료 서비스 여부 및 단가', '혼주 식사 공간', '시식 인원 및 가능 시기'] },
  { category: '🏛 시설', items: ['예식 진행 시간', '층고 / 버진로드 길이', '신부대기실 내 화장실 유무', '혼주 대기실·락커', '포토테이블 위치 및 비용', '꽃장식 종류 (생화/조화)'] },
  { category: '🚗 교통·기타', items: ['주차 수용 대수', '대중교통 접근성', '셔틀버스 유무', 'ATM기 유무', '화환 반입 가능 여부'] },
];

export default function TimelinePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState([]);
  const [activeTab, setActiveTab] = useState('current');
  const [coupleId, setCoupleId] = useState(null);
  const [weddingDate, setWeddingDate] = useState(null);

  // 추가 폼
  const [adding, setAdding] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newAssigned, setNewAssigned] = useState('both');
  const [newMonths, setNewMonths] = useState(1);
  const [newMemo, setNewMemo] = useState('');
  const [saving, setSaving] = useState(false);

  // 수정/삭제
  const [menuId, setMenuId] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [editTitle, setEditTitle] = useState('');
  const [editAssigned, setEditAssigned] = useState('both');
  const [editMemo, setEditMemo] = useState('');

  // 메모 토글
  const [expandedMemo, setExpandedMemo] = useState(null);

  // 웨딩홀 투어 체크리스트
  const [showVenueTour, setShowVenueTour] = useState(false);
  const [venueChecked, setVenueChecked] = useState({});

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
        supabase.from('couples').select('wedding_date').eq('id', cId).single(),
        supabase.from('checklist_items').select('*').eq('couple_id', cId).order('due_months_before', { ascending: false }),
      ]);

      setWeddingDate(coupleRes.data?.wedding_date || null);
      setItems(itemsRes.data || []);
      setLoading(false);
    };
    load();
  }, [router]);

  // Realtime 구독
  useEffect(() => {
    if (!coupleId) return;
    const channel = supabase
      .channel(`timeline-${coupleId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'checklist_items', filter: `couple_id=eq.${coupleId}` }, (payload) => {
        if (payload.eventType === 'INSERT') {
          setItems((prev) => prev.find((i) => i.id === payload.new.id) ? prev : [...prev, payload.new]);
        } else if (payload.eventType === 'UPDATE') {
          setItems((prev) => prev.map((i) => i.id === payload.new.id ? payload.new : i));
        } else if (payload.eventType === 'DELETE') {
          setItems((prev) => prev.filter((i) => i.id !== payload.old.id));
        }
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [coupleId]);

  async function toggleItem(id, current) {
    setItems((prev) => prev.map((it) => it.id === id ? { ...it, is_done: !current } : it));
    await supabase.from('checklist_items').update({ is_done: !current }).eq('id', id);
  }

  async function addItem() {
    if (!newTitle.trim() || !coupleId) return;
    setSaving(true);
    const months = activeTab === 'current' || activeTab === 'all' ? newMonths : activeTab;
    const { data, error } = await supabase
      .from('checklist_items')
      .insert({ couple_id: coupleId, title: newTitle.trim(), due_months_before: months, assigned_to: newAssigned, is_done: false, memo: newMemo.trim() || null })
      .select().single();
    if (!error && data) setItems((prev) => [...prev, data]);
    setNewTitle(''); setNewAssigned('both'); setNewMemo('');
    setAdding(false); setSaving(false);
  }

  function startEdit(item) {
    setEditingId(item.id);
    setEditTitle(item.title);
    setEditAssigned(item.assigned_to);
    setEditMemo(item.memo || '');
    setMenuId(null);
  }

  async function saveEdit(id) {
    if (!editTitle.trim()) return;
    const updates = { title: editTitle.trim(), assigned_to: editAssigned, memo: editMemo.trim() || null };
    setItems((prev) => prev.map((it) => it.id === id ? { ...it, ...updates } : it));
    await supabase.from('checklist_items').update(updates).eq('id', id);
    setEditingId(null);
  }

  async function deleteItem(id) {
    setItems((prev) => prev.filter((it) => it.id !== id));
    await supabase.from('checklist_items').delete().eq('id', id);
    setMenuId(null);
  }

  function filterItems() {
    if (activeTab === 'all') return items;
    if (activeTab === 'current') {
      if (!weddingDate) return items;
      const today = new Date();
      const wedding = new Date(weddingDate);
      const monthsDiff = (wedding - today) / (1000 * 60 * 60 * 24 * 30);
      return items.filter((i) => i.due_months_before >= monthsDiff - 0.5 && i.due_months_before <= monthsDiff + 1.5);
    }
    return items.filter((i) => i.due_months_before === activeTab);
  }

  const displayed = filterItems();
  const doneCount = displayed.filter((i) => i.is_done).length;

  function renderItem(item) {
    const tag = ASSIGNED_LABELS[item.assigned_to] || ASSIGNED_LABELS.both;
    const isEditing = editingId === item.id;
    const isMenuOpen = menuId === item.id;
    const memoExpanded = expandedMemo === item.id;

    if (isEditing) {
      return (
        <div key={item.id} className="py-3 flex flex-col gap-2 border-b" style={{ borderColor: 'var(--beige)' }}>
          <input className="input-field text-sm" value={editTitle}
            onChange={(e) => setEditTitle(e.target.value)} autoFocus
            onKeyDown={(e) => e.key === 'Enter' && saveEdit(item.id)} />
          <div className="flex gap-2">
            {ASSIGNED_OPTIONS.map((a) => (
              <button key={a} onClick={() => setEditAssigned(a)}
                className="flex-1 py-1.5 rounded-xl text-xs font-medium transition-all"
                style={{ backgroundColor: editAssigned === a ? 'var(--rose)' : 'white', color: editAssigned === a ? 'white' : 'var(--stone)', border: `1.5px solid ${editAssigned === a ? 'var(--rose)' : 'var(--stone-light)'}` }}>
                {ASSIGNED_LABELS[a].label}
              </button>
            ))}
          </div>
          <textarea className="input-field text-sm resize-none" rows={2}
            placeholder="메모 (업체명, 계약금, 연락처 등)"
            value={editMemo} onChange={(e) => setEditMemo(e.target.value)} />
          <div className="flex gap-2">
            <button className="btn-outline flex-1 text-sm py-2" onClick={() => setEditingId(null)}>취소</button>
            <button className="btn-rose flex-1 text-sm py-2" onClick={() => saveEdit(item.id)}>저장</button>
          </div>
        </div>
      );
    }

    return (
      <li key={item.id} className="py-3 relative border-b last:border-0" style={{ borderColor: 'var(--beige)' }}>
        <div className="flex items-center gap-3">
          <button onClick={() => toggleItem(item.id, item.is_done)}
            className="flex-shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all"
            style={{ borderColor: item.is_done ? 'var(--rose)' : 'var(--stone-light)', backgroundColor: item.is_done ? 'var(--rose)' : 'transparent' }}>
            {item.is_done && <span className="text-white text-xs">✓</span>}
          </button>
          <div className="flex-1 min-w-0">
            <span className="text-sm" style={{ color: item.is_done ? 'var(--stone)' : 'var(--ink)', textDecoration: item.is_done ? 'line-through' : 'none' }}>
              {item.title}
            </span>
            {item.memo && !memoExpanded && (
              <p className="text-xs mt-0.5 truncate" style={{ color: 'var(--stone)' }}>{item.memo}</p>
            )}
          </div>
          <span className={`tag ${tag.cls} flex-shrink-0`}>{tag.label}</span>
          <button onClick={() => setExpandedMemo(memoExpanded ? null : item.id)}
            className="text-sm flex-shrink-0"
            style={{ color: item.memo ? 'var(--rose)' : 'var(--stone-light)', background: 'none', border: 'none', cursor: 'pointer', padding: '0 2px' }}>
            📝
          </button>
          <button onClick={(e) => { e.stopPropagation(); setMenuId(isMenuOpen ? null : item.id); }}
            className="text-lg flex-shrink-0"
            style={{ color: 'var(--stone)', background: 'none', border: 'none', cursor: 'pointer', padding: '0 2px' }}>
            ···
          </button>
        </div>

        {/* 메모 펼침 */}
        {memoExpanded && (
          <MemoEditor item={item} onSave={async (text) => {
            const memo = text.trim() || null;
            setItems((prev) => prev.map((it) => it.id === item.id ? { ...it, memo } : it));
            setExpandedMemo(null);
            await supabase.from('checklist_items').update({ memo }).eq('id', item.id);
          }} onClose={() => setExpandedMemo(null)} />
        )}

        {/* 드롭다운 메뉴 */}
        {isMenuOpen && (
          <div className="absolute right-0 z-10 rounded-xl shadow-lg overflow-hidden"
            style={{ top: '100%', backgroundColor: 'white', border: '1.5px solid var(--stone-light)', minWidth: '100px' }}
            onClick={(e) => e.stopPropagation()}>
            <button className="w-full text-left px-4 py-3 text-sm font-medium"
              style={{ color: 'var(--ink)', background: 'none', border: 'none', cursor: 'pointer' }}
              onClick={() => startEdit(item)}>✏️ 수정</button>
            <div style={{ height: '1px', backgroundColor: 'var(--beige)' }} />
            <button className="w-full text-left px-4 py-3 text-sm font-medium"
              style={{ color: 'var(--rose)', background: 'none', border: 'none', cursor: 'pointer' }}
              onClick={() => deleteItem(item.id)}>🗑 삭제</button>
          </div>
        )}
      </li>
    );
  }

  if (loading) {
    return (
      <div className="page-wrapper flex items-center justify-center">
        <p className="text-sm" style={{ color: 'var(--stone)' }}>불러오는 중...</p>
      </div>
    );
  }

  const venueTotal = VENUE_CHECKLIST.reduce((s, c) => s + c.items.length, 0);
  const venueCheckedCount = Object.values(venueChecked).filter(Boolean).length;

  return (
    <div className="page-wrapper" onClick={() => setMenuId(null)}>
      <h1 className="text-xl font-semibold mb-4" style={{ color: 'var(--ink)' }}>📅 준비 타임라인</h1>

      {/* 웨딩홀 투어 체크리스트 */}
      <div className="card mb-4" style={{ border: `1.5px solid ${showVenueTour ? 'var(--rose)' : 'var(--stone-light)'}` }}>
        <button className="w-full flex items-center justify-between" style={{ background: 'none', border: 'none', cursor: 'pointer' }}
          onClick={() => setShowVenueTour(!showVenueTour)}>
          <div className="text-left">
            <p className="text-sm font-semibold" style={{ color: 'var(--rose)' }}>🏛 웨딩홀 투어 체크리스트</p>
            <p className="text-xs mt-0.5" style={{ color: 'var(--stone)' }}>
              {venueCheckedCount > 0 ? `${venueCheckedCount}/${venueTotal} 확인` : `투어 시 확인할 ${venueTotal}가지 항목`}
            </p>
          </div>
          <span style={{ color: 'var(--stone)' }}>{showVenueTour ? '▲' : '▼'}</span>
        </button>

        {showVenueTour && (
          <div className="mt-4" onClick={(e) => e.stopPropagation()}>
            <div className="mb-3">
              <div className="flex justify-between text-xs mb-1" style={{ color: 'var(--stone)' }}>
                <span>진행률</span><span>{venueCheckedCount}/{venueTotal}</span>
              </div>
              <div className="progress-bar">
                <div className="progress-fill" style={{ width: `${venueTotal > 0 ? Math.round(venueCheckedCount / venueTotal * 100) : 0}%` }} />
              </div>
            </div>
            {VENUE_CHECKLIST.map((section) => (
              <div key={section.category} className="mb-3">
                <p className="text-xs font-semibold mb-1.5" style={{ color: 'var(--ink)' }}>{section.category}</p>
                {section.items.map((item) => {
                  const key = `${section.category}-${item}`;
                  const isChecked = !!venueChecked[key];
                  return (
                    <div key={item} className="flex items-start gap-2 py-1 cursor-pointer"
                      onClick={() => setVenueChecked((p) => ({ ...p, [key]: !p[key] }))}>
                      <div className="flex-shrink-0 w-4 h-4 rounded border-2 flex items-center justify-center mt-0.5 transition-all"
                        style={{ borderColor: isChecked ? 'var(--rose)' : 'var(--stone-light)', backgroundColor: isChecked ? 'var(--rose)' : 'white' }}>
                        {isChecked && <span className="text-white" style={{ fontSize: '9px' }}>✓</span>}
                      </div>
                      <span className="text-xs flex-1" style={{ color: isChecked ? 'var(--stone)' : 'var(--ink)', textDecoration: isChecked ? 'line-through' : 'none' }}>
                        {item}
                      </span>
                    </div>
                  );
                })}
              </div>
            ))}
            <button className="text-xs mt-1" style={{ color: 'var(--stone)', background: 'none', border: 'none', cursor: 'pointer' }}
              onClick={() => setVenueChecked({})}>초기화</button>
          </div>
        )}
      </div>

      {/* 탭 */}
      <div className="flex gap-2 overflow-x-auto pb-2 mb-3" style={{ scrollbarWidth: 'none' }}>
        {TABS.map((t) => {
          const isActive = t.value === activeTab;
          return (
            <button key={String(t.value)} onClick={() => setActiveTab(t.value)}
              className="flex-shrink-0 px-4 py-1.5 rounded-full text-sm font-medium transition-all"
              style={{ backgroundColor: isActive ? 'var(--rose)' : 'white', color: isActive ? 'white' : 'var(--stone)', border: `1.5px solid ${isActive ? 'var(--rose)' : 'var(--stone-light)'}` }}>
              {t.label}
            </button>
          );
        })}
      </div>

      {/* 전체 보기: 기간별 섹션 */}
      {activeTab === 'all' ? (
        <div className="flex flex-col gap-4 mb-4">
          {TIME_PERIODS.map((period) => {
            const periodItems = items.filter((i) => i.due_months_before === period.value);
            if (periodItems.length === 0) return null;
            const doneCnt = periodItems.filter((i) => i.is_done).length;
            return (
              <div key={period.value}>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-semibold" style={{ color: 'var(--stone)' }}>{period.label}</p>
                  <p className="text-xs" style={{ color: 'var(--stone)' }}>{doneCnt}/{periodItems.length}</p>
                </div>
                <div className="card p-0">
                  <ul>{periodItems.map((item) => renderItem(item))}</ul>
                </div>
              </div>
            );
          })}
          {items.length === 0 && (
            <div className="card text-center py-8">
              <p className="text-sm" style={{ color: 'var(--stone)' }}>항목이 없어요</p>
            </div>
          )}
        </div>
      ) : (
        <>
          {displayed.length > 0 && (
            <p className="text-xs mb-2" style={{ color: 'var(--stone)' }}>{doneCount}/{displayed.length} 완료</p>
          )}
          <div className="card mb-4 p-0">
            {displayed.length === 0 ? (
              <p className="text-sm text-center py-8" style={{ color: 'var(--stone)' }}>항목이 없어요</p>
            ) : (
              <ul className="px-4">{displayed.map((item) => renderItem(item))}</ul>
            )}
          </div>
        </>
      )}

      {/* 항목 추가 */}
      {adding ? (
        <div className="card flex flex-col gap-3 mb-4">
          <input className="input-field" placeholder="항목 이름 입력" value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)} autoFocus
            onKeyDown={(e) => e.key === 'Enter' && addItem()} />
          <div>
            <p className="text-xs mb-1.5" style={{ color: 'var(--stone)' }}>담당</p>
            <div className="flex gap-2">
              {ASSIGNED_OPTIONS.map((a) => (
                <button key={a} onClick={() => setNewAssigned(a)}
                  className="flex-1 py-2 rounded-xl text-sm font-medium transition-all"
                  style={{ backgroundColor: newAssigned === a ? 'var(--rose)' : 'white', color: newAssigned === a ? 'white' : 'var(--stone)', border: `1.5px solid ${newAssigned === a ? 'var(--rose)' : 'var(--stone-light)'}` }}>
                  {ASSIGNED_LABELS[a].label}
                </button>
              ))}
            </div>
          </div>
          {(activeTab === 'current' || activeTab === 'all') && (
            <div>
              <p className="text-xs mb-1.5" style={{ color: 'var(--stone)' }}>시기</p>
              <select className="input-field text-sm" value={newMonths} onChange={(e) => setNewMonths(Number(e.target.value))}>
                <option value={12}>12개월 전</option>
                <option value={10}>10개월 전</option>
                <option value={8}>8개월 전</option>
                <option value={6}>6개월 전</option>
                <option value={4}>4개월 전</option>
                <option value={3}>3개월 전</option>
                <option value={2}>2개월 전</option>
                <option value={1}>1개월 전</option>
                <option value={0.5}>D-2주</option>
                <option value={0.25}>D-1주</option>
              </select>
            </div>
          )}
          <div>
            <p className="text-xs mb-1.5" style={{ color: 'var(--stone)' }}>메모 (업체명, 계약금 등)</p>
            <textarea className="input-field text-sm resize-none" rows={2} placeholder="선택사항" value={newMemo}
              onChange={(e) => setNewMemo(e.target.value)} />
          </div>
          <div className="flex gap-2">
            <button className="btn-outline flex-1" onClick={() => { setAdding(false); setNewTitle(''); setNewMemo(''); }}>취소</button>
            <button className="btn-rose flex-1" onClick={addItem} disabled={saving || !newTitle.trim()}>
              {saving ? '추가 중...' : '추가'}
            </button>
          </div>
        </div>
      ) : (
        <button className="btn-outline w-full" onClick={() => setAdding(true)}>+ 항목 추가</button>
      )}

      <BottomNav active="timeline" />
    </div>
  );
}

function MemoEditor({ item, onSave, onClose }) {
  const [text, setText] = useState(item.memo || '');
  return (
    <div className="mt-2 flex flex-col gap-2">
      <textarea
        className="input-field text-sm resize-none"
        rows={3}
        placeholder="업체명, 계약금, 연락처, 메모 등..."
        value={text}
        onChange={(e) => setText(e.target.value)}
        autoFocus
      />
      <div className="flex gap-2">
        <button className="btn-outline flex-1 text-sm py-2" onClick={onClose}>닫기</button>
        <button className="btn-rose flex-1 text-sm py-2" onClick={() => onSave(text)}>저장</button>
      </div>
    </div>
  );
}
