# Ourday Design System

> 결혼을 앞둔 **커플이 함께** 결혼 준비를 관리하는 모바일 퍼스트 웹앱.
> 신랑·신부 각자 계정 + 초대 코드로 연동 → 체크리스트·예산·의사결정·하객·청첩장을 공유.

- **브랜드:** Ourday (우리의 날)
- **플랫폼:** Next.js 16 웹앱 + Capacitor 8 네이티브 래핑
- **디자인 언어:** Toss Design System 스타일 오픈소스 구현 (공식 Toss 라이브러리는 미사용 — 저작권)
- **핵심 톤:** 따뜻한 블루, 모서리가 둥글고 여백이 넉넉한 모바일 UI, 8pt 그리드
- **타겟 언어:** 한국어 (Korean-first)

## 소스 (Sources)

- **Repo:** `github.com/jasonkwak190/ourday` (main)
- **주요 문서:**
  - `CLAUDE.md` — 프로젝트 목적 / 기술 스택 / 규칙 / 8pt 그리드
  - `TDS_MIGRATION.md` — Toss Design System 전환 체크리스트 (컬러 토큰 원문)
  - `FEATURES.md` — 경쟁 앱 분석 / 기능 로드맵
  - `BM.md` — 비즈니스 모델
  - `SUPABASE.md` — DB 스키마
- **코드 기준 파일:**
  - `app/globals.css` — 컬러 토큰, 버튼/카드/인풋 공통 클래스
  - `app/layout.js` — Pretendard Variable 폰트 로드
  - `app/page.js` — 랜딩 (톤/카피 레퍼런스)
  - `components/BottomNav.js` — 하단 네비 + 더보기 시트
  - `components/EmptyState.js`, `OAuthButtons.js`, `OnboardingProgress.js`

## 제품 구성 (Surfaces)

단일 모바일 퍼스트 웹앱. 430px max-width에 맞춘 한 개 UI kit으로 충분.

| 영역 | 경로 | 설명 |
|---|---|---|
| 랜딩 | `/` | 히어로 + 기능 미리보기 + 로그인/가입 |
| 인증 | `/login`, `/signup`, `/connect`, `/setup-profile` | OAuth(Google/Kakao) + 이메일 |
| 대시보드 | `/dashboard` | D-day · 스탯 3개 · 긴급 · 예산 · 업체 잔금 · 방명록 |
| 타임라인 | `/timeline` | 월별 탭 체크리스트 |
| 예산 | `/budget` | 업체 기반 · 도넛 차트 |
| 의사결정 | `/decisions` | 신랑/신부 의견 + 최종 결정 |
| 하객 | `/guests` | 명단 + 축의금 + 갤러리 + RSVP |
| 청첩장 | `/invitation`, `/i/[slug]` | 편집 + 공개 페이지 + 방명록 |

## 핵심 제품 기능

- 커플 초대코드 연동
- 체크리스트 (33개 기본 템플릿)
- 예산/업체 통합 관리 (잔금 D-day)
- 의사결정 보드 (신랑·신부 의견)
- 하객 관리 + 축의금 수입/지출 손익
- 모바일 청첩장 + RSVP + 방명록
- QR 하객 사진 업로드 + 식장 라이브 슬라이드쇼

---

## CONTENT FUNDAMENTALS — 카피와 톤

### 보이스 & 무드

- **따뜻하고 친근한 존댓말.** "~해요" 체 기본. "~합니다" 같은 격식체는 쓰지 않음.
- **결혼 준비의 공동 주체성을 전제.** "두 사람", "신랑·신부", "함께", "같은 화면" 같은 어휘가 반복됨.
- **가이드 톤.** 명령하지 않고 안내함. ("설정하면 …가 표시돼요", "~하면 됩니다 ❌ / ~하면 돼요 ✅")
- **한국어 네이티브.** 영어 혼용 거의 없음. 브랜드명만 `Ourday`로 병기.

### 케이싱 & 문장 부호

- 타이틀: 평어 문장 ("두 사람의 결혼 준비, 함께 하나씩")
- 라벨: 2~4자 짧게 ("일정 완료", "예산 사용", "미결정")
- 빈 상태 메시지: 15~40자 (`EmptyState` 기준 `maxWidth: 220`)
- `·` (가운뎃점)으로 짧은 나열 연결 ("체크리스트 · 예산 · 하객 · 청첩장")
- `<br/>` 수동 줄바꿈을 적극 사용해 모바일에서 읽기 좋은 리듬 만듦
- `word-break: keep-all` 로 한글 어절 단위 줄바꿈 유지

