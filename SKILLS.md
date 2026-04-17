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

## DESIGN-001 · 폰트 스택 — Tossface + Pretendard

**원칙**

이 프로젝트는 두 폰트를 함께 사용한다:
- **Tossface** — Toss 공식 이모지 폰트. 이모지 유니코드 범위(U+1F000~)만 커버
- **Pretendard Variable** — 한/영/숫자 전담 텍스트 폰트

**올바른 font-family 선언 (globals.css body)**

```css
/* ✅ Tossface를 반드시 첫 번째로 */
font-family: 'Tossface', 'Pretendard Variable', 'Pretendard',
  -apple-system, BlinkMacSystemFont, 'Apple SD Gothic Neo', sans-serif;
```

**왜 Tossface를 맨 앞에 두는가?**

브라우저 폰트 폴백은 **글리프(글자) 단위**로 동작한다.
- Tossface는 이모지 코드포인트만 가지고, 한/영/숫자 글리프가 없음
- 따라서 "안녕 🎁" 렌더링 시: '안녕 '은 Pretendard, '🎁'만 Tossface 사용
- 결과: 이모지가 노란 Apple/Google 이모지 대신 Toss 인앱 스타일로 표시

**절대 하지 말 것**

```css
/* ❌ Tossface 제거 — 이모지가 시스템 기본(노란 이모지)으로 돌아감 */
font-family: 'Pretendard Variable', 'Pretendard', ...;

/* ❌ monospace 사용 — 시스템 Courier New로 렌더링되어 브랜드 일관성 깨짐 */
style={{ fontFamily: 'monospace' }}

/* ✅ 고정폭 숫자가 필요하면 tabular-nums 사용 */
style={{ fontVariantNumeric: 'tabular-nums' }}
/* 또는 Tailwind: className="tabular-nums" */
```

**이모지 코드는 유지할 것**

기존 JSX의 🎁🎉💌📅 등 이모지 문자를 지우지 말 것.
Tossface가 자동으로 Toss 스타일로 렌더링한다.
"AI가 만든 느낌"이 나는 원인은 이모지 자체가 아니라 시스템 이모지 렌더링이었음.

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
