# SKILLS.md — 에러 기록 & 재발 방지

> 이 프로젝트에서 실제로 발생한 에러와 해결책을 기록한다.
> 새 작업 시작 전에 반드시 읽고, 같은 실수를 반복하지 않는다.

---

## ERR-001 · Supabase signUp 후 users 테이블 insert 실패

**증상**
```
프로필 저장에 실패했어요. 다시 시도해주세요.
```

**원인**
Supabase Auth의 **이메일 인증(Confirm email)이 ON** 상태일 때,  
`auth.signUp()` 직후에는 세션이 없어 `auth.uid() = null` → RLS `USING (auth.uid() = id)` 정책이 INSERT를 거부한다.

**해결**
1. Supabase 콘솔 → `Authentication → Sign In / Providers → Email` → **Confirm email OFF**
2. 또는 Auth trigger로 `public.users` 자동 생성

**재발 방지 규칙**
- 개발/테스트 환경에서는 Supabase 이메일 인증을 OFF로 유지
- signUp 직후 DB insert 시 세션 존재 여부를 먼저 확인

---

## ERR-002 · 로그인 후 보호 라우트 접근 시 / 로 튕김

**증상**
회원가입·로그인 성공 후 `/connect`, `/dashboard` 등에 접근하면 랜딩(`/`)으로 리다이렉트됨.

**원인**
`lib/supabase.js`에서 `createClient` (@supabase/supabase-js) 사용 시  
세션이 **localStorage**에만 저장되고 **쿠키에는 저장되지 않는다**.  
`middleware.js`는 쿠키 기반으로 세션을 검증하므로 항상 미인증으로 판단한다.

**해결**
```js
// ❌ 잘못된 방식 — 세션이 쿠키에 동기화 안 됨
import { createClient } from '@supabase/supabase-js';
export const supabase = createClient(url, key);

// ✅ 올바른 방식 — 세션을 쿠키에 자동 동기화
import { createBrowserClient } from '@supabase/ssr';
export const supabase = createBrowserClient(url, key);
```

**재발 방지 규칙**
- 클라이언트 사이드 Supabase 클라이언트는 반드시 `createBrowserClient` (@supabase/ssr) 사용
- `@supabase/supabase-js`의 `createClient`는 서버리스 환경에서만 사용

---

## ERR-003 · npm install 디스크 공간 부족 (ENOSPC)

**증상**
```
npm error nospc: no space left on device, write
```

**원인**
맥 디스크 사용률 99% (여유 공간 225MB). npm 패키지 설치에 최소 1~2GB 필요.

**해결**
1. `~/Downloads`, `~/Library/Caches` 정리로 여유 공간 확보
2. `npm cache clean --force` 로 npm 캐시(~/.npm) 정리

**재발 방지 규칙**
- 패키지 설치 전 `df -h /` 로 여유 공간 확인 (최소 2GB 필요)

---

## ERR-004 · 빌드 시 "Invalid supabaseUrl" 에러

**증상**
```
Error: Invalid supabaseUrl: Must be a valid HTTP or HTTPS URL.
Export encountered an error on /budget/page
```

**원인**
`.env.local` 플레이스홀더 값이 `your-supabase-project-url` (유효하지 않은 URL) 형태일 때,  
Next.js 빌드 중 SSR 패스에서 Supabase 클라이언트 초기화가 실패한다.  
`|| 'fallback'` 패턴도 env var가 이미 세팅돼 있으면 작동하지 않는다.

**해결**
```bash
# .env.local 플레이스홀더를 유효한 URL 형식으로 작성
NEXT_PUBLIC_SUPABASE_URL=https://placeholder.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=placeholder-anon-key
```

**재발 방지 규칙**
- `.env.local` 플레이스홀더는 반드시 실제 URL 형식으로 작성
- Supabase를 쓰는 페이지에는 `export const dynamic = 'force-dynamic'` 추가 (SSG 방지)

---