### 호칭

- 유저 본인을 부를 때: "당신" 대신 아무것도 안 쓰고 "~해요"로 빠지는 경우가 많음
- 상대방: "파트너", "신랑·신부", "서로"
- 1인칭 복수: "우리"는 브랜드명/랜딩 외엔 거의 안 씀 → 카피는 유저 관점 2인칭 유지

### 이모지 사용

- **적극적으로 사용.** 단, 장식이 아니라 카테고리 아이콘 역할.
- 주요 매핑:
  - 💍 결혼/브랜드 | 💌 청첩장/방명록 | 🎉 참석 | 🙏 불참
  - 📋 체크리스트 | 💰 예산 | 📅 일정 | 🎊 하객 | 🏢 업체
  - 🤵 신랑 | 👰 신부
- **렌더링 규칙:** 시스템 이모지 유지 (OS 네이티브). Tossface 금지 — 숫자·기호 렌더링이 깨짐.
- 텍스트 앞에 위치 ("📋 타임라인", "💰 예산·업체")

### 실제 카피 예시

| 컨텍스트 | 예시 |
|---|---|
| 히어로 | 두 사람의 결혼 준비,\n**함께 하나씩** |
| 서브 | 체크리스트부터 청첩장까지\n신랑·신부가 같은 화면을 봐요 |
| 온보딩 배너 | 🎉 결혼 준비를 시작해봐요! |
| D-day | 오늘이에요! / 250일 남았어요 / D+3일 지났어요 |
| 빈 상태 | 아직 등록한 하객이 없어요 |
| CTA | 결혼 정보 설정하기 / 파트너 연동하기 / 타임라인 보기 |
| 로그인 환영 | 다시 만나서 반가워요 💍 |

### 숫자 표기

- 단위: 만원 (`1,240만원`, `총 4,000만원`)
- 천 단위 콤마: `.toLocaleString('ko-KR')`
- 숫자 나란히 나올 땐 `.tabular-nums` 클래스 (전역 tnum 금지)
- D-day: `D-250`, `D-Day`, `D+3`

---

## VISUAL FOUNDATIONS — 비주얼 기반

### 컬러

Toss 팔레트 기반. 하드코딩 금지, 반드시 CSS 변수 사용.

- **핵심 Primary:** `--toss-blue: #3182F6` / light `#EBF3FE` / dark `#1B64DA`
- **배경:** `--toss-bg: #FAF7F2` (크림 톤 오프화이트 — Toss 순정 `#F2F4F6`를 Ourday는 따뜻하게 조정)
- **카드:** `--toss-card: #FFFFFF`
- **텍스트:** primary `#191F28` / secondary `#4E5968` / tertiary `#8B95A1`
- **보더:** `#E5E8EB` (매우 연함)
- **시맨틱:** red `#F04452` (긴급/지출), green `#00B493` (완료/잔여), yellow `#F8B300` (경고/논의중), purple `#7B61FF`
- **레거시 매핑:** `--rose`, `--cream`, `--stone` 등 결혼 테마 변수가 Toss 토큰으로 재매핑되어 공존함

### 타이포그래피

- **폰트:** `Pretendard Variable` → `Pretendard` → `-apple-system`, `BlinkMacSystemFont`, `Apple SD Gothic Neo`, sans-serif
- **CDN:** `cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/…`
- **라이선스:** SIL OFL
- **Monospace 금지** — 고정폭은 `font-variant-numeric: tabular-nums` 로 대응
- **letter-spacing:** 큰 제목일수록 더 빡빡하게 (`-0.03em` / `-0.02em` / `-0.01em`)
- **line-height:** 본문 1.5, 서브 설명 1.6~1.7
- **Weight:** 400 본문 / 500 인풋 / 600 라벨 / 700 버튼 · 강조 / 800 숫자 히어로
- **스케일:**
  - Hero 숫자(D-day): 72px / 800
  - Title: 28px / 800
  - Section: 16~18px / 700
  - Body: 14~16px / 400~500
  - Caption: 12~13px / 400
  - Tag/Uppercase: 11px / 600, `letter-spacing: 0.06~0.08em`

### 스페이싱 — 8pt 그리드 (Toss Slash 기준)

모든 여백·크기는 8의 배수:

| 용도 | 값 |
|---|---|
| 버튼·인풋 높이 | 56px (8×7) |
| 카드 패딩 | 24px (8×3) |
| 카드 radius | 24px (8×3) |
| 버튼·인풋 radius | 16px / 12px |
| 페이지 상단 패딩 | 24px |
| 페이지 좌우 패딩 | 20px (Toss 표준) |
| 섹션 gap | 16 / 24 / 32 |
| 아이템 gap | 8 / 12 / 16 |

