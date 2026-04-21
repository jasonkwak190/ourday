'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import BottomNav from '@/components/BottomNav';
import EmptyState from '@/components/EmptyState';
import {
  CheckSquare, List, CalendarDays,
  ChevronLeft, ChevronRight, Heart, Building2,
} from 'lucide-react';

/* ─── 캘린더 유틸 ─────────────────────────────────────────── */
const PERIOD_OFFSET = {
  '12개월 전': { months: -12 },
  '10개월 전': { months: -10 },
  '8개월 전':  { months: -8  },
  '6개월 전':  { months: -6  },
  '4개월 전':  { months: -4  },
  '3개월 전':  { months: -3  },
  '2개월 전':  { months: -2  },
  '1개월 전':  { months: -1  },
  'D-2주':     { days: -14   },
  'D-1주':     { days: -7    },
};

function getPeriodDate(weddingDateStr, period) {
  const d = new Date(weddingDateStr);
  const offset = PERIOD_OFFSET[period];
  if (!offset) return null;
  if (offset.months) d.setMonth(d.getMonth() + offset.months);
  if (offset.days)   d.setDate(d.getDate() + offset.days);
  return d;
}
function isSameMonth(d, y, m) {
  return d.getFullYear() === y && d.getMonth() === m;
}
function isSameDay(d1, d2) {
  return d1.getFullYear() === d2.getFullYear() &&
         d1.getMonth()    === d2.getMonth()    &&
         d1.getDate()     === d2.getDate();
}

const DAY_LABELS = ['일', '월', '화', '수', '목', '금', '토'];

function buildCalEvents(year, month, weddingDate, checkItems, vendors) {
  const result = [];
  if (!weddingDate) return result;

  const wd = new Date(weddingDate);
  if (isSameMonth(wd, year, month)) {
    result.push({ date: wd, title: '💍 결혼식 당일', sub: '축하해요!',
      color: 'var(--toss-red)', Icon: Heart, badge: 'D-Day' });
  }

  const periodGroups = {};
  checkItems.forEach(item => {
    const d = getPeriodDate(weddingDate, item.time_period);
    if (!d || !isSameMonth(d, year, month)) return;
    const key = item.time_period;
    if (!periodGroups[key]) periodGroups[key] = { date: d, total: 0, done: 0 };
    periodGroups[key].total++;
    if (item.is_done) periodGroups[key].done++;
  });
  Object.entries(periodGroups).forEach(([period, { date, total, done }]) => {
    result.push({ date, title: `${period} 준비 항목`, sub: `${done}/${total}개 완료`,
      color: 'var(--toss-blue)', Icon: CheckSquare,
      badge: done === total ? '완료' : `${total - done}개 남음` });
  });

  vendors.forEach(v => {
    if (!v.balance_due || v.contract_status === 'done') return;
    const d = new Date(v.balance_due);
    if (!isSameMonth(d, year, month)) return;
    const dday = Math.ceil((d - new Date()) / (1000 * 60 * 60 * 24));
    result.push({ date: d, title: `${v.name} 잔금 납부`, sub: v.type,
      color: 'var(--toss-yellow)', Icon: Building2,
      badge: dday > 0 ? `D-${dday}` : dday === 0 ? 'D-Day' : '지남' });
  });

  return result;
}

/* ─── 타임라인 상수 ──────────────────────────────────────── */
const TIME_PERIODS = [
  { label: '12개월 전', value: 12 },
  { label: '10개월 전', value: 10 },
  { label: '8개월 전',  value: 8  },
  { label: '6개월 전',  value: 6  },
  { label: '4개월 전',  value: 4  },
  { label: '3개월 전',  value: 3  },
  { label: '2개월 전',  value: 2  },
  { label: '1개월 전',  value: 1  },
  { label: 'D-2주',    value: 0.5 },
  { label: 'D-1주',    value: 0.25 },
];

