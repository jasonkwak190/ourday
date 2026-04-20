# CHECKPOINT.md — Ourday 개발 현황

> 마지막 업데이트: 2026-04-20

---

## ✅ 완성된 페이지 / 기능

### 코어 플로우
| 페이지 | 경로 | 상태 |
|--------|------|------|
| 랜딩 | `/` | ✅ 실제 커플 수 표시 (service role key 필요) |
| 회원가입 | `/signup` | ✅ |
| 로그인 | `/login` | ✅ |
| 커플 연동 | `/connect` | ✅ 초대코드 발급·입력 |
| 기본 정보 설정 | `/setup` | ✅ 결혼일·장소·이름 |
| 대시보드 | `/dashboard` | ✅ D-day, 진행률, 이번달 할일 |

### 결혼 준비 도구
| 페이지 | 경로 | 상태 |
|--------|------|------|
| 타임라인 체크리스트 | `/timeline` | ✅ 월별 탭, 체크 토글 |
| 예산 관리 | `/budget` | ✅ 항목 CRUD, 예산 대비 지출 |
| 하객 관리 | `/guests` | ✅ 목록 CRUD, 축의금 |
| 업체 관리 | `/vendors` | ✅ 계약 현황, 잔금 일정 |
| 의사결정 | `/decisions` | ✅ 신랑/신부 의견 + 최종 결정 |
| 캘린더 뷰 | `/calendar` | ✅ 체크리스트·잔금 한눈에 |
| 예식 가이드 | `/guide` | ✅ 정적 정보 |
| 설정 | `/settings` | ✅ 프로필·초대코드·로그아웃 |

### 신규 기능 (최근 추가)
| 페이지 | 경로 | 상태 |
|--------|------|------|
| 하객 사진 갤러리 | `/gallery` | ✅ SUPABASE_SERVICE_ROLE_KEY Vercel 설정 완료 |
| 하객 업로드 페이지 | `/guest/[code]` | ✅ QR 스캔 후 사진 업로드 |
| 라이브 슬라이드쇼 | `/live/[code]` | ✅ 식장 대형화면용 자동 슬라이드 |
| 모바일 청첩장 편집 | `/invitation` | ✅ 3가지 템플릿, 계정 이름 자동 매핑 |
| 모바일 청첩장 공개 | `/i/[slug]` | ✅ 미니멀·클래식·플라워 템플릿, 조회수 |
| 정보 공유 노트 | `/notes` | ✅ 말풍선 UI, Realtime, 검색, 수정·삭제 |

### API Routes
| 경로 | 기능 |
|------|------|
| `POST /api/gallery` | 커플 photo_event 생성/조회 |
| `GET /api/gallery` | 사진 목록 + signed URL |
| `DELETE /api/gallery` | 사진 삭제 |
| `POST /api/guest/upload` | 하객 사진 업로드 (서비스 롤) |
| `GET /api/live` | 슬라이드쇼용 사진 조회 |
| `GET /api/stats` | 커플 수 공개 통계 |

---

## 🐛 에러 히스토리

### ERR-001 · CSS @import 순서 오류
- **증상**: `globals.css`에서 @import가 규칙 뒤에 위치해 빌드 경고
- **해결**: @import를 파일 최상단으로 이동

### ERR-002 · Tossface 숫자 렌더링 파괴
- **증상**: 숫자가 Tossface 이모지 폰트에 가로채여 깨진 글자로 렌더링
- **해결**: font-family에서 Tossface 완전 제거, 시스템 이모지로 대체

### ERR-003 · font-feature-settings tnum 전역 적용
- **증상**: body에 `"tnum"` 전역 적용 시 전체 숫자 폰트 깨짐
- **해결**: body에서 제거, `.tabular-nums` 클래스로 필요한 곳에만 선택 적용

### ERR-004 · Next.js 16 params Promise 미처리
- **증상**: `/guest/[code]`, `/live/[code]`에서 `params.code` 동기 접근 시 에러
- **원인**: Next.js 16에서 `params`가 Promise로 변경됨
- **해결**: `use(params)`로 unwrap

### ERR-005 · QR 코드 외부 API 실패
- **증상**: `api.qrserver.com` 이미지 로드 안 됨
- **해결**: `qrcode` npm 패키지로 로컬 생성으로 전환

### ERR-006 · qrcode 패키지 SSR 오류 (top-level import)
- **증상**: Vercel 빌드에서 Canvas API 없어 침묵 실패
- **해결**: `await import('qrcode')` dynamic import로 전환