### 모서리 (Radii)

- **Card:** 24px — 기본, 앱스럽고 둥글게
- **Button/Input large:** 16px
- **Input medium:** 12px
- **Small chip/mini card:** 10~12px
- **Tag:** 8px
- **Pill/Progress:** 99px
- **Icon tile inside more-sheet:** 12px (40×40 타일)
- **Step circle:** 50% (28~32px)

### 그림자 (Elevation)

- **Card:** `0 1px 8px rgba(0,0,0,0.05), 0 4px 16px rgba(0,0,0,0.04)` (이중 레이어, 아주 부드러움)
- **Mini card:** `0 1px 4px rgba(0,0,0,0.04)`
- **BottomNav 상단 분리:** `box-shadow: 0 -1px 0 var(--toss-border)` (그림자 아님, 얇은 1px 구분)
- **More sheet:** `0 -4px 24px rgba(0,0,0,0.1)`
- **일반 원칙:** 인셋 섀도우·강한 드롭 섀도우 없음. "살짝 떠있는" 정도.

### 보더

- 1.5px로 통일 (0.5/1/2px 섞지 않음)
- 색: `var(--toss-border)` 기본
- Focus 상태에서만 `var(--toss-blue)` 로 강조 (1.5px)
- 카드에는 보더 거의 없음 — 그림자만으로 분리

### 배경 / 레이아웃 지문

- 전체 배경: 크림톤 `#FAF7F2` (단색, 그라디언트 없음)
- **Safe-area-inset 전체 적용** (iPhone 노치, Dynamic Island, 안드로이드 컷아웃, 홈 인디케이터)
- 콘텐츠 컨테이너: `max-width: 430px`, `mx-auto`
- 하단 bottom-nav (64px) 공간 확보: `padding-bottom: 80px + env(safe-area-inset-bottom)`
- **이미지 사용은 제한적.** 풀블리드 이미지/패턴/질감/손그림 일러스트 없음. 브랜드 아트 = 앱 아이콘(두 링 교차) 하나.
- 텍스처·그레인·노이즈 없음

### 하이라이트 / 강조 스타일

- **Pill badge** (`D-250`): `padding: 4px 12px`, `bg: blue-light`, `color: blue`, `border-radius: 99px`
- **Tag**: `padding: 3px 10px`, 라이트 색 배경 + 동계열 텍스트 (`.tag-rose`, `.tag-green`, `.tag-amber`, `.tag-red`)
- **Urgent 블록**: red-light 배경 + red 텍스트 + red AlertCircle 아이콘
- **선택된 항목 박스**: `blue-light` 배경 + `blue` 텍스트
- 긴급도는 색으로만: red → yellow → default (텍스트 사이즈는 동일)

### 애니메이션

- **transition 기본:** `150ms` (background-color, color, border-color)
- **progress fill:** `width 0.4s ease`
- **버튼 press:** `transform: scale(0.97)` + `100ms` — 안드로이드 웨이브 없음, 탑다운 축소만
- **Hover:** 데스크탑 보조. 모바일이 기본.
- **Fades/bounces 거의 없음.** 리스트 아이템 들어올 때 애니메이션 없음. 페이지 전환은 네이티브 위임.
- **이징:** 표준 `ease` / `ease-out`. 스프링 곡선 없음.

### 인터랙션 상태

- **Hover:**
  - Primary btn → `toss-blue` → `toss-blue-dark`
  - Outline btn → white → `toss-bg`
  - Ghost btn → `toss-bg` → `toss-border`
- **Press (active):** `transform: scale(0.97)` 공통
- **Disabled:** `opacity: 0.4`, `cursor: not-allowed`
- **Focus (input):** 배경 `toss-bg` → `white` + 1.5px `toss-blue` 보더
- **Checkbox active:** 원형, 체크된 상태에서 `toss-blue` 채움 + 흰색 ✓

### 투명도 / Blur

- 투명 오버레이는 시트 배경 `rgba(0,0,0,0.3)` 한 번만 사용
- **Backdrop blur 사용 안 함** (Toss Slash 순정은 쓰지만 Ourday는 미채용)
- 반투명 브랜드 컬러는 라이트 배경 `-light` 토큰으로 대체 (투명도 대신)

### 카드의 모습

```
padding: 24px
radius: 24px
background: white
border: 없음
box-shadow: 0 1px 8px rgba(0,0,0,0.05), 0 4px 16px rgba(0,0,0,0.04)
```