## ERR-005 · setup 페이지에서 "커플 연동이 필요해요" 에러

**증상**
웨딩 기본 설정 저장 시 `커플 연동이 필요해요.` 에러 발생.

**원인**
`setup/page.js`에서 `coupleId` 없으면 저장을 막는 하드 가드가 있었음.  
커플 연동 없이 설정을 먼저 하려는 사용자 플로우를 고려하지 않은 설계.

**해결**
- `coupleId` 없을 때 자동으로 새 `couples` row 생성 후 저장
- "나중에 설정할게요" 스킵 버튼 추가
- 기존 설정값이 있으면 수정 모드로 pre-fill

**재발 방지 규칙**
- 필수 연동 없이도 핵심 기능을 사용할 수 있도록 설계 (점진적 온보딩)
- 가드 조건은 UX 플로우를 먼저 그린 후 추가

---

## ERR-006 · connect 페이지 코드 생성 실패

**증상**
```
코드 생성에 실패했어요. 다시 시도해주세요.
```

**원인**
- `userId` state가 null인 상태에서 버튼 클릭 (useEffect 완료 전)
- Supabase RLS 정책이 couples INSERT를 막음 (`with check (true)` 누락)

**해결**
- 페이지 진입 시 자동으로 코드 생성 (버튼 제거)
- useEffect에서 userId를 받은 후에 코드 생성 로직 실행
- couples 테이블 INSERT 정책에 `with check (true)` 확인

**재발 방지 규칙**
- 사용자 액션이 필요한 버튼은 `disabled={!userId}` 로 보호
- 자동 실행 로직은 useEffect 내부에서 userId 확인 후 실행

---

## ERR-007 · lucide-react를 Server Component에서 import 시 에러

**증상**
```
Error: React.createContext is not a function
```

**원인**
lucide-react는 내부적으로 React Context를 사용하므로 Server Component에서 직접 import 불가.

**해결**
```js
// ❌ Server Component에서 직접 사용 금지
import { Home } from 'lucide-react';

// ✅ 'use client' 컴포넌트에서만 사용
'use client';
import { Home } from 'lucide-react';
```

**재발 방지 규칙**
- lucide-react 아이콘은 반드시 `'use client'` 컴포넌트에서만 사용
- BottomNav, 각종 카드 컴포넌트는 이미 `'use client'`이므로 OK

---

## ERR-008 · TDS 전환 시 Supabase 로직 손상 패턴

**증상**
디자인 수정 중 onSubmit 핸들러 또는 useEffect 데이터 페칭이 사라짐

**원인**
JSX 대규모 리팩토링 시 이벤트 핸들러나 상태 바인딩을 함께 삭제

**해결 / 재발 방지 규칙**
- 디자인 수정 시 className/style 속성만 변경
- onClick/onChange/onSubmit/value 등 **로직 속성은 절대 건드리지 않음**
- 수정 전 반드시 해당 파일을 Read로 전체 확인 후 Edit 사용
- 대규모 Write는 금지 — 반드시 Edit(부분 수정)으로만 진행

---

## ERR-009 · globals.css에서 @import 순서 에러 (PostCSS)

**증상**
```
Parsing CSS source code failed
@import rules must precede all other rules aside from @charset and @layer
```

**원인**
PostCSS(Tailwind v4)는 `@import "tailwindcss"` 처리 시 @font-face 등을 인라인으로 생성한다.
그 뒤에 외부 `@import url(...)` 가 오면 "@import는 다른 규칙보다 먼저 와야 한다" 에러 발생.

**해결**
```css
/* ❌ 잘못된 방식 — @font-face 뒤에 @import */
@import "tailwindcss";
@font-face { ... }
@import url('https://cdn.example.com/font.css');

/* ✅ 올바른 방식 — 외부 폰트는 layout.js <link> 태그로 로드 */
/* globals.css */
@import "tailwindcss";
/* (외부 폰트 @import 제거) */

/* layout.js */
<head>
  <link rel="stylesheet" href="https://cdn.example.com/font.css" />
</head>
```

