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

## 체크리스트 — 새 기능 추가 시

- [ ] `'use client'` 필요한 컴포넌트에 추가했는가?
- [ ] `export const dynamic = 'force-dynamic'` 추가했는가? (Supabase 사용 페이지)
- [ ] Supabase 쿼리에 `.eq('couple_id', coupleId)` 필터가 있는가?
- [ ] 로딩·에러 상태 처리가 있는가?
- [ ] couple_id 없는 사용자도 진입 가능한가? (점진적 온보딩)
- [ ] `createBrowserClient` 사용하고 있는가? (`createClient` 아님)