보더 없이 그림자만으로 크림 배경에서 떠오름. 내부 섹션 구분은 24px gap 또는 1px `--toss-border` 디바이더.

### 고정 요소

- 하단 네비 (64px + safe-area-bottom), 5 슬롯 (홈/일정/예산/결정/더보기)
- 상단 상태바는 OS에 위임 (`viewport-fit: cover` + `padding-top: env(safe-area-inset-top)`)
- 헤더 없음 — 페이지 상단은 `padding: 24px 20px` 로 시작해 콘텐츠가 바로 나옴

### 이미지 무드

- 메인 브랜드 아트: 두 링이 교차하는 단순 도형 (흰색 링, 파란 그라디언트 배경)
- 커플 사진은 `Supabase Storage` 업로드 — 자연광/따뜻한 톤 가이드는 없음, 사용자 업로드 그대로
- 일러스트 없음. 아이콘/이모지로 대체.

---

## ICONOGRAPHY — 아이콘 시스템

- **기본 아이콘 라이브러리:** `lucide-react` (CDN도 OK). `strokeWidth={2}` 기본, 활성 시 `2.5`.
- **크기 규칙:**
  - 하단 네비: 22px
  - 더보기 시트 타일: 20px (40×40 타일 내부)
  - 카드 헤더: 16px
  - 인라인: 12~14px
- **자주 쓰는 매핑:**
  - `Home`, `CalendarDays`, `Wallet`, `MessageSquare`, `Users`, `Building2`, `MoreHorizontal`
  - `Camera`, `Paperclip`, `BookOpen`, `Settings`
  - `AlertCircle`, `ChevronRight`, `Eye`/`EyeOff`
- **색 처리:** 항상 CSS 변수로. 비활성 `--toss-text-tertiary`, 활성 `--toss-blue`.
- **이모지:** 시스템 이모지로 카테고리 뱃지 역할. `font-family` 에 Tossface 넣지 않음.
- **브랜드 로고:** `assets/ourday-icon-512.png`, `ourday-icon-192.png`, `ourday-apple-touch.png`, `ourday-icon.svg` 제공.
- **SVG 인라인:** OAuth 버튼의 Google 멀티컬러 로고, 카카오 단색 말풍선은 인라인 SVG로 코드에 박혀 있음.
- **자체 아이콘 폰트 / 스프라이트 없음.** 전부 Lucide + 소수의 인라인 SVG + 이모지.

> **대체 상황:** `lucide-react`를 사용할 수 없는 환경에서는 Lucide CDN(`https://unpkg.com/lucide@latest`)이나 동일 스타일의 stroke 2px 라인 아이콘으로 대체. 아이콘 스타일(라인/스트로크/라운드) 섞지 말 것.

---

## 폰트 파일 메모

- **Pretendard Variable**: 앱은 jsDelivr CDN 링크로 로드 (`pretendard@v1.3.9`).
- **이 프로젝트에서는 로컬 `fonts/` 폴더에 포함하지 않고 CDN 링크만 참조.** 필요 시 `https://github.com/orioncactus/pretendard` 에서 SIL OFL 라이선스로 다운로드 가능.
- **⚠️ 사용자에게 확인 필요:** 오프라인 사용이 필요하면 변수 ttf/woff2를 `fonts/`에 추가해주세요.

---

## 이 프로젝트 파일 인덱스

### 루트
- `README.md` — 이 문서
- `colors_and_type.css` — CSS 변수 + 시맨틱 타입 스타일
- `SKILL.md` — Claude/Agent용 스킬 정의

### 프리뷰 카드 (`preview/`)
Design System 탭에 렌더되는 개별 카드들. 컴포넌트·토큰 단위로 쪼개져 있음.

### UI 킷 (`ui_kits/ourday_app/`)
- `README.md` — 킷 개요
- `index.html` — 인터랙티브 데모 (랜딩 → 로그인 → 대시보드 → 타임라인 → 예산)
- `Tokens.jsx` — CSS 변수 주입
- `Icons.jsx` — Lucide-like 인라인 SVG 아이콘 (오프라인 동작)
- `Primitives.jsx` — 버튼/카드/인풋/태그/프로그레스/디바이더
- `BottomNav.jsx` — 하단 5탭 네비
- `Screens.jsx` — 랜딩/로그인/대시보드/타임라인/예산 화면

### 에셋 (`assets/`)
- `ourday-icon-512.png`, `ourday-icon-192.png`, `ourday-apple-touch.png`, `ourday-splash.png`, `ourday-icon.svg`
