'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Home, CalendarDays, Wallet, Users, Building2, MoreHorizontal, MessageSquare, BookOpen, Settings, Mail, Paperclip } from 'lucide-react';

const NAV_ITEMS = [
  { key: 'home',     label: '홈',   Icon: Home,         href: '/dashboard' },
  { key: 'timeline', label: '일정', Icon: CalendarDays, href: '/timeline' },
  { key: 'budget',   label: '예산', Icon: Wallet,       href: '/budget' },
  { key: 'guests',   label: '하객', Icon: Users,        href: '/guests' },
  { key: 'vendors',  label: '업체', Icon: Building2,    href: '/vendors' },
];

const MORE_ITEMS = [
  { key: 'invitation', label: '모바일 청첩장', Icon: Mail,          href: '/invitation', desc: '템플릿으로 청첩장 만들고 공유' },
  { key: 'notes',      label: '정보 공유',    Icon: Paperclip,     href: '/notes',      desc: '링크·메모 함께 모아두기' },
  { key: 'decisions',  label: '의사결정',     Icon: MessageSquare, href: '/decisions',  desc: '신랑·신부 의견 조율' },
  { key: 'guide',      label: '예식 가이드',  Icon: BookOpen,      href: '/guide',      desc: '폐백·청첩장·예단 정보' },
  { key: 'settings',   label: '설정',         Icon: Settings,      href: '/settings',   desc: '프로필·결혼정보 수정' },
];

const MORE_KEYS = MORE_ITEMS.map(i => i.key);

export default function BottomNav({ active }) {
  const router = useRouter();
  const [showMore, setShowMore] = useState(false);

  const isMoreActive = MORE_KEYS.includes(active);

  function handleNav(href) {
    setShowMore(false);
    router.push(href);
  }

  return (
    <>
      {/* 더보기 시트 */}
      {showMore && (
        <>
          <div
            className="fixed inset-0 z-40"
            style={{ backgroundColor: 'rgba(0,0,0,0.3)' }}
            onClick={() => setShowMore(false)}
          />
          <div
            className="fixed z-50 left-1/2"
            style={{
              /* 바텀 네비 높이(≈64px) + 홈 인디케이터 위에 딱 붙도록 */
              bottom: 'calc(64px + env(safe-area-inset-bottom))',
              transform: 'translateX(-50%)',
              width: '100%',
              maxWidth: '430px',
              backgroundColor: 'var(--toss-card)',
              borderRadius: '20px 20px 0 0',
              boxShadow: '0 -4px 24px rgba(0,0,0,0.1)',
              padding: '12px 20px 20px',
            }}
          >
            <div
              className="mx-auto mb-4"
              style={{ width: 36, height: 4, borderRadius: 99, backgroundColor: 'var(--toss-border)' }}
            />
            <p className="text-xs font-semibold mb-3" style={{ color: 'var(--toss-text-tertiary)' }}>더 보기</p>
            <div className="flex flex-col gap-2">
              {MORE_ITEMS.map(({ key, label, Icon, href, desc }) => (
                <button
                  key={key}
                  onClick={() => handleNav(href)}
                  className="flex items-center gap-4 px-4 py-3 rounded-2xl text-left w-full"
                  style={{
                    backgroundColor: active === key ? 'var(--toss-blue-light)' : 'var(--toss-bg)',
                    border: 'none',
                    cursor: 'pointer',
                    transition: 'background-color 0.15s',
                  }}
                >
                  <div
                    className="flex items-center justify-center flex-shrink-0"
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: 12,
                      backgroundColor: active === key ? 'var(--toss-blue)' : 'var(--toss-card)',
                    }}
                  >
                    <Icon
                      size={20}
                      strokeWidth={2}
                      color={active === key ? 'white' : 'var(--toss-text-secondary)'}
                    />
                  </div>
                  <div>
                    <p className="text-sm font-bold" style={{ color: active === key ? 'var(--toss-blue)' : 'var(--toss-text-primary)' }}>
                      {label}
                    </p>
                    <p className="text-xs mt-0.5" style={{ color: 'var(--toss-text-tertiary)' }}>{desc}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </>
      )}

      {/* 바텀 네비 */}
      <nav className="nav-bottom">
        {NAV_ITEMS.map(({ key, label, Icon, href }) => {
          const isActive = key === active;
          return (
            <button
              key={key}
              onClick={() => { setShowMore(false); router.push(href); }}
              className="flex flex-col items-center gap-1 py-1"
              style={{
                flex: 1,
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: '6px 4px',
              }}
            >
              <Icon
                size={22}
                strokeWidth={isActive ? 2.5 : 2}
                color={isActive ? 'var(--toss-blue)' : 'var(--toss-text-tertiary)'}
              />
              <span
                className="text-xs font-semibold"
                style={{
                  color: isActive ? 'var(--toss-blue)' : 'var(--toss-text-tertiary)',
                  letterSpacing: '-0.01em',
                }}
              >
                {label}
              </span>
            </button>
          );
        })}

        {/* 더보기 버튼 */}
        <button
          onClick={() => setShowMore(v => !v)}
          className="flex flex-col items-center gap-1"
          style={{
            flex: 1,
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: '6px 4px',
          }}
        >
          <MoreHorizontal
            size={22}
            strokeWidth={isMoreActive ? 2.5 : 2}
            color={isMoreActive || showMore ? 'var(--toss-blue)' : 'var(--toss-text-tertiary)'}
          />
          <span
            className="text-xs font-semibold"
            style={{
              color: isMoreActive || showMore ? 'var(--toss-blue)' : 'var(--toss-text-tertiary)',
              letterSpacing: '-0.01em',
            }}
          >
            더보기
          </span>
        </button>
      </nav>
    </>
  );
}
