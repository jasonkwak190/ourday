'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Icon from '@/components/Icon';

const NAV_ITEMS = [
  { key: 'home',      label: 'home',   icon: 'home',      href: '/dashboard' },
  { key: 'timeline',  label: 'tasks',  icon: 'checklist', href: '/timeline' },
  { key: 'budget',    label: 'budget', icon: 'wallet',    href: '/budget' },
  { key: 'decisions', label: 'decide', icon: 'chat',      href: '/decisions' },
];

const MORE_ITEMS = [
  { key: 'guests',   label: '하객 관리',   icon: 'guests',    href: '/guests',    desc: '하객 명단·축의금·청첩장' },
  { key: 'gallery',  label: '웨딩 사진',   icon: 'camera',    href: '/gallery',   desc: '촬영 QR·사진 모아보기' },
  { key: 'notes',    label: '정보 공유',   icon: 'paperclip', href: '/notes',     desc: '링크·메모 함께 모아두기' },
  { key: 'guide',    label: '예식 가이드', icon: 'book',      href: '/guide',     desc: '폐백·청첩장·예단 정보' },
  { key: 'settings', label: '설정',        icon: 'settings',  href: '/settings',  desc: '프로필·결혼정보 수정' },
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
            style={{ backgroundColor: 'rgba(26,22,19,0.3)' }}
            onClick={() => setShowMore(false)}
          />
          <div
            className="fixed z-50 left-1/2"
            style={{
              bottom: 'calc(88px + env(safe-area-inset-bottom))',
              transform: 'translateX(-50%)',
              width: '100%',
              maxWidth: '430px',
              backgroundColor: 'var(--paper)',
              borderRadius: '16px 16px 0 0',
              boxShadow: 'var(--shadow-sheet)',
              padding: '12px 20px 20px',
            }}
          >
            <div
              className="mx-auto mb-4"
              style={{ width: 32, height: 3, borderRadius: 99, backgroundColor: 'var(--rule-strong)' }}
            />
            <p style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--ink-4)', marginBottom: 12, fontFamily: 'var(--font-serif-en)', fontStyle: 'italic' }}>
              more
            </p>
            <div className="flex flex-col gap-1">
              {MORE_ITEMS.map(({ key, label, icon, href, desc }) => (
                <button
                  key={key}
                  onClick={() => handleNav(href)}
                  className="flex items-center gap-4 text-left w-full"
                  style={{
                    backgroundColor: active === key ? 'var(--champagne-wash)' : 'transparent',
                    border: 'none',
                    borderRadius: 10,
                    cursor: 'pointer',
                    padding: '12px 14px',
                    transition: 'background-color 0.14s',
                  }}
                >
                  <div
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: 10,
                      backgroundColor: active === key ? 'var(--champagne)' : 'var(--ivory-2)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    <Icon name={icon} size={20} color={active === key ? 'white' : 'var(--ink-2)'} />
                  </div>
                  <div>
                    <p style={{ fontSize: 14, fontWeight: 500, color: active === key ? 'var(--champagne-2)' : 'var(--ink)', margin: 0, fontFamily: 'var(--font-serif-ko)' }}>
                      {label}
                    </p>
                    <p style={{ fontSize: 12, marginTop: 2, color: 'var(--ink-3)' }}>{desc}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </>
      )}

      {/* 바텀 네비 */}
      <nav className="nav-bottom">
        {NAV_ITEMS.map(({ key, label, icon, href }) => {
          const isActive = key === active;
          return (
            <button
              key={key}
              onClick={() => { setShowMore(false); router.push(href); }}
              style={{
                flex: 1,
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: '10px 4px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 0,
              }}
            >
              <Icon
                name={icon}
                size={24}
                color={isActive ? 'var(--champagne-2)' : 'var(--ink-4)'}
              />
            </button>
          );
        })}

        {/* 더보기 버튼 */}
        <button
          onClick={() => setShowMore(v => !v)}
          style={{
            flex: 1,
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: '6px 4px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 3,
          }}
        >
          <Icon
            name="more"
            size={24}
            color={isMoreActive || showMore ? 'var(--champagne-2)' : 'var(--ink-4)'}
          />
        </button>
      </nav>
    </>
  );
}
