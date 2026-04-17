'use client';

import { useRouter } from 'next/navigation';

const NAV_ITEMS = [
  { key: 'home',    label: '홈',   icon: '🏠', href: '/dashboard' },
  { key: 'timeline',label: '일정', icon: '📅', href: '/timeline' },
  { key: 'budget',  label: '예산', icon: '💰', href: '/budget' },
  { key: 'guests',  label: '하객', icon: '🎊', href: '/guests' },
  { key: 'vendors', label: '업체', icon: '🏢', href: '/vendors' },
];

export default function BottomNav({ active }) {
  const router = useRouter();

  return (
    <nav className="nav-bottom">
      {NAV_ITEMS.map((item) => {
        const isActive = item.key === active;
        return (
          <button
            key={item.key}
            onClick={() => router.push(item.href)}
            className="flex flex-col items-center gap-0.5 px-3 py-1 min-w-0"
            style={{ background: 'none', border: 'none', cursor: 'pointer' }}
          >
            <span className="text-xl leading-none">{item.icon}</span>
            <span
              className="text-xs font-medium"
              style={{ color: isActive ? 'var(--rose)' : 'var(--stone)' }}
            >
              {item.label}
            </span>
            {isActive && (
              <span
                className="block w-1 h-1 rounded-full mt-0.5"
                style={{ backgroundColor: 'var(--rose)' }}
              />
            )}
          </button>
        );
      })}
    </nav>
  );
}
