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
