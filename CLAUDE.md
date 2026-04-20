# Ourday — CLAUDE.md

## WHY (프로젝트 목적)
결혼을 앞둔 **커플이 함께** 결혼 준비를 관리하는 모바일 퍼스트 웹앱.
신랑·신부 각자가 계정을 만들고 초대 코드로 연동한 뒤, 체크리스트·예산·의사결정을 공유한다.

---

## WHAT (기술 스택 & 구조)

**스택**: Next.js 16 (App Router) · Tailwind CSS v4 · Supabase (Auth + PostgreSQL) · lucide-react

**디자인 시스템**: Toss Design System 스타일 (오픈소스 구현)
- 폰트: Pretendard (SIL OFL 라이선스)
- 컬러: `--toss-*` CSS 변수 (globals.css)
- 공식 Toss 라이브러리 미사용 (저작권)

```
app/
  page.js          # 랜딩
  layout.js        # Pretendard 폰트, globals.css 로드
  globals.css      # Toss 컬러 토큰 + 공통 클래스 (btn-rose/card/input-field 등)
  signup/          # 회원가입 (Supabase Auth)
  login/           # 로그인
  connect/         # 커플 초대코드 연동
  setup/           # 결혼 기본 정보 설정 (스킵 가능, 언제든 수정 가능)
  dashboard/       # D-day · 스탯 · 진행률 · 이번달 할일
  timeline/        # 월별 탭 체크리스트
  budget/          # 예산 항목 관리
  guests/          # 하객 관리 + 축의금
  vendors/         # 업체 관리 + 계약 현황
  decisions/       # 의사결정 보드 (신랑/신부 의견 + 최종 결정)
  guide/           # 정보·예절 가이드 (정적)
  settings/        # 프로필 · 초대코드 확인 · 결혼정보 수정 · 로그아웃
components/
  BottomNav.js     # 하단 네비게이션 (lucide-react 아이콘, 더보기 시트 포함)
lib/
  supabase.js      # createBrowserClient (쿠키 기반 세션 동기화)
  supabase-server.js  # createServerClient (SSR용)
middleware.js      # 보호 라우트 인증 체크 → 미인증 시 / 리다이렉트
TDS_MIGRATION.md  # Toss 스타일 전환 체크리스트
```

**DB 테이블**: `couples` · `users` · `checklist_items` · `budget_items` · `decisions` · `guests` · `vendors`
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

**테스트 가계정** (로컬 + Supabase dev 프로젝트 전용)

| 역할 | 이메일 | 비밀번호 | 이름 |
|------|--------|----------|------|
| 신랑 🤵 | `test_groom_ourday@mailinator.com` | `Test1234!` | 테스트신랑 |
| 신부 👰 | `test_bride_ourday@mailinator.com` | `Test1234!` | 테스트신부 |

- 두 계정은 이미 Supabase에 생성되어 있고 커플 연동 완료 상태
- 기능 테스트 시 항상 이 두 계정을 사용 (새 계정 생성 불필요)
- 로그인: `http://localhost:3000/login`
- 신랑으로 테스트 후 신부로 교차 검증할 때 → settings에서 로그아웃 후 재로그인

---

## 규칙 (모든 작업에 적용)

- **`'use client'`** — useState·useEffect·이벤트 핸들러 있는 컴포넌트에만
- **`export const dynamic = 'force-dynamic'`** — Supabase를 사용하는 모든 페이지에 추가
- **세션 → couple_id 순서로 조회** — 페이지 진입 시 항상 이 순서로 데이터 로드
- **로딩/에러 상태 필수** — 빈 화면 깜빡임 없도록
- **모바일 퍼스트** — `max-w-[430px] mx-auto`, 하단 네비 공간 `pb-24`
- **절대 하지 말 것** — `dangerouslySetInnerHTML`, couple_id 필터 누락 쿼리, `SUPABASE_SERVICE_ROLE_KEY` 클라이언트 노출

## 디자인 규칙 (TDS 스타일)

- **컬러 변수** — 반드시 `var(--toss-*)` 변수 사용. 하드코딩 금지
- **버튼** — `.btn-rose`(주) / `.btn-outline`(보조) / `.btn-ghost`(3차) 세 종류만 사용
- **카드** — `.card` 클래스 사용. 직접 `bg-white rounded-2xl` 하드코딩 금지
- **인풋** — `.input-field` 클래스 사용
- **아이콘** — `lucide-react`만 사용, `strokeWidth={2}` 기본값
- **디자인 수정 시** — Supabase 쿼리/상태관리 로직 절대 건드리지 않음
- **TDS 전환 진행 상황** — `TDS_MIGRATION.md` 참조

## 폰트 스택 규칙 (절대 바꾸지 말 것)

```
font-family: 'Pretendard Variable', 'Pretendard', -apple-system, ...
```

- **Tossface 사용 금지** — unicode-range 선언이 있어도 실제 브라우저에서 숫자·기호 글자를 가로채 렌더링이 완전히 깨짐. 절대 font-family에 추가하지 말 것
- **Pretendard Variable → Pretendard** — 한/영/숫자 전담
- **이모지는 시스템 이모지 사용** — 🎁🎉💌 등 이모지 문자는 그대로 유지, OS 기본 이모지로 렌더링
- **monospace 폰트 절대 사용 금지** — 고정폭이 필요한 경우 `font-variant-numeric: tabular-nums` 사용
- **tnum 전역 적용 금지** — `font-feature-settings: "tnum"` 을 body에 넣으면 모든 숫자가 깨짐. `.tabular-nums` 클래스로 필요한 곳에만 선택 적용

## 8pt Grid 여백 규칙 (Toss Slash 기준)

모든 여백/크기는 **8의 배수**를 사용:

| 용도 | 값 | 비고 |
|------|----|------|
| 버튼·인풋 높이 | 56px (8×7) | |
| 카드 패딩 | 24px (8×3) | |
| 버튼 좌우 패딩 | 24px (8×3) | |
| 인풋 좌우 패딩 | 16px (8×2) | |
| 카드 radius | 24px (8×3) | |
| 버튼·인풋 radius | 16px (8×2) | |
| 페이지 상단 패딩 | 24px (8×3) | |
| 페이지 좌우 패딩 | 20px | Toss 표준 좌우 여백 |
| 섹션 간격 | 16px / 24px / 32px | 8의 배수 선택 |
| 아이템 내부 gap | 8px / 12px / 16px | 8의 배수 선택 |

- `gap-2(8px)`, `gap-3(12px)`, `gap-4(16px)`, `gap-6(24px)` Tailwind 클래스 활용
- `@toss/emotion-utils` — 미사용 (Tailwind v4 스택과 충돌, emotion 불필요)

## SKILLS.md 참조

디자인·에러 가이드라인 전체 → `SKILLS.md`