### ERR-007 · qrcode dynamic import도 Vercel 프로덕션에서 실패
- **증상**: 여전히 "QR 생성 중..." 표시 — Canvas 의존성이 Vercel 서버리스에서 완전히 미지원
- **해결**: `react-qr-code` (순수 SVG, Canvas 불필요)로 교체

### ERR-008 · SUPABASE_SERVICE_ROLE_KEY Vercel 미설정 ← ✅ 해결됨 (2026-04-20)
- **증상**: `/gallery` 에서 "서버 오류" — photo_events 조회 불가 / 랜딩 커플 수 0으로 표시
- **원인**: `SUPABASE_SERVICE_ROLE_KEY` 환경변수가 Vercel에 없음
- **해결**: Vercel → Settings → Environment Variables에 추가 완료

### ERR-009 · 랜딩 커플 수 RLS 차단
- **증상**: anon key로 `couples` 테이블 count → 항상 0 반환
- **원인**: RLS가 활성화되어 있어 anon key로 전체 행 조회 불가
- **해결**: service role key 사용 (ERR-008 해결 시 자동 해결)

### ERR-010 · 청첩장 신랑/신부 이름 계정 미매핑 (초기)
- **증상**: 청첩장 편집 시 이름 빈칸
- **해결**: `users` 테이블에서 `role` 기준으로 groom/bride 이름 자동 pre-fill, 계정 이름 우선

---

## 🔴 즉시 해결 필요

| 항목 | 방법 |
|------|------|
| gallery 디버그 코드 정리 | 에러 메시지 표시 코드 제거 (env 설정 완료됐으므로) |

---

## 🚀 다음 개발 후보

### P0 · 바로 해야 할 것
- [ ] **갤러리 디버그 코드 정리** — 에러 메시지 표시 코드 제거

### P1 · 핵심 UX 완성
- [x] **온보딩 개선** ✅ — OnboardingProgress 3단계 인디케이터, 파트너 연동 감지, 성공 피드백 (2026-04-20)
- [x] **청첩장 템플릿 미리보기** ✅ — 저장 전 풀스크린 미리보기 모달, 모달에서 바로 저장 가능 (2026-04-20)
- [ ] **대시보드 개선** — 오늘 해야 할 일 / 이번주 마감 항목 강조
- [ ] **하객 RSVP** — 하객이 QR 스캔 후 참석 여부 응답 → 자동 집계

### P2 · 기능 확장
- [ ] **푸시 알림 / 리마인더** — 체크리스트 마감일 D-3, D-1 알림
- [ ] **예산 카테고리 차트** — 도넛 차트로 지출 비율 시각화
- [ ] **업체 계약서 첨부** — PDF/이미지 업로드 (Supabase Storage 활용)
- [ ] **하객 축의금 통계** — 총액, 평균, 측별(신랑/신부) 분류
- [ ] **청첩장 방명록** — `/i/[slug]` 하단에 하객 메시지 남기기

### P3 · 완성도
- [ ] **PWA 설정** — manifest.json, 홈화면 추가, 오프라인 지원
- [ ] **OG 태그** — 청첩장 공유 시 카카오톡 미리보기 이미지
- [ ] **다크모드** — `prefers-color-scheme` 대응
- [ ] **빈 상태 개선** — 각 페이지 첫 진입 시 안내 일러스트
- [ ] **결혼 후 모드** — D+day 이후 추억 앨범 전환

---

## DB 테이블 현황

| 테이블 | 용도 | RLS |
|--------|------|-----|
| `couples` | 커플 기본 정보 | ✅ |
| `users` | 개인 프로필, role(groom/bride) | ✅ |
| `checklist_items` | 타임라인 항목 | ✅ |
| `budget_items` | 예산 항목 | ✅ |
| `decisions` | 의사결정 | ✅ |
| `guests` | 하객 목록 | ✅ |
| `vendors` | 업체 목록 | ✅ |
| `invitations` | 모바일 청첩장 | ✅ |
| `couple_notes` | 정보 공유 노트 | ✅ |
| `photo_events` | 하객 사진 이벤트 (QR) | ✅ |
| `guest_photos` | 하객 업로드 사진 메타 | ✅ |

## Storage Buckets
| 버킷 | 용도 |
|------|------|
| `guest-photos` | 하객 업로드 사진 (private, signed URL) |
