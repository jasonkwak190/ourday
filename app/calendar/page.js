'use client';

export const dynamic = 'force-dynamic';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronLeft, ChevronRight, CalendarDays, Building2, CheckSquare, Heart } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import BottomNav from '@/components/BottomNav';

// time_period → 결혼일 기준 몇 개월/일 전인지
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

function isSameMonth(d, year, month) {
  return d.getFullYear() === year && d.getMonth() === month;
}
function isSameDay(d1, d2) {
  return d1.getFullYear() === d2.getFullYear() &&
         d1.getMonth()    === d2.getMonth()    &&
         d1.getDate()     === d2.getDate();
}

const DAY_LABELS = ['일', '월', '화', '수', '목', '금', '토'];

export default function CalendarPage() {
  const router = useRouter();
  const today = new Date();
  const [year, setYear]       = useState(today.getFullYear());
  const [month, setMonth]     = useState(today.getMonth());
  const [selected, setSelected] = useState(null); // Date | null
  const [loading, setLoading] = useState(true);

  const [weddingDate, setWeddingDate] = useState(null);
  const [checkItems, setCheckItems]   = useState([]);
  const [vendors, setVendors]         = useState([]);

  useEffect(() => {
    const load = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.push('/'); return; }

      const { data: userData } = await supabase
        .from('users').select('couple_id').eq('id', session.user.id).single();
      if (!userData?.couple_id) { setLoading(false); return; }
      const cId = userData.couple_id;

      const [coupleRes, checkRes, vendorRes] = await Promise.all([
        supabase.from('couples').select('wedding_date').eq('id', cId).single(),
        supabase.from('checklist_items').select('id,title,time_period,is_done,assigned_to').eq('couple_id', cId),
        supabase.from('vendors').select('id,name,type,balance_due,contract_status').eq('couple_id', cId),
      ]);

      if (coupleRes.data?.wedding_date) setWeddingDate(coupleRes.data.wedding_date);
      setCheckItems(checkRes.data || []);
      setVendors(vendorRes.data || []);
      setLoading(false);
    };
    load();
  }, [router]);

  // 이번 달 이벤트 계산
  const events = buildEvents(year, month, weddingDate, checkItems, vendors);

  // 달력 그리드 계산
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  function prevMonth() {
    if (month === 0) { setYear(y => y - 1); setMonth(11); }
    else setMonth(m => m - 1);
    setSelected(null);
  }
  function nextMonth() {
    if (month === 11) { setYear(y => y + 1); setMonth(0); }
    else setMonth(m => m + 1);
    setSelected(null);
  }

  const selectedDate = selected ? new Date(year, month, selected) : null;
  const selectedEvents = selectedDate
    ? events.filter(e => isSameDay(e.date, selectedDate))
    : [];

  const monthEvents = events; // 이번 달 전체

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
        📅 캘린더
      </h1>

      {/* 월 네비게이션 */}
      <div className="card mb-4" style={{ padding: '16px 20px' }}>
        <div className="flex items-center justify-between mb-4">
          <button onClick={prevMonth} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}>
            <ChevronLeft size={20} color="var(--ink)" />
          </button>
          <p className="text-base font-bold tabular-nums" style={{ color: 'var(--ink)' }}>
            {year}년 {month + 1}월
          </p>
          <button onClick={nextMonth} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}>
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
          {cells.map((day, idx) => {
            if (!day) return <div key={`e-${idx}`} />;
            const cellDate = new Date(year, month, day);
            const isToday  = isSameDay(cellDate, today);
            const isSel    = selected === day;
            const isWedding = weddingDate && isSameDay(cellDate, new Date(weddingDate));
            const dayEvents = events.filter(e => isSameDay(e.date, cellDate));
            const col = idx % 7;

            return (
              <div key={day} className="flex flex-col items-center py-0.5 cursor-pointer"
                onClick={() => setSelected(isSel ? null : day)}>
                <div className="w-8 h-8 flex items-center justify-center rounded-full transition-all"
                  style={{
                    backgroundColor: isSel ? 'var(--toss-blue)' : isWedding ? 'var(--rose-light)' : isToday ? 'var(--toss-bg)' : 'transparent',
                    border: isToday && !isSel ? '1.5px solid var(--toss-blue)' : 'none',
                  }}>
                  <span className="text-sm font-medium tabular-nums"
                    style={{
                      color: isSel ? 'white'
                           : isWedding ? 'var(--toss-blue)'
                           : col === 0 ? 'var(--toss-red)'
                           : col === 6 ? 'var(--toss-blue)'
                           : 'var(--ink)',
                    }}>
                    {day}
                  </span>
                </div>
                {/* 이벤트 점 */}
                {dayEvents.length > 0 && (
                  <div className="flex gap-0.5 mt-0.5">
                    {dayEvents.slice(0, 3).map((e, i) => (
                      <div key={i} className="rounded-full"
                        style={{ width: 4, height: 4, backgroundColor: e.color }} />
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
        <div className="flex items-center gap-1.5">
          <div className="rounded-full" style={{ width: 8, height: 8, backgroundColor: 'var(--toss-blue)' }} />
          <span className="text-xs" style={{ color: 'var(--stone)' }}>체크리스트</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="rounded-full" style={{ width: 8, height: 8, backgroundColor: 'var(--toss-yellow)' }} />
          <span className="text-xs" style={{ color: 'var(--stone)' }}>업체 잔금</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="rounded-full" style={{ width: 8, height: 8, backgroundColor: 'var(--toss-red)' }} />
          <span className="text-xs" style={{ color: 'var(--stone)' }}>결혼식 당일</span>
        </div>
      </div>

      {/* 선택된 날짜 이벤트 */}
      {selected && (
        <div className="card mb-4">
          <p className="text-sm font-bold mb-3" style={{ color: 'var(--ink)' }}>
            {month + 1}월 {selected}일 일정
          </p>
          {selectedEvents.length === 0 ? (
            <p className="text-sm" style={{ color: 'var(--stone)' }}>일정이 없어요</p>
          ) : (
            <div className="flex flex-col gap-2">
              {selectedEvents.map((e, i) => <EventItem key={i} event={e} />)}
            </div>
          )}
        </div>
      )}

      {/* 이번 달 전체 일정 요약 */}
      <div className="card mb-4">
        <p className="text-sm font-bold mb-3" style={{ color: 'var(--ink)' }}>
          {month + 1}월 전체 일정
          <span className="ml-2 text-xs font-normal" style={{ color: 'var(--stone)' }}>
            {monthEvents.length}개
          </span>
        </p>
        {monthEvents.length === 0 ? (
          <p className="text-sm" style={{ color: 'var(--stone)' }}>
            {weddingDate ? '이번 달에 예정된 일정이 없어요' : '결혼 날짜를 설정하면 일정이 표시돼요'}
          </p>
        ) : (
          <div className="flex flex-col gap-2">
            {monthEvents
              .sort((a, b) => a.date - b.date)
              .map((e, i) => <EventItem key={i} event={e} showDate />)}
          </div>
        )}
      </div>

      {/* 결혼일 없으면 설정 유도 */}
      {!weddingDate && (
        <div className="card mb-4 text-center">
          <p className="text-sm font-semibold mb-2" style={{ color: 'var(--ink)' }}>
            결혼 날짜를 설정해주세요
          </p>
          <p className="text-xs mb-3" style={{ color: 'var(--stone)' }}>
            날짜 설정 후 체크리스트 일정이 자동으로 표시돼요
          </p>
          <button className="btn-rose" style={{ height: 44 }}
            onClick={() => router.push('/setup')}>
            날짜 설정하기
          </button>
        </div>
      )}

      <BottomNav active="calendar" />
    </div>
  );
}

// 이벤트 아이템 컴포넌트
function EventItem({ event, showDate }) {
  return (
    <div className="flex items-start gap-3 py-2 rounded-xl px-3"
      style={{ backgroundColor: 'var(--toss-bg)' }}>
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
        {event.sub && (
          <p className="text-xs mt-0.5" style={{ color: 'var(--stone)' }}>{event.sub}</p>
        )}
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

// 이벤트 목록 생성
function buildEvents(year, month, weddingDate, checkItems, vendors) {
  const result = [];

  // 1. 결혼식 당일
  if (weddingDate) {
    const wd = new Date(weddingDate);
    if (isSameMonth(wd, year, month)) {
      result.push({
        date: wd, title: '💍 결혼식 당일', sub: '축하해요!',
        color: 'var(--toss-red)', Icon: Heart, badge: 'D-Day',
      });
    }

    // 2. 체크리스트 — time_period 기준 월 집계
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
      result.push({
        date, title: `${period} 준비 항목`,
        sub: `${done}/${total}개 완료`,
        color: 'var(--toss-blue)', Icon: CheckSquare,
        badge: done === total ? '완료' : `${total - done}개 남음`,
      });
    });
  }

  // 3. 업체 잔금 납부일
  vendors.forEach(v => {
    if (!v.balance_due || v.contract_status === 'done') return;
    const d = new Date(v.balance_due);
    if (!isSameMonth(d, year, month)) return;
    const dday = Math.ceil((d - new Date()) / (1000 * 60 * 60 * 24));
    result.push({
      date: d, title: `${v.name} 잔금 납부`,
      sub: v.type,
      color: 'var(--toss-yellow)', Icon: Building2,
      badge: dday > 0 ? `D-${dday}` : dday === 0 ? 'D-Day' : '지남',
    });
  });

  return result;
}