**재발 방지 규칙**
- CDN 폰트는 `globals.css @import url(...)` 대신 `layout.js <link>` 태그 사용
- `@import "tailwindcss"` 이전에 외부 @import가 필요하면 첫 줄에만 배치

---

## 체크리스트 — 새 기능 추가 시

- [ ] `'use client'` 필요한 컴포넌트에 추가했는가?
- [ ] `export const dynamic = 'force-dynamic'` 추가했는가? (Supabase 사용 페이지)
- [ ] Supabase 쿼리에 `.eq('couple_id', coupleId)` 필터가 있는가?
- [ ] 로딩·에러 상태 처리가 있는가?
- [ ] couple_id 없는 사용자도 진입 가능한가? (점진적 온보딩)
- [ ] `createBrowserClient` 사용하고 있는가? (`createClient` 아님)

## 체크리스트 — 디자인 수정 시 (TDS 전환 포함)

- [ ] className/style만 변경했는가? (로직 속성 무수정)
- [ ] lucide-react 아이콘을 `'use client'` 컴포넌트에서만 사용했는가?
- [ ] `var(--toss-*)` 변수를 사용했는가? (컬러 하드코딩 금지)
- [ ] `npm run build`로 빌드 에러 없음을 확인했는가?
- [ ] 프리뷰에서 Supabase CRUD가 정상 동작하는가?

---

## ERR-010 · Tossface font-family 추가 시 숫자·기호 렌더링 완전 파괴

**증상**
```
날짜, D-day, 금액, 퍼센트 등 숫자가 전부 "2 0 2 7년", "3 5 8", "0 / 5" 처럼
글자 사이에 공백이 생긴 것처럼 엄청 넓게 렌더링됨
```

**원인**
`font-family`에 `'Tossface'`를 첫 번째로 추가하면, Tossface의 `@font-face`에
`unicode-range`가 선언되어 있어도 **실제 브라우저(Chrome/Safari)에서는
숫자(0-9), 기호(/, %, -) 등 ASCII 문자 글리프까지 가로채서 렌더링**함.
Tossface의 숫자 글리프는 sidebearing(글자 간격)이 매우 넓어서
모든 숫자가 공백이 생긴 것처럼 보임.

spec(unicode-range)대로면 텍스트 문자를 건드리면 안 되지만,
브라우저 구현 차이로 실제로는 오동작함. CDN 로드 타이밍 이슈도 복합적으로 작용.

**해결**
```css
/* ❌ 절대 하지 말 것 */
font-family: 'Tossface', 'Pretendard Variable', 'Pretendard', ...;

/* ✅ Pretendard만 사용 */
font-family: 'Pretendard Variable', 'Pretendard', -apple-system, ...;
```
- `app/globals.css` body font-family에서 Tossface 제거
- `app/layout.js`에서 Tossface CDN `<link>` 태그 제거
- 이모지는 OS 시스템 이모지로 렌더링 (충분히 깔끔함)

**재발 방지 규칙**
- **Tossface를 font-family에 추가하는 것은 영구 금지**
- 이모지 스타일 개선 요청이 와도 font-family 수정으로 해결하지 말 것
- 폰트 관련 수정 후에는 반드시 로그인 → 대시보드에서 날짜/숫자 직접 확인
- 숫자 고정폭이 필요하면 `font-family` 수정 대신 `.tabular-nums` CSS 클래스 사용

---

## DESIGN-001 · 폰트 스택 — Pretendard (Tossface 사용 금지)

**유일하게 허용되는 font-family 선언 (globals.css body)**

```css
/* ✅ */
font-family: 'Pretendard Variable', 'Pretendard',
  -apple-system, BlinkMacSystemFont, 'Apple SD Gothic Neo', sans-serif;
```

**Tossface 사용 금지** → ERR-010 참조. unicode-range 선언과 무관하게 숫자 렌더링을 완전히 파괴함.

