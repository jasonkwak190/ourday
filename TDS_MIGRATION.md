# TDS_MIGRATION.md — Toss Design System 전환 체크리스트

> 목표: Ourday를 'App in Toss' 배포용 Toss 스타일 UI로 전환
> 원칙:
>   - Supabase 연동 로직 절대 수정 금지 (디자인만 변경)
>   - 공식 Toss 라이브러리 미사용 (저작권 이슈) — 오픈소스만 활용
>   - 커밋은 로컬 테스트 통과 후에만

---

## 1단계 · Design Tokens

### 1-1. Pretendard 폰트
- [x] `app/globals.css`에 Pretendard CDN @font-face 추가
- [x] `app/layout.js` DM Serif Display / DM Sans → Pretendard로 교체

### 1-2. Toss 컬러 토큰 (`app/globals.css`)
- [x] `--toss-bg: #F2F4F6`
- [x] `--toss-card: #FFFFFF`
- [x] `--toss-blue: #3182F6`
- [x] `--toss-blue-light: #EBF3FE`
- [x] `--toss-text-primary: #191F28`
- [x] `--toss-text-secondary: #4E5968`
- [x] `--toss-text-tertiary: #8B95A1`
- [x] `--toss-border: #E5E8EB`
- [x] `--toss-red: #F04452`
- [x] `--toss-green: #00B493`
- [x] `--toss-yellow: #F8B300`

### 1-3. 기본값 교체
- [x] body 배경: `var(--cream)` → `var(--toss-bg)`
- [x] body 기본 폰트: Pretendard, 16px

---

## 2단계 · 공통 컴포넌트 (`app/globals.css`)

### 버튼
- [x] `.btn-rose` → Toss 파란 주버튼 (bg: toss-blue, radius: 18px, bold, scale 애니메이션)
- [x] `.btn-outline` → 흰 배경 보조버튼 (border: toss-border, bold)
- [x] `.btn-ghost` 신규 추가 (bg: toss-bg, 텍스트: toss-text-secondary)

### 카드
- [x] `.card` → 패딩 24px, radius 18px, border 없음, 자연스러운 그림자

### 인풋
- [x] `.input-field` → 배경 toss-bg, border 제거, focus시 toss-blue 테두리, 높이 52px

### 태그
- [x] `.tag-*` → Toss 팔레트로 교체

### 네비
- [x] `.nav-bottom` → 그림자로 상단 구분, toss-blue 활성 컬러

### 진행바
- [x] `.progress-fill` → toss-blue

---

## 3단계 · 패키지

- [x] `lucide-react` 설치
- [ ] `@apps-in-toss/web-framework` — 설치 여부 추후 결정

---

## 4단계 · BottomNav (`components/BottomNav.js`)

- [x] 텍스트 이모지 → lucide-react 아이콘 교체
  - 🏠 → `Home`
  - 📅 → `CalendarDays`
  - 💰 → `Wallet`
  - 🎊 → `Users`
  - 🏢 → `Building2`
  - ··· → `MoreHorizontal`
- [x] 더보기 시트 아이콘도 교체

---

## 5단계 · 페이지별 TDS 적용

| 파일 | 상태 | 주요 변경 |
|------|------|---------|
| `app/layout.js` | [x] | Pretendard 폰트 |
| `app/page.js` | [x] | 랜딩 Toss 스타일 |
| `app/login/page.js` | [x] | 토큰 자동 반영 |
| `app/signup/page.js` | [x] | 토큰 자동 반영 |
| `app/connect/page.js` | [x] | 토큰 자동 반영 |
| `app/setup/page.js` | [x] | 토큰 자동 반영 |
| `app/dashboard/page.js` | [x] | 섹션 카드화, 구분선 |
| `app/timeline/page.js` | [x] | 탭 스타일, toss-green 체크 |
| `app/budget/page.js` | [x] | toss-red 초과, toss-blue 강조 |
| `app/guests/page.js` | [x] | 컬러 토큰 교체 |
| `app/vendors/page.js` | [x] | 컬러 토큰 교체 |
| `app/decisions/page.js` | [x] | 상태 배지 Toss 팔레트 |
| `app/guide/page.js` | [x] | 카드 스타일 |
| `app/settings/page.js` | [x] | 목록 구분선 패턴 |

---

## 6단계 · App in Toss 대응

- [ ] viewport safe-area-inset 적용 확인
- [ ] 토스 앱 내 실행 감지 로직 (window.ReactNativeWebView 체크)
- [ ] 토스 앱 내 실행 시 자체 헤더 숨김
- [ ] 뒤로가기 핸들링 (history API)
- [ ] `@apps-in-toss/web-framework` 연동 (설치 확정 후)

---

## 7단계 · 로컬 테스트 체크리스트

- [x] `npm run build` 에러 없음
- [x] 콘솔 에러 없음 (CSS @import 순서 수정 완료)
- [x] 대시보드 플로우 정상 (Supabase 데이터 정상 표시)
- [x] 하객/업체 CRUD 정상 (Supabase 연동)
- [x] 모바일 레이아웃 정상 (430px max-width)
- [x] 더보기 시트 정상 동작 (배경 딤, 아이콘, 활성 상태)
- [x] Toss 스타일 시각적 확인 (랜딩/로그인/대시보드/타임라인/예산/의사결정/하객/설정)

---

## 완료 후 git 커밋 메시지 템플릿

```
feat: Toss Design System 스타일 전환

- Design Tokens: Pretendard 폰트, Toss 컬러 팔레트
- 공통 컴포넌트: 버튼/카드/인풋/네비 TDS 스타일
- lucide-react 아이콘 교체
- 전체 12개 페이지 TDS 적용
- Supabase 연동 로직 무수정
```
