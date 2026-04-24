# Ourday — CLAUDE.md

## WHY (프로젝트 목적)
결혼을 앞둔 **커플이 함께** 결혼 준비를 관리하는 모바일 퍼스트 웹앱.
신랑·신부 각자가 계정을 만들고 초대 코드로 연동한 뒤, 체크리스트·예산·의사결정을 공유한다.

---

## WHAT (기술 스택 & 구조)

**스택**: Next.js 16 (App Router) · Tailwind CSS v4 · Supabase (Auth + PostgreSQL) · lucide-react · Capacitor 8

**네이티브**: Capacitor 8 (`@capacitor/app`, `@capacitor/browser`, `@capacitor/clipboard`)
- `server.url: 'https://ourday-rust.vercel.app'` → WebView가 Vercel URL 직접 로드
- 앱 업데이트 = `git push` → Vercel 배포만으로 완료 (앱 재빌드 불필요)
- `appId: 'com.ourday.app'`

**디자인 시스템**: Editorial Wedding Planner v2 (2026-04 전면 적용)
- 팔레트: Ink(`#1A1613`) / Ivory(`#FAF8F5`) / Champagne(`#C9A96E`) / Paper(`#F5F0E8`)
- 폰트 3종: Cormorant Garamond (영문 세리프·이탤릭) · Noto Serif KR (한글 세리프) · Pretendard (본문 sans)
- 컬러: `--ink`, `--champagne`, `--paper`, `--ivory` + `--toss-*` 유틸 변수 (globals.css)
- O·D 모노그램: 로그인·가입·랜딩 페이지 헤더에 사용하는 Cormorant 88px 심볼
- 공식 Toss 라이브러리 미사용 (저작권)

```
app/
  page.js            # 랜딩 (커플 수 표시, 푸터: 개인정보처리방침·이메일)
  layout.js          # Pretendard 폰트, globals.css 로드
  globals.css        # Toss 컬러 토큰 + 공통 클래스 (btn-rose/card/input-field 등)
  signup/            # 회원가입 (OAuth + 이메일, 개인정보처리방침 동의 체크박스 필수)
  login/             # 로그인
  connect/           # 커플 초대코드 연동
  setup/             # 결혼 기본 정보 설정 (스킵 가능, 언제든 수정 가능)
  setup-profile/     # OAuth 신규 유저 이름·역할 수집
  dashboard/         # D-day · 스탯 · 진행률 · 이번달 할일
  timeline/          # 월별 탭 + 캘린더 뷰 통합 체크리스트
  budget/            # 업체 기반 예산 관리 (vendors 테이블 통합, 도넛 차트)
  guests/            # 하객 관리 + 축의금 + 사진 갤러리 탭 + RSVP
  decisions/         # 의사결정 보드 (신랑/신부 의견 + 최종 결정)
  guide/             # 정보·예절 가이드 (정적)
  notes/             # 커플 실시간 메모 (Supabase Realtime)
  invitation/        # 모바일 청첩장 편집
  privacy/           # 개인정보처리방침 (법적 필수 페이지)
  settings/          # 프로필 · 초대코드 확인 · 결혼정보 수정 · 로그아웃
  auth/callback/     # OAuth 콜백 처리 (신규/기존 유저 분기)
  rsvp/[id]/         # 공개 RSVP 폼
  guest/[code]/      # 하객 사진 업로드 (비로그인 접근)
  live/[code]/       # 식장 라이브 슬라이드쇼
  i/[slug]/          # 모바일 청첩장 공개 페이지 (OG태그, 방명록)
components/
  BottomNav.js       # 하단 네비게이션 (lucide-react 아이콘, 더보기 시트 포함)
  InvitationTab.js   # 청첩장 편집 탭
  InvitationTemplates.js  # 청첩장 템플릿 렌더러
  GalleryTab.js      # 하객 사진 갤러리 탭
  OAuthButtons.js    # Google·카카오 OAuth 버튼
  EmptyState.js      # 빈 상태 공통 UI
lib/
  supabase.js        # createBrowserClient (쿠키 기반 세션 동기화)
  supabase-server.js # createServerClient (SSR용)
  clipboard.js       # Capacitor/브라우저 클립보드 통합 유틸
proxy.js             # 보호 라우트 인증 체크 → 미인증 시 / 리다이렉트
vercel.json          # Vercel Cron 설정 (매일 KST 03:00 데이터 파기)
android/             # Capacitor Android 네이티브 프로젝트
ios/                 # Capacitor iOS 네이티브 프로젝트
public/.well-known/  # Android App Links 검증용 assetlinks.json
```

