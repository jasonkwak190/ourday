'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

const NAV_ITEMS = [
  { key: 'home',    label: '홈',   icon: '🏠', href: '/dashboard' },
  { key: 'timeline',label: '일정', icon: '📅', href: '/timeline' },
  { key: 'budget',  label: '예산', icon: '💰', href: '/budget' },
  { key: 'guests',  label: '하객', icon: '🎊', href: '/guests' },
  { key: 'vendors', label: '업체', icon: '🏢', href: '/vendors' },
];

const MORE_ITEMS = [
  { key: 'decisions', label: '의사결정', icon: '💬', href: '/decisions', desc: '신랑·신부 의견 조율' },
  { key: 'guide',     label: '예식 가이드', icon: '📖', href: '/guide',     desc: '폐백·청첩장·예단 정보' },
  { key: 'settings',  label: '설정',     icon: '⚙️', href: '/settings',   desc: '프로필·결혼정보 수정' },
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
          {/* 배경 딤 */}
          <div
            className="fixed inset-0 z-40"
            style={{ backgroundColor: 'rgba(0,0,0,0.25)' }}
            onClick={() => setShowMore(false)}
          />
          {/* 시트 */}
          <div
            className="fixed z-50 left-1/2 rounded-t-3xl px-4 pt-5 pb-8"
            style={{
              bottom: '72px',
              transform: 'translateX(-50%)',
              width: '100%',
              maxWidth: '430px',
              backgroundColor: 'white',
              boxShadow: '0 -4px 24px rgba(0,0,0,0.12)',
            }}
          >
            <div
              className="w-10 h-1 rounded-full mx-auto mb-5"
              style={{ backgroundColor: 'var(--beige)' }}
            />
            <p className="text-xs font-semibold mb-3 px-1" style={{ color: 'var(--stone)' }}>더 보기</p>
            <div className="flex flex-col gap-2">
              {MORE_ITEMS.map((item) => (
                <button
                  key={item.key}
                  onClick={() => handleNav(item.href)}
                  className="flex items-center gap-4 px-4 py-3 rounded-2xl text-left"
                  style={{
                    backgroundColor: active === item.key ? 'var(--rose-light)' : 'var(--beige)',
                    border: `1.5px solid ${active === item.key ? 'var(--rose)' : 'transparent'}`,
                    cursor: 'pointer',
                  }}
                >
                  <span className="text-2xl">{item.icon}</span>
                  <div>
                    <p className="text-sm font-semibold" style={{ color: active === item.key ? 'var(--rose)' : 'var(--ink)' }}>
                      {item.label}
                    </p>
                    <p className="text-xs mt-0.5" style={{ color: 'var(--stone)' }}>{item.desc}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </>
      )}

      {/* 바텀 네비 */}
      <nav className="nav-bottom">
        {NAV_ITEMS.map((item) => {
          const isActive = item.key === active;
          return (
            <button
              key={item.key}
              onClick={() => { setShowMore(false); router.push(item.href); }}
              className="flex flex-col items-center gap-0.5 px-2 py-1 min-w-0"
              style={{ background: 'none', border: 'none', cursor: 'pointer' }}
            >
              <span className="text-xl leading-none">{item.icon}</span>
              <span className="text-xs font-medium" style={{ color: isActive ? 'var(--rose)' : 'var(--stone)' }}>
                {item.label}
              </span>
              {isActive && (
                <span className="block w-1 h-1 rounded-full mt-0.5" style={{ backgroundColor: 'var(--rose)' }} />
              )}
            </button>
          );
        })}

        {/* 더보기 버튼 */}
        <button
          onClick={() => setShowMore((v) => !v)}
          className="flex flex-col items-center gap-0.5 px-2 py-1 min-w-0"
          style={{ background: 'none', border: 'none', cursor: 'pointer' }}
        >
          <span className="text-xl leading-none">{ isMoreActive ? '✦' : '···' }</span>
          <span className="text-xs font-medium" style={{ color: isMoreActive ? 'var(--rose)' : 'var(--stone)' }}>
            더보기
          </span>
          {isMoreActive && (
            <span className="block w-1 h-1 rounded-full mt-0.5" style={{ backgroundColor: 'var(--rose)' }} />
          )}
        </button>
      </nav>
    </>
  );
}
