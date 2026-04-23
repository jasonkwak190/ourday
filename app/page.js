'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import OAuthButtons from '@/components/OAuthButtons';
import { supabase } from '@/lib/supabase';

// 앱 이름은 나중에 바꿀 것 — 여기 한 곳만 수정하면 됨
const APP_NAME = '우리의 날';
const APP_SUB  = 'Ourday';

const FEATURES = [
  {
    emoji: '📋',
    title: '함께 체크하는 타임라인',
    desc: '신랑·신부가 같은 화면으로 준비 항목을 확인해요',
    preview: [
      { done: true,  label: '웨딩홀 계약' },
      { done: true,  label: '스드메 업체 선정' },
      { done: false, label: '청첩장 발송', urgent: true },
      { done: false, label: '혼수 목록 정리' },
    ],
  },
  {
    emoji: '💰',
    title: '예산 한눈에 관리',
    desc: '항목별 예상·실제 지출을 비교하고 잔여 예산을 추적해요',
    preview: null,
    stat: { used: 1240, total: 4000, pct: 31 },
  },
  {
    emoji: '💌',
    title: '모바일 청첩장 + RSVP',
    desc: '링크 하나로 청첩장을 보내고 참석 여부가 자동으로 정리돼요',
    preview: null,
    rsvp: { attend: 42, decline: 8 },
  },
];