**절대 하지 말 것**

```css
/* ❌ Tossface — ERR-010으로 영구 금지 */
font-family: 'Tossface', ...;

/* ❌ monospace — 시스템 Courier New로 렌더링됨 */
style={{ fontFamily: 'monospace' }}

/* ✅ 고정폭 숫자가 필요하면 */
className="tabular-nums"
```

**이모지는 OS 시스템 이모지 사용**

🎁🎉💌📅 등 기존 이모지 코드는 그대로 유지. OS 기본 이모지로 충분히 깔끔하게 렌더링됨.

---

## DESIGN-002 · 8pt Grid 여백 시스템 (Toss Slash 기준)

**원칙**: 모든 여백·크기는 **8의 배수**

| 토큰 | 값 | Tailwind |
|------|-----|---------|
| xs   | 4px  | `p-1`, `gap-1`  |
| sm   | 8px  | `p-2`, `gap-2`  |
| md   | 16px | `p-4`, `gap-4`  |
| lg   | 24px | `p-6`, `gap-6`  |
| xl   | 32px | `p-8`, `gap-8`  |
| 2xl  | 40px | `p-10`, `gap-10` |
| 3xl  | 48px | `p-12`, `gap-12` |

**컴포넌트 기준값**

| 컴포넌트 | 높이 | 좌우 패딩 | radius |
|----------|------|----------|--------|
| 버튼 (`.btn-*`) | 56px (8×7) | 24px (8×3) | 16px (8×2) |
| 인풋 (`.input-field`) | 56px (8×7) | 16px (8×2) | 12px |
| 카드 (`.card`) | — | 24px (8×3) | 24px (8×3) |

**@toss/emotion-utils 미사용**

Toss Slash의 `@toss/emotion-utils`는 emotion CSS-in-JS 전용 유틸이다.
이 프로젝트는 **Tailwind CSS v4** 스택이므로 emotion과 충돌하여 사용 불가.
대신 위 표의 Tailwind 클래스로 동일한 8pt grid를 구현한다.

---

## DESIGN-003 · 이모지 사용 원칙

- JSX에서 이모지를 직접 사용해도 됨 — Tossface가 스타일링
- `lucide-react` 아이콘: UI 액션(버튼, 네비)에 사용
- 이모지: 섹션 타이틀, 카드 아이콘, 상태 표시에 사용
- 둘을 혼용하지 말 것 (한 섹션은 아이콘 또는 이모지 중 하나로 통일)

---

## ERR-011 · Sentry 클라이언트 SDK가 Turbopack 빌드에서 초기화 안 됨

**증상**
- `next.config.js`에서 `withSentryConfig`로 감쌌고 `sentry.client.config.js`도 작성했지만,
  Sentry 대시보드 Issues에 이벤트가 단 하나도 도달하지 않음 ("Get Started" 화면 그대로)
- 브라우저 콘솔에 Sentry 관련 로그도 전혀 안 찍힘
- DSN은 Vercel 환경변수에 정상 등록됨

**원인**
Next.js 15+ 기본 빌더가 **Turbopack**으로 바뀌면서 `withSentryConfig`의 webpack 플러그인이
`sentry.client.config.js`를 **자동 주입하지 못함**. 결과적으로 클라이언트에서 `Sentry.init()`이
한 번도 호출되지 않아 모든 이벤트 캡처가 실패한다 (서버 사이드는 `instrumentation.js` 덕에 정상 동작).

useEffect에서 수동으로 `Sentry.init()`을 호출하는 컴포넌트(`SentryInit.js`)도 시도했으나,
하이드레이션 타이밍 + `withSentryConfig`와의 race condition으로 transport 초기화 실패
(`TypeError: Failed to fetch`) 발생.

**해결**
Next.js 15.3+ 공식 경로인 **`instrumentation-client.js`** 파일을 프로젝트 루트에 생성.
이 파일은 Next.js가 클라이언트 번들에 자동 포함하므로 Turbopack/Webpack 무관하게 동작.

