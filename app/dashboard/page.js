'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import BottomNav from '@/components/BottomNav';
import Icon from '@/components/Icon';
import { AlertCircle, ChevronRight, CalendarDays, Wallet, MessageSquare, BookOpen } from 'lucide-react';

function calcDday(dateStr) {
  if (!dateStr) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(dateStr);
  target.setHours(0, 0, 0, 0);
  return Math.ceil((target - today) / (1000 * 60 * 60 * 24));
}

function getMonthsDiff(weddingDate) {
  const today = new Date();
  const wedding = new Date(weddingDate);
  return (wedding - today) / (1000 * 60 * 60 * 24 * 30);
}

// 이번 주 이내 마감 or 이미 지난 항목 (미완료)
function getUrgentItems(items, weddingDate) {
  if (!weddingDate || !items.length) return [];
  const diff = getMonthsDiff(weddingDate);
  return items.filter(item =>
    !item.is_done && item.due_months_before >= diff - 0.25
  );
}

export default function DashboardPage() {
  const router = useRouter();
  const [loading,     setLoading]     = useState(true);
  const [couple,      setCouple]      = useState(null);
  const [items,       setItems]       = useState([]);
  const [decisions,   setDecisions]   = useState([]);
  const [budgetItems, setBudgetItems] = useState([]);
  const [vendors,     setVendors]     = useState([]);
  const [guestbook,   setGuestbook]   = useState([]);
  const [latestNote,  setLatestNote]  = useState(null);
  const [error,       setError]       = useState('');
  const [onboardingDismissed, setOnboardingDismissed] = useState(false);
  const [coupleId, setCoupleId] = useState(null);
  const [userName, setUserName] = useState('');
  const [userRole, setUserRole] = useState('');

  useEffect(() => {
    const load = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.push('/'); return; }

      const { data: user } = await supabase
        .from('users')
        .select('couple_id, onboarding_dismissed, name, role')
        .eq('id', session.user.id)
        .single();

      if (!user?.couple_id) { setLoading(false); return; }

      const cId = user.couple_id;
      setCoupleId(cId);
      if (user.onboarding_dismissed) setOnboardingDismissed(true);
      if (user.name) setUserName(user.name);
      if (user.role) setUserRole(user.role);
      const [coupleRes, itemsRes, decisionsRes, budgetRes, vendorsRes, invRes, noteRes] = await Promise.all([
        supabase.from('couples').select('*').eq('id', cId).single(),
        supabase.from('checklist_items').select('*').eq('couple_id', cId),
        supabase.from('decisions').select('id, title, status').eq('couple_id', cId),
        supabase.from('budget_items').select('estimated_amount, actual_amount, category, name').eq('couple_id', cId),
        supabase.from('vendors').select('id, name, type, balance, balance_due, contract_status').eq('couple_id', cId),
        supabase.from('invitations').select('id').eq('couple_id', cId).maybeSingle(),
        supabase.from('couple_notes').select('content, updated_at').eq('couple_id', cId).order('updated_at', { ascending: false }).limit(1).maybeSingle(),
      ]);

      if (coupleRes.error) { setError('데이터를 불러오지 못했어요.'); }
      else {
        setCouple(coupleRes.data);
        setItems(itemsRes.data || []);
        setDecisions(decisionsRes.data || []);
        setBudgetItems(budgetRes.data || []);
        setVendors(vendorsRes.data || []);
        if (noteRes.data?.content) setLatestNote(noteRes.data);

        const invId = invRes.data?.id || null;
        if (invId) {
          const { data: gbData } = await supabase
            .from('invitation_guestbook')
            .select('id, name, message, created_at')
            .eq('invitation_id', invId)
            .order('created_at', { ascending: false })
            .limit(3);
          setGuestbook(gbData || []);
        }
      }
      setLoading(false);
    };
    load();
  }, [router]);

  async function toggleItem(id, current) {
    setItems(prev => prev.map(it => it.id === id ? { ...it, is_done: !current } : it));
    await supabase.from('checklist_items').update({ is_done: !current }).eq('id', id);
  }

  // ─── 로딩 ───
  if (loading) {
    return (
      <div className="page-wrapper flex items-center justify-center">
        <div className="text-center" style={{ color: 'var(--ink-3)' }}>
          <Icon name="rings" size={36} color="var(--champagne)" style={{ margin: '0 auto 8px' }} />
          <p className="text-sm" style={{ fontFamily: 'var(--font-serif-en)', fontStyle: 'italic' }}>불러오는 중…</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="page-wrapper flex items-center justify-center">
        <p className="text-sm" style={{ color: 'var(--toss-red)' }}>{error}</p>
      </div>
    );
  }

  // ─── 통계 계산 ───
  const dday         = calcDday(couple?.wedding_date);
  const urgentItems  = getUrgentItems(items, couple?.wedding_date);
  const totalDone    = items.filter(i => i.is_done).length;
  const totalCount   = items.length;
  const progress     = totalCount > 0 ? Math.round((totalDone / totalCount) * 100) : 0;

  // 예산
  const totalBudget  = couple?.total_budget || 0;
  const totalEst     = budgetItems.reduce((s, b) => s + (b.estimated_amount || 0), 0);
  const totalSpent   = budgetItems.reduce((s, b) => s + (b.actual_amount || 0), 0);
  const budgetPct    = totalBudget > 0 ? Math.round((totalSpent / totalBudget) * 100) : 0;
  const budgetRemain = totalBudget - totalSpent;

  // 의사결정
  const undecided    = decisions.filter(d => d.status !== 'decided');
  const discussing   = decisions.filter(d => d.status === 'discussing');

  // 업체 잔금 D-day (잔금 남아있는 업체만, done 제외)
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const pendingBalances = vendors
    .filter(v => v.balance && v.balance > 0 && v.contract_status !== 'done' && v.balance_due)
    .map(v => ({
      ...v,
      dday: Math.ceil((new Date(v.balance_due) - today) / (1000 * 60 * 60 * 24)),
    }))
    .sort((a, b) => a.dday - b.dday)
    .slice(0, 3);

  const weddingDateFormatted = couple?.wedding_date
    ? new Date(couple.wedding_date).toLocaleDateString('ko-KR', {
        year: 'numeric', month: 'long', day: 'numeric',
      })
    : null;

  // ─── 커플 미연동 상태 (회원가입 직후 첫 화면) ───
  if (!couple) {
    return (
      <div className="page-wrapper flex flex-col">
        <div className="flex justify-between items-center mb-4">
          <div style={{ fontFamily: 'var(--font-serif-en)', fontStyle: 'italic', fontSize: 20, color: 'var(--ink)' }}>
            <span style={{ fontStyle: 'normal', fontWeight: 500 }}>O</span>urday
          </div>
          <button
            onClick={() => router.push('/settings')}
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}
            aria-label="설정"
          >
            <Icon name="settings" size={22} color="var(--ink-3)" />
          </button>
        </div>

        {/* 환영 헤더 */}
        <div className="text-center mt-8 mb-8">
          <Icon name="rings" size={48} color="var(--champagne)" style={{ margin: '0 auto 16px' }} />
          <h1 style={{ fontFamily: 'var(--font-serif-ko)', fontWeight: 500, fontSize: 22, color: 'var(--ink)', margin: '0 0 8px', letterSpacing: '-0.01em' }}>
            환영해요! 3단계로 시작해요
          </h1>
          <p className="text-sm" style={{ color: 'var(--ink-3)', lineHeight: 1.7 }}>
            아래 순서대로 설정하면<br />결혼 준비를 함께 관리할 수 있어요
          </p>
        </div>

        {/* 3단계 온보딩 카드 */}
        <div className="flex flex-col gap-3 mb-6">
          {[
            {
              step: 1, icon: 'calendar', label: '결혼 정보 설정',
              desc: '날짜·장소·예산을 입력하면 D-day와 예산 현황이 표시돼요',
              btnLabel: '결혼 정보 설정하기', path: '/setup', primary: true,
            },
            {
              step: 2, icon: 'couple', label: '파트너와 연동',
              desc: '초대 코드를 공유해 신랑·신부가 같은 화면을 볼 수 있어요',
              btnLabel: '파트너 연동하기', path: '/connect', primary: false,
            },
            {
              step: 3, icon: 'checklist', label: '체크리스트 시작',
              desc: '결혼 준비 항목 33개 기본 템플릿을 한 번에 불러올 수 있어요',
              btnLabel: '타임라인 보기', path: '/timeline', primary: false,
            },
          ].map(({ step, icon, label, desc, btnLabel, path, primary }) => (
            <div key={step} className="card" style={{ padding: '20px' }}>
              <div className="flex items-start gap-3 mb-3">
                <div style={{
                  width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
                  backgroundColor: primary ? 'var(--champagne)' : 'var(--paper)',
                  border: `1px solid ${primary ? 'var(--champagne)' : 'var(--rule)'}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <Icon name={icon} size={16} color={primary ? 'white' : 'var(--ink-3)'} />
                </div>
                <div>
                  <p style={{ fontSize: 15, fontWeight: 500, color: 'var(--ink)', margin: '0 0 4px', fontFamily: 'var(--font-serif-ko)' }}>
                    {label}
                  </p>
                  <p style={{ fontSize: 13, color: 'var(--ink-3)', margin: 0, lineHeight: 1.5 }}>{desc}</p>
                </div>
              </div>
              <button
                className={primary ? 'btn-rose w-full' : 'btn-outline w-full'}
                onClick={() => router.push(path)}
              >
                {btnLabel}
              </button>
            </div>
          ))}
        </div>

        <BottomNav active="home" />
      </div>
    );
  }

  return (
    <div className="page-wrapper">
      {/* 상단 바 */}
      <div className="flex justify-between items-center mb-4">
        <div style={{ fontFamily: 'var(--font-serif-en)', fontStyle: 'italic', fontSize: 20, color: 'var(--ink)' }}>
          <span style={{ fontStyle: 'normal', fontWeight: 500 }}>O</span>urday
        </div>
        <button
          onClick={() => router.push('/settings')}
          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}
          aria-label="설정"
        >
          <Icon name="settings" size={22} color="var(--ink-3)" />
        </button>
      </div>

      {/* ── 인사말 섹션 ── */}
      {userName && (
        <div style={{ padding: '4px 4px 14px' }}>
          <div style={{
            fontFamily: 'var(--font-serif-en)',
            fontStyle: 'italic',
            fontSize: 12,
            color: 'var(--champagne-2)',
            letterSpacing: '0.05em',
            marginBottom: 4,
          }}>
            · {userRole === 'groom' ? 'good morning, groom' : userRole === 'bride' ? 'good morning, bride' : 'good morning'} ·
          </div>
          <div style={{
            fontFamily: 'var(--font-serif-ko)',
            fontWeight: 500,
            fontSize: 20,
            color: 'var(--ink)',
            letterSpacing: '-0.01em',
          }}>
            {userName} 님,{' '}
            <span style={{ fontFamily: 'var(--font-serif-en)', fontStyle: 'italic', color: 'var(--champagne-2)', fontSize: 18 }}>오늘도</span>
            {' '}한 걸음.
          </div>
        </div>
      )}

      {/* D-day 히어로 카드 */}
      <div className="card-hero text-center mb-4">
        <div className="t-kicker mb-2">· OUR WEDDING DAY ·</div>
        {couple?.bride_name && couple?.groom_name && (
          <div style={{ fontFamily: 'var(--font-serif-ko)', fontSize: 15, color: 'var(--ink-2)', marginBottom: 8 }}>
            {couple.groom_name}
            <span style={{ fontFamily: 'var(--font-serif-en)', fontStyle: 'italic', color: 'var(--champagne)', margin: '0 8px' }}>&amp;</span>
            {couple.bride_name}
          </div>
        )}
        {dday !== null ? (
          <>
            <div style={{
              fontFamily: 'var(--font-serif-en)',
              fontSize: dday === 0 ? 72 : 140,
              fontWeight: 500,
              lineHeight: 0.92,
              letterSpacing: '-0.04em',
              color: 'var(--ink)',
              margin: '16px 0 6px',
              fontFeatureSettings: '"lnum" 1, "tnum" 1',
            }}>
              {dday > 0 ? dday : dday === 0 ? 'Today' : Math.abs(dday)}
            </div>
            <div style={{ fontFamily: 'var(--font-serif-en)', fontStyle: 'italic', fontSize: 13, color: 'var(--ink-3)', letterSpacing: '0.06em' }}>
              {dday > 0 ? 'days to go' : dday === 0 ? '오늘이에요!' : 'days ago'}
            </div>
          </>
        ) : (
          <button
            onClick={() => router.push('/setup')}
            style={{ fontFamily: 'var(--font-serif-ko)', fontSize: 14, color: 'var(--champagne-2)', background: 'none', border: 'none', cursor: 'pointer' }}
          >
            날짜를 설정해주세요 →
          </button>
        )}
        <div className="hairline" style={{ marginTop: 14, marginBottom: 10 }} />
        <div style={{ fontFamily: 'var(--font-serif-ko)', fontSize: 13, color: 'var(--ink-2)' }}>
          {weddingDateFormatted || (
            <span style={{ color: 'var(--ink-4)' }}>결혼 날짜 미설정</span>
          )}
        </div>
      </div>

      {/* ── 첫 시작 온보딩 배너 (체크리스트 0개 + 아직 dismiss 안 했을 때) ── */}
      {items.length === 0 && !onboardingDismissed && (
        <div className="card mb-5" style={{ background: 'var(--champagne-wash)', border: '1px solid var(--rule-strong)' }}>
          <div className="flex items-center justify-between mb-3">
            <p className="t-kicker">· 결혼 준비를 시작해봐요 ·</p>
            <button
              onClick={async () => {
                setOnboardingDismissed(true);
                const { data: { session } } = await supabase.auth.getSession();
                if (session) await supabase.from('users').update({ onboarding_dismissed: true }).eq('id', session.user.id);
              }}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--toss-text-tertiary)', fontSize: 18, lineHeight: 1, padding: '0 2px' }}
            >×</button>
          </div>
          <div className="flex flex-col gap-2">
            {[
              { step: 1, done: !!couple?.wedding_date, label: '결혼 날짜 설정', sub: couple?.wedding_date ? '완료' : '날짜를 설정하면 D-day가 표시돼요', path: '/setup' },
              { step: 2, done: false, label: '체크리스트 불러오기', sub: '결혼 준비 항목 33개를 한 번에 추가해요', path: '/timeline' },
              { step: 3, done: false, label: '파트너와 연동하기', sub: '신랑·신부 함께 같은 화면을 봐요', path: '/connect' },
            ].map(({ step, done, label, sub, path }) => (
              <button
                key={step}
                onClick={() => router.push(path)}
                style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 0', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', width: '100%' }}
              >
                <div style={{
                  width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
                  backgroundColor: done ? 'var(--champagne)' : 'var(--paper)',
                  border: `1px solid ${done ? 'var(--champagne)' : 'var(--rule-strong)'}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  {done
                    ? <Icon name="check" size={14} color="white" />
                    : <span style={{ fontSize: 11, color: 'var(--ink-3)', fontFamily: 'var(--font-serif-en)', fontStyle: 'italic' }}>{step}</span>
                  }
                </div>
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: 14, fontWeight: 500, color: done ? 'var(--ink-3)' : 'var(--ink)', margin: 0, textDecoration: done ? 'line-through' : 'none', fontFamily: 'var(--font-serif-ko)' }}>{label}</p>
                  <p style={{ fontSize: 12, color: 'var(--ink-3)', margin: '2px 0 0' }}>{sub}</p>
                </div>
                <Icon name="chev-right" size={16} color="var(--ink-4)" />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 스탯 스트립 */}
      <div className="mb-5" style={{
        display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)',
        gap: '1px', background: 'var(--rule)',
        border: '1px solid var(--rule)', borderRadius: 10, overflow: 'hidden',
      }}>
        {[
          { label: 'tasks',  value: totalDone,        unit: `/${totalCount}`,      italic: false, onClick: () => router.push('/timeline') },
          { label: 'budget', value: budgetPct,         unit: '%',                  italic: true,  onClick: () => router.push('/budget') },
          { label: '미결정', value: undecided.length,  unit: '',                   italic: false, onClick: () => router.push('/decisions') },
        ].map(({ label, value, unit, italic, onClick }) => (
          <button
            key={label}
            onClick={onClick}
            style={{ background: 'var(--paper)', padding: '14px 10px', textAlign: 'center', border: 'none', cursor: 'pointer' }}
          >
            <div style={{ fontFamily: 'var(--font-serif-en)', fontStyle: 'italic', fontSize: 10.5, color: 'var(--champagne-2)', letterSpacing: '0.06em', marginBottom: 4 }}>{label}</div>
            <div style={{ fontFamily: 'var(--font-serif-en)', fontWeight: 500, fontSize: 26, color: 'var(--ink)', lineHeight: 1, letterSpacing: '-0.02em', fontFeatureSettings: '"lnum" 1, "tnum" 1' }}>
              {value}
              {unit && <span style={{ fontSize: 14, color: 'var(--champagne-2)', fontWeight: 400, fontStyle: italic ? 'italic' : 'normal' }}>{unit}</span>}
            </div>
          </button>
        ))}
      </div>

      {/* ── 다이어리 카드 (letterpress) ── */}
      <button
        className="w-full text-left mb-4"
        onClick={() => router.push('/notes')}
        style={{
          background: 'var(--ink)',
          borderRadius: 10,
          padding: '22px 20px 20px',
          position: 'relative',
          overflow: 'hidden',
          border: 'none',
          cursor: 'pointer',
          display: 'block',
        }}
      >
        {/* inner champagne border */}
        <div style={{
          position: 'absolute', inset: 5,
          border: '1px solid var(--champagne)',
          opacity: 0.35, borderRadius: 6,
          pointerEvents: 'none',
        }} />
        <div style={{
          fontFamily: 'var(--font-serif-en)',
          fontStyle: 'italic',
          fontSize: 10.5,
          color: 'var(--champagne)',
          letterSpacing: '0.1em',
          opacity: 0.7,
          marginBottom: 10,
        }}>
          · our diary ·
        </div>
        {latestNote ? (
          <>
            <p style={{
              fontFamily: 'var(--font-serif-ko)',
              fontSize: 14,
              color: 'var(--ivory)',
              lineHeight: 1.7,
              margin: '0 0 12px',
              display: '-webkit-box',
              WebkitLineClamp: 3,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
              wordBreak: 'keep-all',
            }}>
              {latestNote.content}
            </p>
            <div style={{
              fontFamily: 'var(--font-serif-en)',
              fontStyle: 'italic',
              fontSize: 11,
              color: 'var(--champagne)',
              opacity: 0.6,
            }}>
              {new Date(latestNote.updated_at).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })} · 메모 보기 →
            </div>
          </>
        ) : (
          <div style={{ textAlign: 'center', padding: '10px 0' }}>
            <p style={{
              fontFamily: 'var(--font-serif-ko)',
              fontSize: 13,
              color: 'var(--ivory)',
              opacity: 0.5,
              margin: '0 0 8px',
            }}>
              아직 함께 쓴 메모가 없어요
            </p>
            <p style={{
              fontFamily: 'var(--font-serif-en)',
              fontStyle: 'italic',
              fontSize: 11,
              color: 'var(--champagne)',
              opacity: 0.6,
            }}>
              tap to start writing together →
            </p>
          </div>
        )}
      </button>

      {/* 🔴 긴급 — 이번 주 마감 or 지난 항목 */}
      {urgentItems.length > 0 && (
        <div
          className="card mb-4"
          style={{ border: '1.5px solid var(--toss-red-light)', backgroundColor: 'var(--toss-red-light)' }}
        >
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <AlertCircle size={16} color="var(--toss-red)" />
              <p className="text-sm font-bold" style={{ color: 'var(--toss-red)' }}>
                지금 해야 해요 · {urgentItems.length}개
              </p>
            </div>
            <button
              onClick={() => router.push('/timeline')}
              className="flex items-center gap-0.5 text-xs"
              style={{ color: 'var(--toss-red)', background: 'none', border: 'none', cursor: 'pointer' }}
            >
              전체 보기 <ChevronRight size={12} />
            </button>
          </div>
          <ul className="flex flex-col gap-3">
            {urgentItems.slice(0, 3).map(item => (
              <li key={item.id} className="flex items-center gap-3">
                <button
                  onClick={() => toggleItem(item.id, item.is_done)}
                  className="flex-shrink-0 flex items-center justify-center"
                  style={{
                    width: 20, height: 20, borderRadius: '50%',
                    border: '2px solid var(--toss-red)',
                    backgroundColor: item.is_done ? 'var(--toss-red)' : 'transparent',
                  }}
                >
                  {item.is_done && <Icon name="check" size={11} color="white" />}
                </button>
                <span className="flex-1 text-sm" style={{ color: 'var(--toss-text-primary)', textDecoration: item.is_done ? 'line-through' : 'none' }}>
                  {item.title}
                </span>
              </li>
            ))}
            {urgentItems.length > 3 && (
              <li className="text-xs text-center" style={{ color: 'var(--toss-red)' }}>
                + {urgentItems.length - 3}개 더 있어요
              </li>
            )}
          </ul>
        </div>
      )}

      {/* 예산 현황 카드 */}
      {totalBudget > 0 && (
        <button
          className="card mb-4 w-full text-left"
          style={{ cursor: 'pointer' }}
          onClick={() => router.push('/budget')}
        >
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Wallet size={16} color="var(--toss-blue)" />
              <p className="text-sm font-semibold" style={{ color: 'var(--toss-text-primary)' }}>예산 현황</p>
            </div>
            <ChevronRight size={16} color="var(--toss-text-tertiary)" />
          </div>
          <div className="flex justify-between text-xs mb-2" style={{ color: 'var(--toss-text-tertiary)' }}>
            <span className="tabular-nums">사용 {totalSpent.toLocaleString()}만원</span>
            <span className="tabular-nums">
              잔여{' '}
              <span style={{ color: budgetRemain < 0 ? 'var(--toss-red)' : 'var(--toss-green)', fontWeight: 700 }}>
                {budgetRemain.toLocaleString()}만원
              </span>
            </span>
          </div>
          <div className="progress-bar mb-2">
            <div
              className="progress-fill"
              style={{
                width: `${Math.min(100, budgetPct)}%`,
                backgroundColor: budgetPct > 100 ? 'var(--toss-red)' : budgetPct > 80 ? 'var(--toss-yellow)' : 'var(--toss-blue)',
              }}
            />
          </div>
          <div className="flex justify-between items-center">
            <p className="text-xs" style={{ color: 'var(--toss-text-tertiary)' }}>
              전체 예산 {totalBudget.toLocaleString()}만원
            </p>
            <span
              className="text-xs font-bold tabular-nums px-2 py-0.5 rounded-full"
              style={{
                backgroundColor: budgetPct > 100 ? 'var(--toss-red-light)' : budgetPct > 80 ? 'var(--ochre-wash)' : 'var(--toss-blue-light)',
                color: budgetPct > 100 ? 'var(--toss-red)' : budgetPct > 80 ? 'var(--toss-yellow)' : 'var(--toss-blue)',
              }}
            >
              {budgetPct}%
            </span>
          </div>
        </button>
      )}

      {/* 업체 잔금 D-day */}
      {pendingBalances.length > 0 && (
        <button
          className="card mb-4 w-full text-left"
          style={{ cursor: 'pointer' }}
          onClick={() => router.push('/budget')}
        >
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <CalendarDays size={16} color="var(--rose)" />
              <p className="text-sm font-semibold" style={{ color: 'var(--toss-text-primary)' }}>업체 잔금 일정</p>
            </div>
            <ChevronRight size={16} color="var(--toss-text-tertiary)" />
          </div>
          <div className="flex flex-col gap-2">
            {pendingBalances.map(v => {
              const isOverdue = v.dday < 0;
              const isSoon    = v.dday >= 0 && v.dday <= 14;
              const ddayColor = isOverdue ? 'var(--toss-red)' : isSoon ? 'var(--toss-yellow)' : 'var(--toss-text-secondary)';

              return (
                <div key={v.id} className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium" style={{ color: 'var(--toss-text-primary)' }}>{v.name}</p>
                    <p className="text-xs mt-0.5 tabular-nums" style={{ color: 'var(--toss-text-tertiary)' }}>
                      {new Date(v.balance_due).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold tabular-nums" style={{ color: 'var(--toss-red)' }}>
                      {v.balance?.toLocaleString()}만원
                    </p>
                    <p className="text-xs font-semibold tabular-nums" style={{ color: ddayColor }}>
                      {isOverdue ? `D+${Math.abs(v.dday)}` : v.dday === 0 ? '오늘!' : `D-${v.dday}`}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </button>
      )}

      {/* 미결정 의사결정 */}
      {undecided.length > 0 && (
        <button
          className="card mb-4 w-full text-left"
          style={{ cursor: 'pointer' }}
          onClick={() => router.push('/decisions')}
        >
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <MessageSquare size={16} color="var(--toss-yellow)" />
              <p className="text-sm font-semibold" style={{ color: 'var(--toss-text-primary)' }}>
                아직 결정 안 된 항목
              </p>
            </div>
            <span className="flex items-center gap-0.5">
              <span className="text-xs tabular-nums" style={{ color: 'var(--toss-text-tertiary)' }}>
                {undecided.length}개
              </span>
              <ChevronRight size={16} color="var(--toss-text-tertiary)" />
            </span>
          </div>
          <div className="flex flex-col gap-2">
            {undecided.slice(0, 3).map(d => (
              <div key={d.id} className="flex items-center gap-2">
                <span
                  className="text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0"
                  style={{
                    backgroundColor: d.status === 'discussing' ? 'var(--ochre-wash)' : 'var(--toss-bg)',
                    color: d.status === 'discussing' ? 'var(--toss-yellow)' : 'var(--toss-text-tertiary)',
                  }}
                >
                  {d.status === 'discussing' ? '논의 중' : '미논의'}
                </span>
                <p className="text-sm" style={{ color: 'var(--toss-text-primary)' }}>{d.title}</p>
              </div>
            ))}
            {undecided.length > 3 && (
              <p className="text-xs" style={{ color: 'var(--toss-text-tertiary)' }}>
                + {undecided.length - 3}개 더
              </p>
            )}
          </div>
        </button>
      )}

      {/* 방명록 최근 메시지 */}
      {guestbook.length > 0 && (
        <button
          className="card mb-4 w-full text-left"
          style={{ cursor: 'pointer' }}
          onClick={() => router.push('/guests')}
        >
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <BookOpen size={16} color="var(--rose)" />
              <p className="text-sm font-semibold" style={{ color: 'var(--toss-text-primary)' }}>
                방명록
              </p>
              <span className="text-xs font-medium px-1.5 py-0.5 rounded-full"
                style={{ backgroundColor: 'var(--rose-light)', color: 'var(--rose)' }}>
                {guestbook.length}
              </span>
            </div>
            <ChevronRight size={16} color="var(--toss-text-tertiary)" />
          </div>
          <div className="flex flex-col gap-2">
            {guestbook.map(msg => (
              <div key={msg.id} className="flex items-start gap-2">
                <Icon name="invite" size={14} color="var(--champagne)" style={{ flexShrink: 0, marginTop: 2 }} />
                <div className="flex-1 min-w-0">
                  <span className="text-xs font-semibold" style={{ color: 'var(--toss-text-primary)' }}>
                    {msg.name}
                  </span>
                  <span className="text-xs ml-1.5" style={{ color: 'var(--toss-text-secondary)' }}>
                    {msg.message.length > 30 ? msg.message.slice(0, 30) + '…' : msg.message}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </button>
      )}

      {/* 퀵 액션 */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginBottom: 16 }}>
        {[
          { icon: 'checklist', label: '체크리스트', href: '/timeline' },
          { icon: 'invite',    label: '청첩장',     href: '/invitation' },
          { icon: 'guests',    label: '하객',       href: '/guests' },
          { icon: 'camera',    label: '스냅',       href: '/gallery' },
        ].map(({ icon, label, href }) => (
          <button
            key={href}
            onClick={() => router.push(href)}
            style={{ background: 'var(--paper)', border: '1px solid var(--rule)', borderRadius: 10, padding: '14px 6px 10px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, cursor: 'pointer' }}
          >
            <div style={{ width: 36, height: 36, border: '1px solid var(--champagne)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Icon name={icon} size={18} color="var(--champagne-2)" />
            </div>
            <span style={{ fontFamily: 'var(--font-serif-ko)', fontWeight: 500, fontSize: 11.5, color: 'var(--ink)' }}>{label}</span>
          </button>
        ))}
      </div>

      <BottomNav active="home" />
    </div>
  );
}