**DB 테이블**: `couples` · `users` · `checklist_items` · `vendors` · `decisions` · `guests` · `invitations` · `couple_notes` · `photo_events` · `guest_photos` · `guestbook_entries` · `rsvp_responses`
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

**Capacitor 동기화** (네이티브 플러그인 변경 시)
```bash
PATH="$HOME/.nvm/versions/node/v20.19.3/bin:$PATH" npx cap sync android
```

**환경변수** (`.env.local`, git 제외됨)
```
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...     # 서버 전용 (cleanup cron, gallery API)
CRON_SECRET=...                    # Vercel Cron 인증 토큰
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
- **`export const dynamic = 'force-dynamic'`** — Supabase를 사용하는 모든 API 라우트에 추가 (클라이언트 페이지는 불필요)
- **세션 → couple_id 순서로 조회** — 페이지 진입 시 항상 이 순서로 데이터 로드
- **로딩/에러 상태 필수** — 빈 화면 깜빡임 없도록
- **모바일 퍼스트** — `max-w-[430px] mx-auto`, 하단 네비 공간 `pb-24`
- **클립보드** — `navigator.clipboard` 직접 사용 금지. 반드시 `@/lib/clipboard`의 `copyToClipboard()` 사용 (Capacitor Android 호환)
- **Hydration 안전 패턴** — `window.*` 값을 JSX에서 직접 사용하지 말 것. `useState('') + useEffect(() => setX(window.xxx), [])` 패턴 사용
- **절대 하지 말 것** — `dangerouslySetInnerHTML`, couple_id 필터 누락 쿼리, `SUPABASE_SERVICE_ROLE_KEY` 클라이언트 노출

## 디자인 규칙 (Editorial v2)

- **컬러 변수** — 반드시 `var(--ink)` / `var(--champagne)` / `var(--paper)` 등 CSS 변수 사용. 하드코딩 금지
- **버튼** — `.btn-rose`(주, pill) / `.btn-outline`(보조, pill) / `.btn-ghost`(3차) / `.btn-champagne`(금색)
  - 모든 버튼 `border-radius: 28px` — pill 형태 유지
- **카드** — `.card`(일반) / `.card-hero`(코너 프레임 에디토리얼 카드) 구분 사용
  - `card-hero`: `border-radius: 4px` + `::before/::after` 코너 프레임 (champagne, opacity 0.6)
- **인풋** — `.input-field` 클래스 사용
- **아이콘** — `lucide-react`만 사용, `strokeWidth={2}` 기본값. SVG 스프라이트는 `public/icons.svg`
- **타임라인** — `.timeline-rail` + `.timeline-node` + `.is-done` / `.is-now` 클래스 사용
- **플러리시** — `.flourish` + `.fl-line` + `.fl-diamond` 클래스 (챔페인 구분선)
- **세리프 타이포** 패턴:
  ```jsx
  // 페이지 헤더 표준
  <h1 style={{ fontFamily: 'var(--font-serif-ko)', fontWeight: 500, fontSize: 20, letterSpacing: '-0.01em' }}>제목</h1>
  <p style={{ fontFamily: 'var(--font-serif-en)', fontStyle: 'italic', fontSize: 11, color: 'var(--champagne-2)', letterSpacing: '0.04em' }}>subtitle</p>

  // 킥커(섹션 레이블) 표준
  <div className="t-kicker">· LABEL ·</div>
  ```
- **O·D 모노그램** 패턴 (로그인·가입 헤더):
  ```jsx
  <span style={{ fontFamily: 'var(--font-serif-en)', fontSize: 88, fontWeight: 500 }}>O</span>
  <span style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: 'var(--champagne)' }} />
  <span style={{ fontFamily: 'var(--font-serif-en)', fontSize: 88, fontWeight: 500 }}>D</span>
  ```
- **다이어리 카드** (대시보드 dark 카드) 패턴:
  ```jsx
  // background: var(--ink), 내부 inset 5px champagne border opacity 0.35
  ```
- **디자인 수정 시** — Supabase 쿼리/상태관리 로직 절대 건드리지 않음

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

## 참고 문서

| 파일 | 내용 |
|------|------|
| `SKILLS.md` | 에러 기록·재발 방지·체크리스트 |
| `CHECKPOINT.md` | 개발 현황·기능 완료 상태 |
| `MANUAL_TASKS.md` | 사람이 직접 해야 하는 작업 목록 |
| `DOMAIN_CHANGE.md` | **도메인 변경 시** 수정해야 할 모든 위치 목록 |
| `FEATURES.md` | 경쟁 앱 분석·추가 기능 백로그 |
| `BM.md` | 비즈니스 모델·수익화 플래닝 (Freemium·청첩장·B2B 제휴·광고) |
| `TDS_MIGRATION.md` | Toss 스타일 전환 체크리스트 |
| `SUPABASE.md` | Supabase 스키마·RLS 정책 |

---

## TODO 체크리스트 (2026-04-24 기준)

> 완료된 항목 ✅ / 진행 중 🔄 / 미착수 ⬜

### 🎨 디자인 — Editorial v2

- [x] globals.css: pill 버튼(28px), card-hero 코너 프레임, timeline-rail, flourish
- [x] 로그인: O·D 모노그램 스플래시 풀페이지 레이아웃
- [x] 가입: O·D 모노그램 헤더
- [x] 랜딩: 에디토리얼 히어로 + 플러리시
- [x] 대시보드: good morning 인사말 + 레터프레스 다이어리 카드
- [x] 타임라인: 노드 레일 + 기간별 카드
- [x] 노트: serif 헤더·구분선·배지·전송버튼
- [x] decisions / budget / guests / guide: 페이지 헤더 통일
- [ ] settings 페이지 헤더 serif 업데이트
- [ ] timeline 캘린더 뷰 에디토리얼 처리
- [ ] `/i/[slug]` 공개 청첩장 에디토리얼 타이포
- [ ] 앱 스플래시·아이콘 O·D 모노그램으로 교체

### 🔐 인증 / OAuth

- [x] 이메일 가입·로그인 (Supabase Auth)
- [x] 비밀번호 재설정 (`/reset-password`, `/reset-password/confirm`)
- [x] OAuth 콜백 처리 (`/auth/callback`)
- [ ] **Google OAuth** — Supabase Dashboard → Auth → Providers 설정 필요 (수동)
- [ ] **카카오 OAuth** — developers.kakao.com 앱 설정 + Supabase 연결 필요 (수동)

### 📤 공유 기능

- [x] 청첩장 공개 페이지 (`/i/[slug]`) — OG태그, 방명록
- [x] RSVP 공개 폼 (`/rsvp/[id]`)
- [x] 하객 QR 사진 업로드 (`/guest/[code]`)
- [x] 라이브 슬라이드쇼 (`/live/[code]`)
- [ ] **카카오톡 공유 버튼** — 임시 JS 키로 구현됨, 실 키 등록 필요 (수동)
- [ ] 준비 현황 PDF 내보내기
- [ ] 예산 내역 엑셀 다운로드

### 💡 기능 확장

- [ ] 영수증·계약서 사진 첨부 (업체/예산 항목별 Supabase Storage)
- [ ] 예산 초과 실시간 경고 배너
- [ ] 푸시 알림 (D-day·잔금 D-7·D-1 리마인더) — Web Push API
- [ ] 오프라인 지원 (Service Worker 캐시)
- [ ] 좌석 배치도

### 🚀 출시 준비

- [ ] Google Play 개발자 계정 등록 ($25, 수동)
- [ ] App Store 개발자 계정 등록 ($99/년, 수동)
- [ ] 실기기 최종 테스트 (Android + iOS)
- [ ] 개인정보처리방침 법적 검토