```js
// instrumentation-client.js (프로젝트 루트)
import * as Sentry from '@sentry/nextjs';

if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
    enabled: process.env.NODE_ENV === 'production',
    tracesSampleRate: 0.1,
    // ... 나머지 설정
  });
}
```

**부수 이슈**
1. **CSP `connect-src`** — Sentry 이벤트 전송 endpoint는 `https://o<orgId>.ingest.us.sentry.io`
   처럼 **서브도메인** 형태이므로 와일드카드 필요:
   ```
   connect-src ... https://*.ingest.us.sentry.io https://*.ingest.sentry.io
   ```
   `https://ingest.us.sentry.io`(서브도메인 없이)는 **매칭 안 됨**.

2. **`tunnelRoute`** — `withSentryConfig({ tunnelRoute: '/monitoring' })`는 광고차단기 우회용
   인데, 빌드 시점 DSN 파싱 이슈 또는 rewrite 설정 문제로 정상 forward 안 되는 경우 있음.
   CSP 와일드카드만 풀어주면 직접 ingest 가능하므로 **tunnelRoute 없어도 됨**.

3. **`org` slug** — `withSentryConfig`의 `org` 옵션은 sourcemap 업로드에만 사용. Sentry
   대시보드 URL의 슬러그(`<slug>.sentry.io`)와 일치해야 함. 이벤트 전송에는 영향 없지만
   소스맵이 안 올라가니 정확히 맞춰둘 것.

**재발 방지 규칙**
- Next.js 15+ App Router에서 Sentry 클라이언트 init은 **반드시 `instrumentation-client.js`** 사용
- `sentry.client.config.js`는 Pages Router 잔재 — App Router 프로젝트에서는 만들지 말 것
- `useEffect` 안에서 `Sentry.init()`을 부르는 수동 핵 금지 (race condition)
- CSP에 외부 endpoint 추가할 땐 **서브도메인 와일드카드(`https://*.domain.com`) 형태로**
  넣을 것. 도메인만 적으면 서브도메인 매칭 실패
- Sentry 디버깅 시 일시적으로 `enabled: true` + `debug: true` + `Sentry.captureMessage` +
  `Sentry.flush()` 조합으로 단계별 로그 확인 → 어느 단계(init/capture/flush/transport)에서
  막히는지 빠르게 식별 가능

**참고 파일 구조 (App Router + Turbopack)**
```
프로젝트 루트/
├── instrumentation.js          # 서버 사이드 (Node + Edge runtime 분기)
├── instrumentation-client.js   # 클라이언트 사이드 (Sentry.init 직접 호출)
├── sentry.server.config.js     # instrumentation.js가 import
└── sentry.edge.config.js       # instrumentation.js가 import
```

---

## ERR-012 · 청첩장 OG 썸네일이 cover_image_url 무시함 (Next.js 파일 컨벤션 함정)

**증상**
- 사용자가 cover_image_url을 DB에 저장했는데도 카카오톡 공유 시
  자동 생성된 fallback 이미지(WEDDING INVITATION 디자인)만 표시
- 페이지 HTML의 `<meta property="og:image">` 가 fallback URL 가리킴

**원인**
Next.js의 **metadata 파일 컨벤션** (예: `app/i/[slug]/opengraph-image.js`) 은
`generateMetadata`의 `openGraph.images` 를 **자동으로 override**한다.
docs: "These metadata files take precedence over the same metadata in the metadata object"

즉, layout.js에서 아래처럼 cover_image_url을 우선시해도:
```js
const ogImageUrl = inv?.cover_image_url
  ? inv.cover_image_url
  : `${baseUrl}/i/${slug}/opengraph-image`;
```
파일 컨벤션이 자동 등록한 og:image가 winning 해서 cover URL이 무시됨.

