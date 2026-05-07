# PERF.md — 성능 엔지니어링 작업 기록

> 2026-04-30. Lighthouse Performance 82 → 90+ 목표.
> LCP 4.7s → 2.5s 영역으로 끌어내리기 위한 작업.

---

## 측정 (작업 전 기준)

| 지표 | 값 | 평가 |
|---|---|---|
| Performance | 82 | 양호 |
| Accessibility | 100 | 우수 |
| Best Practices | 100 | 우수 |
| SEO | 100 | 우수 |
| LCP | 4.7s | 🔴 개선 필요 (목표 < 2.5s) |
| TBT | 50ms | ✅ 우수 |
| CLS | 0.022 | ✅ 우수 |
| 번들 (gzip) | 416KB | 🟡 |

청크 분석:
- `0rll4-i-k9jrd.js` 414KB raw / 127KB gzip — Sentry
- `00p5g64ik~zcn.js` 402KB raw / 135KB gzip — React + Realtime
- `07mgsx9~u1ovu.js` 205KB raw / 53KB gzip — Supabase SDK
- `0.61fry89w9c0.js` 141KB raw / 38KB gzip — Next.js core

---

## 적용 (라운드 1)

### 1. Cormorant Garamond → next/font 자체 호스팅
**파일**: [app/layout.js](app/layout.js), [app/globals.css](app/globals.css)

**변경 전**: Google Fonts CDN(`fonts.googleapis.com`) 라운드트립 + display=swap 적용된 외부 CSS 로드
**변경 후**: `next/font/google` Cormorant_Garamond 자체 호스팅
- woff2 4종(400/500 + italic 400/500) `.next/static/media/`에 번들
- 폴백 메트릭(Cormorant Garamond Fallback) 자동 생성 → 폰트 swap 시 CLS 0
- 자동 preload (Next.js가 critical 폰트로 인식)
- DNS·TCP 라운드트립 제거

**예상 LCP 단축**: 100~300ms

> Noto Serif KR은 한글 글리프 크기가 커 next/font 자체호스팅보다
> Google Fonts 동적 subsetting이 유리해 CDN 유지.

### 2. 랜딩 페이지 클라이언트 세션 체크 → 미들웨어로 이전
**파일**: [middleware.js](middleware.js), [app/page.js](app/page.js)

**변경 전**:
```js
useEffect(() => {
  supabase.auth.getSession().then(({ data: { session } }) => {
    if (session) router.replace('/dashboard');
    else setChecking(false);
  });
}, []);
// → "checking" 로딩 화면 200~400ms 노출
// → Supabase SDK 53KB gzip 강제 로드
```

**변경 후**:
- middleware.js의 matcher에 `'/'` 추가
- 서버에서 `auth.getSession()` 후 인증된 사용자는 `/dashboard`로 즉시 redirect
- 클라이언트에서 supabase·useRouter·useEffect 모두 제거
- LandingPage가 순수 정적 컴포넌트가 됨

**효과**:
- 미인증 사용자: 첫 페인트 = 랜딩 마크업 (checking 화면 사라짐)
- 인증된 사용자: 서버 리다이렉트, 랜딩 마크업조차 받지 않음
- LCP 200~400ms 단축

### 3. Supabase 도메인 preconnect
**파일**: [app/layout.js](app/layout.js)

```html
<link rel="preconnect" href="https://eapmagibtipjbagitqmf.supabase.co" crossOrigin="anonymous" />
<link rel="dns-prefetch"  href="https://eapmagibtipjbagitqmf.supabase.co" />
```

로그인 직후 첫 쿼리·Storage 사진 요청 시 DNS·TCP 핸드셰이크 절감.

---

## 미적용 — 평가 후 보류

### A. @sentry/nextjs → @sentry/browser 교체
**현재**: @sentry/nextjs 127KB gzip
**가능**: @sentry/browser는 ~80KB gzip — 47KB 절감 가능
**리스크**:
- Next.js 라우터 자동 instrumentation 손실 (이미 tracing OFF라 영향 적음)
- 마이그레이션 시 sentry.server.config.js와 호환성 검증 필요
- sentryWebpackPlugin source map 업로드 흐름 변경 가능

→ 출시 후 트래픽·에러 패턴 보고 결정 권장.

### B. Realtime lazy 로드
**현재**: 6개 페이지(notes·decisions·timeline·budget·guests·connect)에서 `supabase.channel()` 사용 → 전 페이지에 Realtime 모듈 번들
**가능**: dynamic import로 채널 생성 지연 → 첫 페이지 인터랙션까지는 Realtime 미로드
**리스크**: 코드 복잡도 ↑, 첫 메시지 도착 지연 가능
**효과**: 50~100KB gzip 절감 (페이지별 다름)

→ 효과 대비 복잡도 큼. 출시 후 측정 후 결정.

### C. 이미지 next/image 전환
**현재**: 모든 `<img>` 직접 사용 (또는 SafeImage 래퍼)
**가능**: next/image로 교체 → 자동 WebP/AVIF, lazy 기본, 사이즈 추론
**리스크**: Supabase Storage URL이 외부 도메인이라 next.config.js `images.remotePatterns` 추가 필요. SafeImage onError 패턴과 호환성 확인.
**효과**: 사진 무거운 페이지(invitation, gallery)에서 LCP 단축 + 데이터 절감

→ 다음 라운드에서 시도.

---

## 측정 (작업 후 — 실측 권장)

배포 후 PageSpeed Insights 또는 Lighthouse로 재측정:
```
https://pagespeed.web.dev/analysis?url=https%3A%2F%2Fourday-rust.vercel.app%2F
```

**기대치**:
- LCP 4.7s → 3.0~3.5s (≈30% 개선)
- Performance 82 → 88~92
- TBT, CLS는 그대로 우수

**추가 측정 포인트**:
- `chrome://inspect` → Network → Performance tab으로 실제 모바일 디바이스 측정
- Capacitor WebView 환경에서도 같이 측정 (앱 진입 시간)

---

## 다음 라운드 (필요 시)

1. **이미지 next/image 일괄 전환** — invitation·gallery 페이지 LCP 추가 단축
2. **루트 페이지 정적 export** — `/`를 SSG로 만들어 첫 바이트 단축 (단, middleware redirect와 호환성 확인)
3. **Sentry 슬림화** — A안 검토
4. **CSS 크리티컬 인라인** — Critical CSS 추출 도구 (critters 등)
5. **Service Worker 캐싱** — 반복 방문 LCP < 1s
