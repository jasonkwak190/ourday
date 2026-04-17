# Ourday — CLAUDE.md

## WHY (프로젝트 목적)
결혼을 앞둔 **커플이 함께** 결혼 준비를 관리하는 모바일 퍼스트 웹앱.
신랑·신부 각자가 계정을 만들고 초대 코드로 연동한 뒤, 체크리스트·예산·의사결정을 공유한다.

---

## WHAT (기술 스택 & 구조)

**스택**: Next.js 16 (App Router) · Tailwind CSS v4 · Supabase (Auth + PostgreSQL)

```
app/
  page.js          # 랜딩
  layout.js        # DM Serif Display + DM Sans 폰트, globals.css 로드
  globals.css      # CSS 변수 (--rose, --cream 등 14색) + 공통 클래스
  signup/          # 회원가입 (Supabase Auth)
  login/           # 로그인
  connect/         # 커플 초대코드 연동
  setup/           # 결혼 기본 정보 설정 (스킵 가능, 언제든 수정 가능)
  dashboard/       # D-day · 스탯 · 진행률 · 이번달 할일
  timeline/        # 월별 탭 체크리스트
  budget/          # 예산 항목 관리
  decisions/       # 의사결정 보드 (신랑/신부 의견 + 최종 결정)
  guide/           # 정보·예절 가이드 (정적)
  settings/        # 프로필 · 초대코드 확인 · 결혼정보 수정 · 로그아웃
components/
  BottomNav.js     # 하단 네비게이션 (active prop으로 활성 탭 지정)
lib/
  supabase.js      # createBrowserClient (쿠키 기반 세션 동기화)
  supabase-server.js  # createServerClient (SSR용)
middleware.js      # 보호 라우트 인증 체크 → 미인증 시 / 리다이렉트
```

**DB 테이블**: `couples` · `users` · `checklist_items` · `budget_items` · `decisions`
모든 테이블에 RLS 활성화. 쿼리 시 반드시 `.eq('couple_id', coupleId)` 필터 적용.

---

## HOW (개발 방법)

**서버 실행**
```bash
# Node는 nvm v20으로 관리
PATH="$HOME/.nvm/versions/node/v20.19.3/bin:$PATH" npm run dev
# → http://localhost:3000
```

**빌드 확인**
```bash
PATH="$HOME/.nvm/versions/node/v20.19.3/bin:$PATH" npm run build
```

**환경변수** (`.env.local`, git 제외됨)
```
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
```

---

## 규칙 (모든 작업에 적용)

- **`'use client'`** — useState·useEffect·이벤트 핸들러 있는 컴포넌트에만
- **`export const dynamic = 'force-dynamic'`** — Supabase를 사용하는 모든 페이지에 추가
- **세션 → couple_id 순서로 조회** — 페이지 진입 시 항상 이 순서로 데이터 로드
- **로딩/에러 상태 필수** — 빈 화면 깜빡임 없도록
- **모바일 퍼스트** — `max-w-[430px] mx-auto`, 하단 네비 공간 `pb-24`
- **절대 하지 말 것** — `dangerouslySetInnerHTML`, couple_id 필터 누락 쿼리, `SUPABASE_SERVICE_ROLE_KEY` 클라이언트 노출
