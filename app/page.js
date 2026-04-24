'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import OAuthButtons from '@/components/OAuthButtons';
import Icon from '@/components/Icon';
import { supabase } from '@/lib/supabase';

// 앱 이름은 나중에 바꿀 것 — 여기 한 곳만 수정하면 됨
const APP_NAME = '우리의 날';
const APP_SUB  = 'Ourday';

const FEATURES = [
  {
    icon: 'checklist',
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
    icon: 'wallet',
    title: '예산 한눈에 관리',
    desc: '항목별 예상·실제 지출을 비교하고 잔여 예산을 추적해요',
    preview: null,
    stat: { used: 1240, total: 4000, pct: 31 },
  },
  {
    icon: 'invite',
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
        <Icon name="rings" size={36} color="var(--champagne)" />
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
        <div style={{ fontFamily: 'var(--font-serif-en)', fontSize: 18, color: 'var(--ink)', letterSpacing: '0.02em' }}>
          <span style={{ fontWeight: 500 }}>O</span>
          <span style={{ fontStyle: 'italic' }}>urday</span>
        </div>
        <Link
          href="/login"
          style={{
            fontSize: 13,
            fontWeight: 500,
            color: 'var(--ink-2)',
            padding: '6px 16px',
            borderRadius: 20,
            border: '1px solid var(--rule)',
            backgroundColor: 'var(--paper)',
            textDecoration: 'none',
          }}
        >
          로그인
        </Link>
      </div>

      {/* ── 히어로 ── */}
      <div style={{ textAlign: 'center', padding: '36px 0 24px' }}>
        {/* O·D 모노그램 */}
        <div style={{
          fontFamily: 'var(--font-serif-en)',
          fontWeight: 500,
          fontSize: 72,
          color: 'var(--ink)',
          letterSpacing: '-0.04em',
          lineHeight: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 10,
          marginBottom: 12,
        }}>
          <span>O</span>
          <span style={{
            width: 5,
            height: 5,
            borderRadius: '50%',
            backgroundColor: 'var(--champagne)',
            display: 'inline-block',
            marginBottom: 6,
            flexShrink: 0,
          }} />
          <span>D</span>
        </div>

        <h1 style={{
          fontFamily: 'var(--font-serif-ko)',
          fontSize: 22,
          fontWeight: 500,
          lineHeight: 1.45,
          letterSpacing: '-0.01em',
          color: 'var(--ink)',
          margin: '0 0 10px',
        }}>
          두 사람의 결혼 준비,{' '}
          <span style={{ fontFamily: 'var(--font-serif-en)', fontStyle: 'italic', color: 'var(--champagne-2)' }}>함께</span>
        </h1>
        <p style={{
          fontSize: 13,
          fontFamily: 'var(--font-serif-en)',
          fontStyle: 'italic',
          color: 'var(--ink-3)',
          lineHeight: 1.7,
          margin: 0,
          letterSpacing: '0.02em',
        }}>
          체크리스트부터 청첩장까지<br />
          신랑·신부가 같은 화면을 봐요
        </p>
      </div>

      {/* ── CTA 버튼 (히어로 바로 아래) ── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 32 }}>
        <OAuthButtons />
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '2px 0' }}>
          <span style={{ flex: 1, height: 1, background: 'var(--rule-strong)' }} />
          <span style={{ fontFamily: 'var(--font-serif-en)', fontStyle: 'italic', fontSize: 11, color: 'var(--ink-4)', letterSpacing: '0.08em' }}>· or ·</span>
          <span style={{ flex: 1, height: 1, background: 'var(--rule-strong)' }} />
        </div>
        <Link
          href="/signup"
          style={{
            height: 52,
            borderRadius: 28,
            border: '1px solid var(--ink)',
            backgroundColor: 'transparent',
            color: 'var(--ink)',
            fontWeight: 500,
            fontSize: 14,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            textDecoration: 'none',
            fontFamily: 'var(--font-sans)',
          }}
        >
          이메일로 시작하기
        </Link>
      </div>

      {/* ── 기능 미리보기 ── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 4 }}>
          <span style={{ flex: 1, height: 1, background: 'var(--rule)' }} />
          <span style={{
            fontFamily: 'var(--font-serif-en)',
            fontStyle: 'italic',
            fontSize: 12,
            color: 'var(--champagne-2)',
            letterSpacing: '0.08em',
          }}>features</span>
          <span style={{ flex: 1, height: 1, background: 'var(--rule)' }} />
        </div>

        {/* 카드 1: 타임라인 미리보기 */}
        <FeatureCard icon="checklist" title="함께 체크하는 타임라인" desc="신랑·신부가 같은 화면으로 준비 항목을 확인해요">
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
                  {item.done && <Icon name="check" size={11} color="white" />}
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
        <FeatureCard icon="wallet" title="예산 한눈에 관리" desc="항목별 예상·실제 지출을 비교하고 잔여 예산을 추적해요">
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
        <FeatureCard icon="invite" title="모바일 청첩장 + RSVP" desc="링크 하나로 청첩장을 보내고 참석 여부가 자동으로 정리돼요">
          <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
            <div style={{
              flex: 1, padding: '10px 12px', borderRadius: 12,
              backgroundColor: 'var(--toss-blue-light)', textAlign: 'center',
            }}>
              <p style={{ fontSize: 22, fontWeight: 800, color: 'var(--toss-blue)', margin: 0 }}>42</p>
              <p style={{ fontSize: 11, color: 'var(--toss-blue)', margin: '2px 0 0', opacity: 0.8, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 3 }}>
                <Icon name="check" size={10} color="currentColor" /> 참석
              </p>
            </div>
            <div style={{
              flex: 1, padding: '10px 12px', borderRadius: 12,
              backgroundColor: 'var(--toss-bg)', textAlign: 'center',
            }}>
              <p style={{ fontSize: 22, fontWeight: 800, color: 'var(--toss-text-secondary)', margin: 0 }}>8</p>
              <p style={{ fontSize: 11, color: 'var(--toss-text-tertiary)', margin: '2px 0 0', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 3 }}>
                <Icon name="close" size={10} color="currentColor" /> 불참
              </p>
            </div>
            <div style={{
              flex: 1, padding: '10px 12px', borderRadius: 12,
              backgroundColor: 'var(--champagne-wash)', textAlign: 'center',
            }}>
              <p style={{ fontSize: 22, fontWeight: 800, color: 'var(--champagne)', margin: 0 }}>2</p>
              <p style={{ fontSize: 11, color: 'var(--champagne-2)', margin: '2px 0 0', opacity: 0.8, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 3 }}>
                <Icon name="invite" size={10} color="currentColor" /> 방명록
              </p>
            </div>
          </div>
        </FeatureCard>

        {/* 소셜프루프 — 고정 문구 */}
        <p style={{
          textAlign: 'center',
          fontFamily: 'var(--font-serif-ko)',
          fontSize: 12,
          color: 'var(--ink-3)',
          marginTop: 8,
          lineHeight: 1.8,
        }}>
          체크리스트 · 예산 · 하객 · 청첩장 · 방명록<br />
          결혼 준비에 필요한 것들을 한 곳에서
        </p>
      </div>

      {/* 푸터 */}
      <div style={{
        marginTop: 40, paddingTop: 20,
        borderTop: '1px solid var(--rule)',
        textAlign: 'center',
        lineHeight: 2,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, marginBottom: 8 }}>
          <span style={{ fontFamily: 'var(--font-serif-en)', fontWeight: 500, fontSize: 16, color: 'var(--ink)', letterSpacing: '-0.02em' }}>O</span>
          <span style={{ width: 3, height: 3, borderRadius: '50%', backgroundColor: 'var(--champagne)', display: 'inline-block' }} />
          <span style={{ fontFamily: 'var(--font-serif-en)', fontWeight: 500, fontSize: 16, color: 'var(--ink)', letterSpacing: '-0.02em' }}>D</span>
        </div>
        <div style={{ fontSize: 11, color: 'var(--ink-4)', lineHeight: 2 }}>
          <a href="/privacy" style={{ color: 'var(--ink-4)', textDecoration: 'none', borderBottom: '1px solid var(--rule)' }}>
            개인정보처리방침
          </a>
          <span style={{ margin: '0 8px', color: 'var(--rule-strong)' }}>·</span>
          <a href="mailto:jasonkwak201@gmail.com" style={{ color: 'var(--ink-4)', textDecoration: 'none', borderBottom: '1px solid var(--rule)' }}>
            문의하기
          </a>
          <br />
          © 2026 Ourday. All rights reserved.
        </div>
      </div>
    </div>
  );
}

function FeatureCard({ icon, title, desc, children }) {
  return (
    <div style={{
      backgroundColor: 'var(--paper)',
      borderRadius: 20,
      padding: '16px 16px',
      border: '1px solid var(--rule)',
      boxShadow: 'var(--shadow-sm)',
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
        <div style={{ flexShrink: 0, marginTop: 2, width: 32, height: 32, borderRadius: '50%', border: '1px solid var(--champagne)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Icon name={icon} size={16} color="var(--champagne-2)" />
        </div>
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