const ASSIGNED_LABELS = {
  groom: { label: '신랑', cls: 'tag-stone' },
  bride: { label: '신부', cls: 'tag-rose'  },
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

/* ─── 메인 컴포넌트 ──────────────────────────────────────── */
export default function TimelinePage() {
  const router  = useRouter();
  const todayDt = new Date();

  /* 공통 데이터 */
  const [loading,     setLoading]     = useState(true);
  const [items,       setItems]       = useState([]);
  const [coupleId,    setCoupleId]    = useState(null);
  const [weddingDate, setWeddingDate] = useState(null);
  const [vendors,     setVendors]     = useState([]);

  /* 뷰 모드 */
  const [viewMode, setViewMode] = useState('list'); // 'list' | 'calendar'

  /* 리스트 뷰 상태 */
  const [activeTab,    setActiveTab]    = useState('current');
  const [adding,       setAdding]       = useState(false);
  const [newTitle,     setNewTitle]     = useState('');
  const [newAssigned,  setNewAssigned]  = useState('both');
  const [newMonths,    setNewMonths]    = useState(1);
  const [newMemo,      setNewMemo]      = useState('');
  const [saving,       setSaving]       = useState(false);
  const [menuId,       setMenuId]       = useState(null);
  const [editingId,    setEditingId]    = useState(null);
  const [editTitle,    setEditTitle]    = useState('');
  const [editAssigned, setEditAssigned] = useState('both');
  const [editMemo,     setEditMemo]     = useState('');
  const [expandedMemo, setExpandedMemo] = useState(null);
  const [showVenueTour,setShowVenueTour]= useState(false);
  const [venueChecked, setVenueChecked] = useState({});

  /* 캘린더 뷰 상태 */
  const [calYear,     setCalYear]     = useState(todayDt.getFullYear());
  const [calMonth,    setCalMonth]    = useState(todayDt.getMonth());
  const [calSelected, setCalSelected] = useState(null);

  /* ─ 데이터 로드 ─ */
  useEffect(() => {
    const load = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.push('/'); return; }

      const { data: user } = await supabase
        .from('users').select('couple_id').eq('id', session.user.id).single();
      if (!user?.couple_id) { router.push('/setup'); return; }
      const cId = user.couple_id;
      setCoupleId(cId);

      const [coupleRes, itemsRes, vendorRes] = await Promise.all([
        supabase.from('couples').select('wedding_date').eq('id', cId).single(),
        supabase.from('checklist_items').select('*').eq('couple_id', cId).order('due_months_before', { ascending: false }),
        supabase.from('vendors').select('id,name,type,balance_due,contract_status').eq('couple_id', cId),
      ]);

      setWeddingDate(coupleRes.data?.wedding_date || null);
      setItems(itemsRes.data || []);
      setVendors(vendorRes.data || []);
      setLoading(false);
    };
    load();
  }, [router]);

  /* ─ Realtime ─ */
  useEffect(() => {
    if (!coupleId) return;
    const ch = supabase.channel(`timeline-${coupleId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'checklist_items', filter: `couple_id=eq.${coupleId}` }, (p) => {
        if (p.eventType === 'INSERT') setItems(prev => prev.find(i => i.id === p.new.id) ? prev : [...prev, p.new]);
        if (p.eventType === 'UPDATE') setItems(prev => prev.map(i => i.id === p.new.id ? p.new : i));
        if (p.eventType === 'DELETE') setItems(prev => prev.filter(i => i.id !== p.old.id));
      }).subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [coupleId]);

  /* ─ 체크리스트 액션 ─ */
  async function toggleItem(id, current) {
    setItems(prev => prev.map(it => it.id === id ? { ...it, is_done: !current } : it));
    await supabase.from('checklist_items').update({ is_done: !current }).eq('id', id);
  }

  async function addItem() {
    if (!newTitle.trim() || !coupleId) return;
    setSaving(true);
    const months = (activeTab === 'current' || activeTab === 'all') ? newMonths : activeTab;
    const { data, error } = await supabase.from('checklist_items')
      .insert({ couple_id: coupleId, title: newTitle.trim(), due_months_before: months, assigned_to: newAssigned, is_done: false, memo: newMemo.trim() || null })
      .select().single();
    if (!error && data) setItems(prev => [...prev, data]);
    setNewTitle(''); setNewAssigned('both'); setNewMemo('');
    setAdding(false); setSaving(false);
  }

  function startEdit(item) {
    setEditingId(item.id); setEditTitle(item.title);
    setEditAssigned(item.assigned_to); setEditMemo(item.memo || '');
    setMenuId(null);
  }

  async function saveEdit(id) {
    if (!editTitle.trim()) return;
    const updates = { title: editTitle.trim(), assigned_to: editAssigned, memo: editMemo.trim() || null };
    setItems(prev => prev.map(it => it.id === id ? { ...it, ...updates } : it));
    await supabase.from('checklist_items').update(updates).eq('id', id);
    setEditingId(null);
  }

  async function deleteItem(id) {
    setItems(prev => prev.filter(it => it.id !== id));
    await supabase.from('checklist_items').delete().eq('id', id);
    setMenuId(null);
  }

  /* ─ 필터 ─ */
  function filterItems() {
    if (activeTab === 'all') return items;
    if (activeTab === 'current') {
      if (!weddingDate) return items;
      const wedding    = new Date(weddingDate);
      const monthsDiff = (wedding - todayDt) / (1000 * 60 * 60 * 24 * 30);
      return items.filter(i => i.due_months_before >= monthsDiff - 0.5 && i.due_months_before <= monthsDiff + 1.5);
    }
    return items.filter(i => i.due_months_before === activeTab);
  }

  const displayed  = filterItems();
  const doneCount  = displayed.filter(i => i.is_done).length;

  /* ─ 아이템 렌더 ─ */
  function renderItem(item, isLast = false) {
    const tag       = ASSIGNED_LABELS[item.assigned_to] || ASSIGNED_LABELS.both;
    const isEditing = editingId === item.id;
    const isMenuOpen = menuId === item.id;
    const memoExpanded = expandedMemo === item.id;

    if (isEditing) {
      return (
        <div key={item.id} className="py-3 flex flex-col gap-2" style={{ borderBottom: isLast ? 'none' : '1px solid var(--beige)' }}>
          <input className="input-field text-sm" value={editTitle}
            onChange={e => setEditTitle(e.target.value)} autoFocus
            onKeyDown={e => e.key === 'Enter' && saveEdit(item.id)} />
          <div className="flex gap-2">
            {ASSIGNED_OPTIONS.map(a => (
              <button key={a} onClick={() => setEditAssigned(a)}
                className="flex-1 py-1.5 rounded-xl text-xs font-medium transition-all"
                style={{ backgroundColor: editAssigned === a ? 'var(--rose)' : 'white', color: editAssigned === a ? 'white' : 'var(--stone)', border: `1.5px solid ${editAssigned === a ? 'var(--rose)' : 'var(--stone-light)'}` }}>
                {ASSIGNED_LABELS[a].label}
              </button>
            ))}
          </div>
          <textarea className="input-field text-sm resize-none" rows={2}
            placeholder="메모 (업체명, 계약금, 연락처 등)" value={editMemo}
            onChange={e => setEditMemo(e.target.value)} />
          <div className="flex gap-2">
            <button className="btn-outline flex-1 text-sm py-2" onClick={() => setEditingId(null)}>취소</button>
            <button className="btn-rose flex-1 text-sm py-2" onClick={() => saveEdit(item.id)}>저장</button>
          </div>
        </div>
      );
    }

    return (
      <li key={item.id} className="py-3 relative" style={{ borderBottom: isLast ? 'none' : '1px solid var(--beige)' }}>
        <div className="flex items-center gap-3">
          <button onClick={() => toggleItem(item.id, item.is_done)}
            className="flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center transition-all"
            style={{ border: `2px solid ${item.is_done ? 'var(--rose)' : 'var(--stone-light)'}`, backgroundColor: item.is_done ? 'var(--rose)' : 'transparent' }}>
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
          <button onClick={e => { e.stopPropagation(); setMenuId(isMenuOpen ? null : item.id); }}
            className="text-lg flex-shrink-0"
            style={{ color: 'var(--stone)', background: 'none', border: 'none', cursor: 'pointer', padding: '0 2px' }}>
            ···
          </button>
        </div>

        {memoExpanded && (
          <MemoEditor item={item} onSave={async text => {
            const memo = text.trim() || null;
            setItems(prev => prev.map(it => it.id === item.id ? { ...it, memo } : it));
            setExpandedMemo(null);
            await supabase.from('checklist_items').update({ memo }).eq('id', item.id);
          }} onClose={() => setExpandedMemo(null)} />
        )}

        {isMenuOpen && (
          <div className="absolute right-0 z-10 rounded-xl shadow-lg overflow-hidden"
            style={{ top: '100%', backgroundColor: 'white', border: '1.5px solid var(--stone-light)', minWidth: '100px' }}
            onClick={e => e.stopPropagation()}>
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

  /* ─ 캘린더 뷰 ─ */
  function prevCalMonth() {
    if (calMonth === 0) { setCalYear(y => y - 1); setCalMonth(11); }
    else setCalMonth(m => m - 1);
    setCalSelected(null);
  }
  function nextCalMonth() {
    if (calMonth === 11) { setCalYear(y => y + 1); setCalMonth(0); }
    else setCalMonth(m => m + 1);
    setCalSelected(null);
  }

  const calEvents     = buildCalEvents(calYear, calMonth, weddingDate, items, vendors);
  const firstDay      = new Date(calYear, calMonth, 1).getDay();
  const daysInMonth   = new Date(calYear, calMonth + 1, 0).getDate();
  const calCells      = [];
  for (let i = 0; i < firstDay; i++) calCells.push(null);
  for (let d = 1; d <= daysInMonth; d++) calCells.push(d);

  const calSelectedDate   = calSelected ? new Date(calYear, calMonth, calSelected) : null;
  const calSelectedEvents = calSelectedDate ? calEvents.filter(e => isSameDay(e.date, calSelectedDate)) : [];

  /* ─ 로딩 ─ */
  if (loading) {
    return (
      <div className="page-wrapper flex items-center justify-center">
        <p className="text-sm" style={{ color: 'var(--stone)' }}>불러오는 중...</p>
      </div>
    );
  }

  const venueTotal        = VENUE_CHECKLIST.reduce((s, c) => s + c.items.length, 0);
  const venueCheckedCount = Object.values(venueChecked).filter(Boolean).length;
  const activePeriodLabel = TIME_PERIODS.find(p => p.value === activeTab)?.label;

  return (
    <div className="page-wrapper" onClick={() => setMenuId(null)}>
      {/* 헤더 + 뷰 토글 */}
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-semibold" style={{ color: 'var(--ink)', whiteSpace: 'nowrap' }}>📋 타임라인</h1>
        <div className="flex p-1 rounded-xl gap-1" style={{ backgroundColor: 'var(--toss-bg)' }}>
          <button onClick={() => setViewMode('list')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
            style={{ backgroundColor: viewMode === 'list' ? 'white' : 'transparent', color: viewMode === 'list' ? 'var(--toss-blue)' : 'var(--toss-text-tertiary)', boxShadow: viewMode === 'list' ? '0 1px 4px rgba(0,0,0,0.08)' : 'none' }}>
            <List size={13} strokeWidth={2.5} /> 리스트
          </button>
          <button onClick={() => setViewMode('calendar')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
            style={{ backgroundColor: viewMode === 'calendar' ? 'white' : 'transparent', color: viewMode === 'calendar' ? 'var(--toss-blue)' : 'var(--toss-text-tertiary)', boxShadow: viewMode === 'calendar' ? '0 1px 4px rgba(0,0,0,0.08)' : 'none' }}>
            <CalendarDays size={13} strokeWidth={2.5} /> 캘린더
          </button>
        </div>
      </div>

      {/* ══════════ 리스트 뷰 ══════════ */}
      {viewMode === 'list' && (
        <>
          {/* 웨딩홀 투어 체크리스트 */}
          <div className="card mb-4" style={{ border: `1.5px solid ${showVenueTour ? 'var(--rose)' : 'var(--stone-light)'}` }}>
            <button className="w-full flex items-center justify-between"
              style={{ background: 'none', border: 'none', cursor: 'pointer' }}
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
              <div className="mt-4" onClick={e => e.stopPropagation()}>
                <div className="mb-3">
                  <div className="flex justify-between text-xs mb-1" style={{ color: 'var(--stone)' }}>
                    <span>진행률</span><span>{venueCheckedCount}/{venueTotal}</span>
                  </div>
                  <div className="progress-bar">
                    <div className="progress-fill" style={{ width: `${venueTotal > 0 ? Math.round(venueCheckedCount / venueTotal * 100) : 0}%` }} />
                  </div>
                </div>
                {VENUE_CHECKLIST.map(section => (
                  <div key={section.category} className="mb-3">
                    <p className="text-xs font-semibold mb-1.5" style={{ color: 'var(--ink)' }}>{section.category}</p>
                    {section.items.map(it => {
                      const key = `${section.category}-${it}`;
                      const isChecked = !!venueChecked[key];
                      return (
                        <div key={it} className="flex items-start gap-2 py-1 cursor-pointer"
                          onClick={() => setVenueChecked(p => ({ ...p, [key]: !p[key] }))}>
                          <div className="flex-shrink-0 w-4 h-4 rounded flex items-center justify-center mt-0.5 transition-all"
                            style={{ border: `2px solid ${isChecked ? 'var(--rose)' : 'var(--stone-light)'}`, backgroundColor: isChecked ? 'var(--rose)' : 'white' }}>
                            {isChecked && <span className="text-white" style={{ fontSize: '9px' }}>✓</span>}
                          </div>
                          <span className="text-xs flex-1"
                            style={{ color: isChecked ? 'var(--stone)' : 'var(--ink)', textDecoration: isChecked ? 'line-through' : 'none' }}>
                            {it}
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

          {/* 기간 선택 컨트롤 */}
          <div className="flex items-center gap-2 mb-3">
            <button
              onClick={() => setActiveTab('current')}
              className="flex-shrink-0 px-4 py-2 rounded-full text-sm font-semibold transition-all"
              style={{ backgroundColor: activeTab === 'current' ? 'var(--rose)' : 'white', color: activeTab === 'current' ? 'white' : 'var(--stone)', border: `1.5px solid ${activeTab === 'current' ? 'var(--rose)' : 'var(--stone-light)'}` }}>
              이번달
            </button>
            <select
              value={typeof activeTab === 'number' ? activeTab : ''}
              onChange={e => e.target.value !== '' && setActiveTab(Number(e.target.value))}
              className="flex-1 text-sm font-medium rounded-full transition-all"
              style={{
                height: 38, padding: '0 14px',
                border: `1.5px solid ${typeof activeTab === 'number' ? 'var(--rose)' : 'var(--stone-light)'}`,
                backgroundColor: typeof activeTab === 'number' ? 'var(--rose-light)' : 'white',
                color: typeof activeTab === 'number' ? 'var(--rose)' : 'var(--stone)',
                appearance: 'none', WebkitAppearance: 'none',
                backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23999' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E")`,
                backgroundRepeat: 'no-repeat', backgroundPosition: 'right 12px center',
                paddingRight: 32,
              }}>
              <option value="">{activePeriodLabel ?? '기간 선택'}</option>
              {TIME_PERIODS.map(p => (
                <option key={p.value} value={p.value}>{p.label}</option>
              ))}
            </select>
            <button
              onClick={() => setActiveTab('all')}
              className="flex-shrink-0 px-4 py-2 rounded-full text-sm font-semibold transition-all"
              style={{ backgroundColor: activeTab === 'all' ? 'var(--rose)' : 'white', color: activeTab === 'all' ? 'white' : 'var(--stone)', border: `1.5px solid ${activeTab === 'all' ? 'var(--rose)' : 'var(--stone-light)'}` }}>
              전체
            </button>
          </div>

          {/* 전체 보기: 기간별 섹션 */}
          {activeTab === 'all' ? (
            <div className="flex flex-col gap-4 mb-4">
              {TIME_PERIODS.map(period => {
                const periodItems = items.filter(i => i.due_months_before === period.value);
                if (periodItems.length === 0) return null;
                const doneCnt = periodItems.filter(i => i.is_done).length;
                return (
                  <div key={period.value}>
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-xs font-semibold" style={{ color: 'var(--stone)' }}>{period.label}</p>
                      <p className="text-xs" style={{ color: 'var(--stone)' }}>{doneCnt}/{periodItems.length}</p>
                    </div>
                    <div className="card p-0">
                      <ul>{periodItems.map((item, idx) => renderItem(item, idx === periodItems.length - 1))}</ul>
                    </div>
                  </div>
                );
              })}
              {items.length === 0 && (
                <div className="card">
                  <EmptyState icon={CheckSquare} title="체크리스트가 비어있어요"
                    description="결혼 준비 항목을 직접 추가하거나 기본 템플릿을 불러올 수 있어요" compact />
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
                  <EmptyState icon={CheckSquare} title="해당 기간에 항목이 없어요" compact />
                ) : (
                  <ul className="px-4">{displayed.map((item, idx) => renderItem(item, idx === displayed.length - 1))}</ul>
                )}
              </div>
            </>
          )}

          {/* 항목 추가 */}
          {adding ? (
            <div className="card flex flex-col gap-3 mb-4">
              <input className="input-field" placeholder="항목 이름 입력" value={newTitle}
                onChange={e => setNewTitle(e.target.value)} autoFocus
                onKeyDown={e => e.key === 'Enter' && addItem()} />
              <div>
                <p className="text-xs mb-1.5" style={{ color: 'var(--stone)' }}>담당</p>
                <div className="flex gap-2">
                  {ASSIGNED_OPTIONS.map(a => (
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
                  <select className="input-field text-sm" value={newMonths} onChange={e => setNewMonths(Number(e.target.value))}>
                    {TIME_PERIODS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
                  </select>
                </div>
              )}
              <div>
                <p className="text-xs mb-1.5" style={{ color: 'var(--stone)' }}>메모 (업체명, 계약금 등)</p>
                <textarea className="input-field text-sm resize-none" rows={2} placeholder="선택사항"
                  value={newMemo} onChange={e => setNewMemo(e.target.value)} />
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
        </>
      )}

      {/* ══════════ 캘린더 뷰 ══════════ */}
      {viewMode === 'calendar' && (
        <>
          {/* 월 네비게이션 */}
          <div className="card mb-4" style={{ padding: '16px 20px' }}>
            <div className="flex items-center justify-between mb-4">
              <button onClick={prevCalMonth} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}>
                <ChevronLeft size={20} color="var(--ink)" />
              </button>
              <p className="text-base font-bold tabular-nums" style={{ color: 'var(--ink)' }}>
                {calYear}년 {calMonth + 1}월
              </p>
              <button onClick={nextCalMonth} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}>
                <ChevronRight size={20} color="var(--ink)" />
              </button>
            </div>

            {/* 요일 헤더 */}
            <div className="grid grid-cols-7 mb-1">
              {DAY_LABELS.map((d, i) => (
                <div key={d} className="text-center text-xs font-semibold py-1"
                  style={{ color: i === 0 ? 'var(--toss-red)' : i === 6 ? 'var(--toss-blue)' : 'var(--stone)' }}>
                  {d}
                </div>
              ))}
            </div>

            {/* 날짜 셀 */}
            <div className="grid grid-cols-7 gap-y-1">
              {calCells.map((day, idx) => {
                if (!day) return <div key={`e-${idx}`} />;
                const cellDate  = new Date(calYear, calMonth, day);
                const isToday   = isSameDay(cellDate, todayDt);
                const isSel     = calSelected === day;
                const isWedding = weddingDate && isSameDay(cellDate, new Date(weddingDate));
                const dayEvts   = calEvents.filter(e => isSameDay(e.date, cellDate));
                const col       = idx % 7;
                return (
                  <div key={day} className="flex flex-col items-center py-0.5 cursor-pointer"
                    onClick={() => setCalSelected(isSel ? null : day)}>
                    <div className="w-8 h-8 flex items-center justify-center rounded-full transition-all"
                      style={{ backgroundColor: isSel ? 'var(--toss-blue)' : isWedding ? 'var(--rose-light)' : isToday ? 'var(--toss-bg)' : 'transparent', border: isToday && !isSel ? '1.5px solid var(--toss-blue)' : 'none' }}>
                      <span className="text-sm font-medium tabular-nums"
                        style={{ color: isSel ? 'white' : isWedding ? 'var(--toss-blue)' : col === 0 ? 'var(--toss-red)' : col === 6 ? 'var(--toss-blue)' : 'var(--ink)' }}>
                        {day}
                      </span>
                    </div>
                    {dayEvts.length > 0 && (
                      <div className="flex gap-0.5 mt-0.5">
                        {dayEvts.slice(0, 3).map((e, i) => (
                          <div key={i} className="rounded-full" style={{ width: 4, height: 4, backgroundColor: e.color }} />
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* 범례 */}
          <div className="flex gap-4 mb-4 px-1">
            {[
              { color: 'var(--toss-blue)', label: '체크리스트' },
              { color: 'var(--toss-yellow)', label: '업체 잔금' },
              { color: 'var(--toss-red)', label: '결혼식 당일' },
            ].map(({ color, label }) => (
              <div key={label} className="flex items-center gap-1.5">
                <div className="rounded-full" style={{ width: 8, height: 8, backgroundColor: color }} />
                <span className="text-xs" style={{ color: 'var(--stone)' }}>{label}</span>
              </div>
            ))}
          </div>

          {/* 선택된 날짜 이벤트 */}
          {calSelected && (
            <div className="card mb-4">
              <p className="text-sm font-bold mb-3" style={{ color: 'var(--ink)' }}>
                {calMonth + 1}월 {calSelected}일 일정
              </p>
              {calSelectedEvents.length === 0 ? (
                <p className="text-sm" style={{ color: 'var(--stone)' }}>일정이 없어요</p>
              ) : (
                <div className="flex flex-col gap-2">
                  {calSelectedEvents.map((e, i) => <CalEventItem key={i} event={e} />)}
                </div>
              )}
            </div>
          )}

          {/* 이번달 전체 일정 */}
          <div className="card mb-4">
            <p className="text-sm font-bold mb-3" style={{ color: 'var(--ink)' }}>
              {calMonth + 1}월 전체 일정
              <span className="ml-2 text-xs font-normal" style={{ color: 'var(--stone)' }}>{calEvents.length}개</span>
            </p>
            {calEvents.length === 0 ? (
              <p className="text-sm" style={{ color: 'var(--stone)' }}>
                {weddingDate ? '이번 달에 예정된 일정이 없어요' : '결혼 날짜를 설정하면 일정이 표시돼요'}
              </p>
            ) : (
              <div className="flex flex-col gap-2">
                {[...calEvents].sort((a, b) => a.date - b.date).map((e, i) => <CalEventItem key={i} event={e} showDate />)}
              </div>
            )}
          </div>

          {!weddingDate && (
            <div className="card mb-4 text-center">
              <p className="text-sm font-semibold mb-2" style={{ color: 'var(--ink)' }}>결혼 날짜를 설정해주세요</p>
              <p className="text-xs mb-3" style={{ color: 'var(--stone)' }}>날짜 설정 후 체크리스트 일정이 자동으로 표시돼요</p>
              <button className="btn-rose" style={{ height: 44 }} onClick={() => router.push('/setup')}>날짜 설정하기</button>
            </div>
          )}
        </>
      )}

      <BottomNav active="timeline" />
    </div>
  );
}

/* ─── 캘린더 이벤트 아이템 ─────────────────────────────────── */
function CalEventItem({ event, showDate }) {
  return (
    <div className="flex items-start gap-3 py-2 rounded-xl px-3" style={{ backgroundColor: 'var(--toss-bg)' }}>
      <div className="flex-shrink-0 w-8 h-8 rounded-xl flex items-center justify-center"
        style={{ backgroundColor: event.color + '22' }}>
        <event.Icon size={16} color={event.color} strokeWidth={2} />
      </div>
      <div className="flex-1 min-w-0">
        {showDate && (
          <p className="text-xs tabular-nums" style={{ color: 'var(--stone)' }}>
            {event.date.getMonth() + 1}월 {event.date.getDate()}일
          </p>
        )}
        <p className="text-sm font-medium" style={{ color: 'var(--ink)' }}>{event.title}</p>
        {event.sub && <p className="text-xs mt-0.5" style={{ color: 'var(--stone)' }}>{event.sub}</p>}
      </div>
      {event.badge && (
        <span className="text-xs px-2 py-0.5 rounded-full flex-shrink-0"
          style={{ backgroundColor: event.color + '22', color: event.color }}>
          {event.badge}
        </span>
      )}
    </div>
  );
}

/* ─── 메모 에디터 ─────────────────────────────────────────── */
function MemoEditor({ item, onSave, onClose }) {
  const [text, setText] = useState(item.memo || '');
  return (
    <div className="mt-2 flex flex-col gap-2">
      <textarea className="input-field text-sm resize-none" rows={3}
        placeholder="업체명, 계약금, 연락처, 메모 등..." value={text}
        onChange={e => setText(e.target.value)} autoFocus />
      <div className="flex gap-2">
        <button className="btn-outline flex-1 text-sm py-2" onClick={onClose}>닫기</button>
        <button className="btn-rose flex-1 text-sm py-2" onClick={() => onSave(text)}>저장</button>
      </div>
    </div>
  );
}