**해결**
파일 컨벤션을 일반 API route로 이동해 자동 등록을 끊는다:
- `app/i/[slug]/opengraph-image.js` 삭제
- `app/api/og/invitation/[slug]/route.js` 로 이동 (`export async function GET`)
- generateMetadata에서 fallback URL을 `/api/og/invitation/<slug>` 로 명시

**부수 fix**
- layout.js에 `export const dynamic = 'force-dynamic'` 추가
  → metadata가 정적 캐싱되지 않아 DB cover URL 변경 즉시 반영
- 공유 URL에 `?v=<updated_at_timestamp>` cache buster 추가
  → 카카오 OG 캐시 자동 무효화 (저장할 때마다 새 URL 인식)

**재발 방지 규칙**
- Next.js metadata 파일 컨벤션(`opengraph-image.js`, `twitter-image.js`, `icon.js` 등)은
  generateMetadata 보다 **우선** 적용된다는 점 기억
- 동적으로 cover image를 결정해야 하는 경우 **파일 컨벤션 사용 금지**, 일반 route로 분리
- 동적 metadata가 있는 페이지엔 `force-dynamic` 또는 `revalidate: 0` 명시

---

## SKILL-001 · 스케줄러 강화 패턴 (체크리스트 → 의사결정 등)

`app/timeline/page.js`에 적용한 패턴이 다른 task 관리 페이지에도 그대로 이식 가능.
의사결정 페이지(`app/decisions/page.js`)에서 동일 패턴 재사용 검증됨.

**구성 요소 (재사용 패턴)**
1. **인사이트 헤더 카드** — D-day · 진행률 · 임박/지난 배지
2. **카테고리 분류 + 진행률 row** — 7개 카테고리 (식장/스드메/청첩장·하객/신혼여행/신혼집·예물/예식 디테일/기타)
3. **추천 템플릿** — 자주 사용하는 항목 chip 클릭 한 번에 추가
4. **빠른 인라인 추가** — Enter/추가 버튼, default값 자동 부여
5. **임박 위저드** — 미완료 + 마감 가까운 N개 추출
6. **자동 정렬** — displayed 결과를 마감 가까운 순 정렬
7. **그룹 분리** — 지난 마감 / 이번 주 / 곧 다가올 일
8. **항목 가이드 / sub-tasks / 관련 페이지 cross-link**

**핵심 useMemo 함수들**
```js
// 통계
const stats = useMemo(() => {
  const total = items.length;
  const done = items.filter(i => i.is_done).length;
  return { total, done, pct: total > 0 ? Math.round(done/total*100) : 0 };
}, [items]);

// 카테고리별 통계
const categoryStats = useMemo(() => {
  const map = {};
  CATEGORIES.forEach(c => { map[c] = { total: 0, done: 0 }; });
  items.forEach(i => {
    const c = getItemCategory(i);
    map[c].total++;
    if (i.is_done) map[c].done++;
  });
  return CATEGORIES.map(c => ({ name: c, ...map[c], pct: ... }))
    .filter(x => x.total > 0);
}, [items]);

// 추천 템플릿 (이미 추가된 것 제외)
const availableTemplates = useMemo(() => {
  const existing = new Set(items.map(i => i.title.toLowerCase()));
  return TEMPLATE.filter(t => !existing.has(t.title.toLowerCase()));
}, [items]);
```

**카테고리 자동 추론 (없으면 기타)**
```js
function inferCategory(title) {
  const t = (title || '').toLowerCase();
  if (/웨딩홀|식장/.test(t)) return '식장';
  if (/스튜디오|드레스|메이크업/.test(t)) return '스드메';
  // ... 키워드 매칭
  return '기타';
}
```

**향후 추가 페이지에 패턴 적용 시 주의**
- DB column 미존재 시 retry-without-column 로직 (PGRST 에러 메시지 파싱)
- Realtime + 직접 setItems race condition 방지 dedup (`prev.find(it => it.id === data.id)`)
- 빈 상태에선 추천 템플릿이 first action 역할