export default function LandingPage() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);

  // 이미 로그인된 사용자 → 대시보드로
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) router.replace('/dashboard');
      else setChecking(false);
    });
  }, [router]);

  if (checking) {
    return (
      <div style={{
        minHeight: '100dvh', display: 'flex', alignItems: 'center',
        justifyContent: 'center', backgroundColor: 'var(--toss-bg)',
      }}>
        <span style={{ fontSize: 32 }}>💍</span>
      </div>
    );
  }

  return (
    <div style={{
      minHeight: '100dvh',
      maxWidth: 430,
      margin: '0 auto',
      backgroundColor: 'var(--toss-bg)',
      display: 'flex',
      flexDirection: 'column',
      padding: '0 20px 40px',
    }}>

      {/* ── 상단 바: 로고 + 로그인 링크 ── */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '16px 0 8px',
      }}>
        <p style={{
          fontSize: 13,
          fontWeight: 700,
          color: 'var(--toss-blue)',
          letterSpacing: '-0.01em',
        }}>
          {APP_SUB}
        </p>
        <Link
          href="/login"
          style={{
            fontSize: 13,
            fontWeight: 600,
            color: 'var(--toss-text-secondary)',
            padding: '6px 14px',
            borderRadius: 20,
            border: '1.5px solid var(--toss-border)',
            backgroundColor: 'var(--toss-card)',
            textDecoration: 'none',
          }}
        >
          로그인
        </Link>
      </div>

      {/* ── 히어로 ── */}
      <div style={{ textAlign: 'center', padding: '32px 0 28px' }}>
        <div style={{ fontSize: 40, marginBottom: 16, lineHeight: 1 }}>💍</div>
        <h1 style={{
          fontSize: 28,
          fontWeight: 800,
          lineHeight: 1.3,
          letterSpacing: '-0.03em',
          color: 'var(--toss-text-primary)',
          margin: '0 0 12px',
        }}>
          두 사람의 결혼 준비,<br />
          <span style={{ color: 'var(--toss-blue)' }}>함께 하나씩</span>
        </h1>
        <p style={{
          fontSize: 14,
          color: 'var(--toss-text-secondary)',
          lineHeight: 1.7,
          margin: 0,
        }}>
          체크리스트부터 청첩장까지<br />
          신랑·신부가 같은 화면을 봐요
        </p>
      </div>

      {/* ── CTA 버튼 (히어로 바로 아래) ── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 32 }}>
        <OAuthButtons />
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ flex: 1, height: 1, backgroundColor: 'var(--toss-border)' }} />
          <span style={{ fontSize: 12, color: 'var(--toss-text-tertiary)' }}>또는</span>
          <div style={{ flex: 1, height: 1, backgroundColor: 'var(--toss-border)' }} />
        </div>
        <Link
          href="/signup"
          style={{
            height: 52,
            borderRadius: 16,
            border: '1.5px solid var(--toss-border)',
            backgroundColor: 'var(--toss-card)',
            color: 'var(--toss-text-primary)',
            fontWeight: 600,
            fontSize: 14,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            textDecoration: 'none',
          }}
        >
          이메일로 시작하기
        </Link>
      </div>

      {/* ── 기능 미리보기 ── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <p style={{
          fontSize: 11,
          fontWeight: 600,
          letterSpacing: '0.08em',
          color: 'var(--toss-text-tertiary)',
          textAlign: 'center',
          textTransform: 'uppercase',
          marginBottom: 4,
        }}>
          이런 기능들이 있어요
        </p>

        {/* 카드 1: 타임라인 미리보기 */}
        <FeatureCard emoji="📋" title="함께 체크하는 타임라인" desc="신랑·신부가 같은 화면으로 준비 항목을 확인해요">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 12 }}>
            {[
              { done: true,  label: '웨딩홀 계약' },
              { done: true,  label: '스드메 업체 선정' },
              { done: false, label: '청첩장 발송', urgent: true },
              { done: false, label: '혼수 목록 정리' },
            ].map((item, i) => (
              <div key={i} style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '8px 12px',
                borderRadius: 10,
                backgroundColor: item.done ? 'var(--toss-bg)' : item.urgent ? 'rgba(255,71,87,0.06)' : 'var(--toss-bg)',
              }}>
                <div style={{
                  width: 18, height: 18, borderRadius: '50%', flexShrink: 0,
                  backgroundColor: item.done ? 'var(--toss-blue)' : 'transparent',
                  border: `2px solid ${item.done ? 'var(--toss-blue)' : item.urgent ? 'var(--toss-red)' : 'var(--toss-border)'}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  {item.done && <span style={{ fontSize: 10, color: 'white', fontWeight: 700 }}>✓</span>}
                </div>
                <span style={{
                  fontSize: 13, fontWeight: item.urgent ? 600 : 400,
                  color: item.done ? 'var(--toss-text-tertiary)' : item.urgent ? 'var(--toss-red)' : 'var(--toss-text-primary)',
                  textDecoration: item.done ? 'line-through' : 'none',
                  flex: 1,
                }}>{item.label}</span>
                {item.urgent && <span style={{ fontSize: 10, color: 'var(--toss-red)', fontWeight: 700 }}>D-3</span>}
              </div>
            ))}
          </div>
        </FeatureCard>

        {/* 카드 2: 예산 미리보기 */}
        <FeatureCard emoji="💰" title="예산 한눈에 관리" desc="항목별 예상·실제 지출을 비교하고 잔여 예산을 추적해요">
          <div style={{ marginTop: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
              <span style={{ fontSize: 12, color: 'var(--toss-text-tertiary)' }}>사용 1,240만원</span>
              <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--toss-green)' }}>잔여 2,760만원</span>
            </div>
            <div style={{ height: 8, borderRadius: 99, backgroundColor: 'var(--toss-bg)', overflow: 'hidden' }}>
              <div style={{ width: '31%', height: '100%', borderRadius: 99, backgroundColor: 'var(--toss-blue)' }} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
              <span style={{ fontSize: 11, color: 'var(--toss-text-tertiary)' }}>31% 사용</span>
              <span style={{ fontSize: 11, color: 'var(--toss-text-tertiary)' }}>총 4,000만원</span>
            </div>
          </div>
        </FeatureCard>

        {/* 카드 3: 청첩장 + RSVP */}
        <FeatureCard emoji="💌" title="모바일 청첩장 + RSVP" desc="링크 하나로 청첩장을 보내고 참석 여부가 자동으로 정리돼요">
          <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
            <div style={{
              flex: 1, padding: '10px 12px', borderRadius: 12,
              backgroundColor: 'var(--toss-blue-light)', textAlign: 'center',
            }}>
              <p style={{ fontSize: 22, fontWeight: 800, color: 'var(--toss-blue)', margin: 0 }}>42</p>
              <p style={{ fontSize: 11, color: 'var(--toss-blue)', margin: '2px 0 0', opacity: 0.8 }}>🎉 참석</p>
            </div>
            <div style={{
              flex: 1, padding: '10px 12px', borderRadius: 12,
              backgroundColor: 'var(--toss-bg)', textAlign: 'center',
            }}>
              <p style={{ fontSize: 22, fontWeight: 800, color: 'var(--toss-text-secondary)', margin: 0 }}>8</p>
              <p style={{ fontSize: 11, color: 'var(--toss-text-tertiary)', margin: '2px 0 0' }}>🙏 불참</p>
            </div>
            <div style={{
              flex: 1, padding: '10px 12px', borderRadius: 12,
              backgroundColor: 'rgba(var(--rose-rgb, 212,135,154),0.1)', textAlign: 'center',
            }}>
              <p style={{ fontSize: 22, fontWeight: 800, color: 'var(--rose)', margin: 0 }}>2</p>
              <p style={{ fontSize: 11, color: 'var(--rose)', margin: '2px 0 0', opacity: 0.8 }}>💌 방명록</p>
            </div>
          </div>
        </FeatureCard>

        {/* 소셜프루프 — 고정 문구 */}
        <p style={{
          textAlign: 'center',
          fontSize: 12,
          color: 'var(--toss-text-tertiary)',
          marginTop: 8,
          lineHeight: 1.6,
        }}>
          체크리스트 · 예산 · 하객 · 청첩장 · 방명록<br />
          결혼 준비에 필요한 것들을 한 곳에서
        </p>
      </div>

      {/* 푸터 */}
      <div style={{
        marginTop: 40, paddingTop: 20,
        borderTop: '1px solid var(--toss-border)',
        textAlign: 'center',
        fontSize: 12, color: 'var(--toss-text-tertiary)',
        lineHeight: 2,
      }}>
        <a href="/privacy" style={{ color: 'var(--toss-text-tertiary)', textDecoration: 'underline' }}>
          개인정보처리방침
        </a>
        <span style={{ margin: '0 8px' }}>·</span>
        <a href={`mailto:jasonkwak201@gmail.com`} style={{ color: 'var(--toss-text-tertiary)', textDecoration: 'underline' }}>
          문의하기
        </a>
        <br />
        © 2025 우리의 날. All rights reserved.
      </div>
    </div>
  );
}

function FeatureCard({ emoji, title, desc, children }) {
  return (
    <div style={{
      backgroundColor: 'var(--toss-card)',
      borderRadius: 20,
      padding: '16px 16px',
      boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
        <span style={{ fontSize: 20, lineHeight: 1, flexShrink: 0, marginTop: 2 }}>{emoji}</span>
        <div>
          <p style={{
            fontSize: 14, fontWeight: 700,
            color: 'var(--toss-text-primary)',
            margin: '0 0 2px',
            letterSpacing: '-0.01em',
          }}>{title}</p>
          <p style={{
            fontSize: 12,
            color: 'var(--toss-text-tertiary)',
            margin: 0,
            lineHeight: 1.5,
          }}>{desc}</p>
        </div>
      </div>
      {children}
    </div>
  );
}
