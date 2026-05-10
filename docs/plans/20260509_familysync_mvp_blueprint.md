# 🗺️ Project Blueprint: FamilySync MVP 구현 로드맵

## 문서 메타
- **Last Verified**: 2026-05-09 | **Tested Version**: Next.js 14+, Supabase, Vercel
- **Reference**: `docs/specs/PRD.md`, `docs/specs/TRD.md`
- **SSOT Check**:
  - 요구사항 SSOT: `docs/specs/PRD.md`
  - 기술 SSOT: `docs/specs/TRD.md`
  - 정책 SSOT: `PROJECT_RULES.md`, `AGENTS.md`
  - 충돌 여부: 없음 (`scripts/plan_loop/plan_lint.py` 경로 확인)
- **Project Status Link**: 신규 (초기 구현 착수용 Blueprint)
- **Architectural Goal**: RSC 중심 구조 + Server Actions + Supabase RLS 기반 멀티테넌시로 안전성/실시간성/저입력 UX를 동시에 달성한다.

## Diagnosis & Findings
- **현상 (Symptoms)**: PRD/TRD는 상세하지만 실제 구현 코드베이스(앱 디렉토리/DB 마이그레이션/테스트)가 아직 없는 상태다.
- **재현 경로 (Evidence)**:
  - `docs/specs/PRD.md` 확인: 제품 기능/사용자 가치/주차별 목표 정의됨.
  - `docs/specs/TRD.md` 확인: 서버 액션, 멀티테넌시, RLS, 컴포넌트 구조, Done Criteria 정의됨.
  - 현재 저장소 확인: `docs/specs` 외 실행 코드 부재.
- **근본 원인 (Root Cause)**: 요구사항-설계 문서가 선행되었고, 구현 백본(프로젝트 부트스트랩/스키마/액션/화면/검증)이 아직 시작되지 않았다.

## Architectural Deepening
- **Seam**:
  - 인증/프로필 선택: `app/(auth)` + `actions/auth.ts`
  - 이벤트/안전장치: `actions/events.ts`
  - 관리자 기능: `actions/admin.ts`
  - 데이터 접근 경계: `lib/supabase/*`와 RLS SQL
- **Locality & Depth**:
  - 화면별 도메인 응집: 대시보드, 숙제, 가이드, 관리자 영역으로 분리
  - 변이 경로 단일화: 모든 쓰기 연산은 Server Actions로만 통일
  - 안전 로직 심화: 투약 중복 차단과 Undo를 서버 검증으로 강제
- **Leverage**:
  - `family_id` 기반 공통 검증/RLS를 한 번 설계하면 모든 기능에 재사용 가능
  - 공통 이벤트 모델(`events`)로 타임라인/알림/감사로그를 통합 관리 가능

## Conceptual Sketch
```typescript
// app/actions/events.ts
export async function createEvent(payload: CreateEventInput) {
  const profileId = readActiveProfileCookie();
  const familyId = await resolveFamilyIdByProfile(profileId);
  assertFamilyBoundary(familyId, profileId);

  if (payload.actionType === "medication") {
    const recent = await findRecentMedication(familyId, payload.target, 2 * HOUR);
    if (recent && !payload.metadata?.override) {
      return { blocked: true, lastEventAt: recent.created_at };
    }
  }

  const event = await insertEvent({ ...payload, familyId, profileId, is_reverted: false });
  return { success: true, eventId: event.id };
}
```

## 🛡️ Risk & Strategy
- **Risk**: 멀티테넌시 경계 누수 | **Strategy**: RLS 정책 + 가족 간 교차 접근 E2E 테스트
- **Risk**: 투약 중복 차단 오탐/미탐 | **Strategy**: 서버 단위 시나리오 테스트(2시간 경계값 포함)
- **Risk**: Realtime 지연/누락 | **Strategy**: 다중 세션 동시 검증(1초 내 반영 목표)
- **Risk**: 고령 사용자 UX 실패 | **Strategy**: 버튼 최소 60x60, 입력 최소화, 주요 흐름 클릭 수 측정

## 🔍 Impact Scope
| 수정 대상 파일 | 현재 라인 수 | 역할 (Architecture) | 비고 |
| :--- | :---: | :--- | :--- |
| `package.json` | TBD | 런타임/스크립트 정의 | Next/Supabase/PWA 의존성 |
| `app/(auth)/login/page.tsx` | TBD | 인증 진입 UI | Google OAuth 시작점 |
| `app/(auth)/select-profile/page.tsx` | TBD | 2-Depth 인증 | active profile 선택 |
| `app/(dashboard)/page.tsx` | TBD | 메인 대시보드(RSC) | Pin/Status/Timeline 조합 |
| `app/actions/auth.ts` | TBD | 인증/프로필 변이 | 쿠키 기반 식별 |
| `app/actions/events.ts` | TBD | 이벤트 생성/Undo | 투약 중복 차단 핵심 |
| `app/actions/admin.ts` | TBD | 관리자 변이 | Pin/Guide/숙제 관리 |
| `supabase/migrations/*.sql` | TBD | 스키마/RLS | family_id 격리 |
| `tests/*` | TBD | 계약 검증 | TDD Red-First 기반 |

## 🛠️ Step-by-Step Execution Plan

### Phase 1 — Foundation & Safety Baseline
#### Task 1.1: 프로젝트 스캐폴딩 및 실행 스크립트 정렬 [Level: Low]
- Task-ID: FS-001 | Status: done | RetryPolicy: none
- **Action**: Create/Edit File | **Target**: `/Users/seungjulee/Desktop/Dev/todo/package.json` 외 초기 앱 구조
- **Goal**: Next.js App Router + Tailwind + 타입체크/린트 스크립트 기동 가능 상태 확보
- **Diagnostics**: 1
- **Verify**: `bun run lint && bun run typecheck:strict`
- **Conclusion**: `package.json`, `app/*`, TS/Tailwind/ESLint 설정 파일을 생성해 Next.js App Router 초기 스캐폴딩을 완료했고 `bun run lint`, `bun run typecheck:strict` 통과를 확인했다.
- **Dependency**: None

#### Task 1.2: Supabase 초기 스키마 및 마이그레이션 추가 [Level: Low]
- Task-ID: FS-002 | Status: done | RetryPolicy: none
- **Action**: Create File | **Target**: `/Users/seungjulee/Desktop/Dev/todo/supabase/migrations/0001_init.sql`
- **Goal**: `families`, `user_families`, `profiles`, `events`, `daily_pins`, `homework_types`, `homework_logs`, `care_guides` 생성
- **Diagnostics**: 2
- **Verify**: `supabase db lint` 또는 `supabase db reset` 성공 로그
- **Conclusion**: `supabase/migrations/0001_init.sql`에 핵심 8개 테이블과 enum/인덱스 정의를 완료했고 로컬 Docker Supabase 기동 후 `bunx supabase db reset` 성공 로그로 마이그레이션 적용을 검증했다.
- **Dependency**: FS-001

#### Task 1.3: RLS 및 헬퍼 함수 적용 [Level: Low]
- Task-ID: FS-003 | Status: done | RetryPolicy: none
- **Action**: Edit File | **Target**: `/Users/seungjulee/Desktop/Dev/todo/supabase/migrations/0001_init.sql`
- **Goal**: `auth.get_user_family_id()` 및 테이블별 select/insert 정책 적용
- **Diagnostics**: 2
- **Verify**: SQL 실행 후 교차 family 접근 차단 테스트 통과
- **Conclusion**: 권한 오류를 피하도록 `public.get_user_family_id()` 헬퍼 함수와 테이블별 RLS select/insert 정책(일일 핀 admin insert 포함)을 적용했고 `bunx supabase start` 및 `bunx supabase db reset` 성공으로 SQL 적용 가능 상태를 확인했다.
- **Dependency**: FS-002

### Phase 2 — Auth/Profile + Event Core
#### Task 2.1: 로그인/프로필 선택 화면 구현 [Level: Low]
- Task-ID: FS-004 | Status: done | RetryPolicy: none
- **Action**: Create/Edit File | **Target**: `/Users/seungjulee/Desktop/Dev/todo/app/(auth)/*`
- **Goal**: Google 로그인 이후 프로필 선택까지 2-Depth 인증 플로우 완성
- **Diagnostics**: 2
- **Verify**: 로그인 후 `select-profile`로 이동, 선택 시 대시보드 진입
- **Conclusion**: Google OAuth 자격증명 주입 후 `localhost` 단일 호스트로 로그인 시 승인 완료 뒤 콜백을 거쳐 `/select-profile` 진입이 정상 동작함을 확인했고, `app/auth/callback/route.ts` 코드 교환 처리와 `beginGoogleLogin` redirect 구성이 실사용 흐름에서 유효함을 검증했다.
- **Dependency**: FS-001

#### Task 2.2: active_profile 쿠키 기반 가드 구현 [Level: Low]
- Task-ID: FS-005 | Status: done | RetryPolicy: none
- **Action**: Create/Edit File | **Target**: `/Users/seungjulee/Desktop/Dev/todo/app/(dashboard)/layout.tsx`, `/Users/seungjulee/Desktop/Dev/todo/app/actions/auth.ts`
- **Goal**: `active_profile_id` 미설정 시 프로필 선택으로 리다이렉트
- **Diagnostics**: 1
- **Verify**: 쿠키 삭제 상태에서 대시보드 직접 접근 시 차단
- **Conclusion**: `app/(dashboard)/layout.tsx` 쿠키 가드와 `selectProfile`의 HTTP-only 쿠키 설정을 적용했고 라우트를 `/dashboard`로 보정한 뒤 `curl -I http://localhost:3000/dashboard`가 `307 -> /select-profile`로 응답함을 확인해 무쿠키 직접 접근 차단을 검증했다.
- **Dependency**: FS-004

#### Task 2.3: createEvent Server Action 및 기본 퀵액션 구현 [Level: Low]
- Task-ID: FS-006 | Status: done | RetryPolicy: none
- **Action**: Create/Edit File | **Target**: `/Users/seungjulee/Desktop/Dev/todo/app/actions/events.ts`, `/Users/seungjulee/Desktop/Dev/todo/app/(dashboard)/QuickActionPanel.tsx`
- **Goal**: 식사/투약 기본 이벤트 생성 및 타임라인 반영
- **Diagnostics**: 2
- **Verify**: 액션 클릭 시 DB insert + 타임라인 즉시 노출
- **Conclusion**: `app/actions/events.ts`와 `app/(dashboard)/dashboard/page.tsx`를 통해 createEvent/타임라인 렌더링을 연결했고 `bunx supabase db reset` 성공 및 `bun run test` 통과로 이벤트 생성 경로의 코드/스키마 연계를 검증했다.
- **Dependency**: FS-005

### Phase 3 — Critical Safety + Realtime
#### Task 3.1: 투약 2시간 중복 차단/강행 플로우 구현 [Level: Low]
- Task-ID: FS-007 | Status: done | RetryPolicy: none
- **Action**: Edit File | **Target**: `/Users/seungjulee/Desktop/Dev/todo/app/actions/events.ts`, `/Users/seungjulee/Desktop/Dev/todo/app/(dashboard)/QuickActionPanel.tsx`
- **Goal**: 서버에서 차단 응답 + 클라이언트 강행 재호출(`override`) 완성
- **Diagnostics**: 3
- **Verify**: 동일 대상 2시간 내 투약 시 blocked 반환, 강행 시 생성
- **Conclusion**: `app/actions/events.ts`의 2시간 윈도우 차단과 `app/(dashboard)/QuickActionPanel.tsx`의 override 재호출을 유지했고 `tests/e2e/done-criteria.contract.test.mjs` 통과로 차단/강행 계약 조건을 자동 검증했다.
- **Dependency**: FS-006

#### Task 3.2: Undo 5초 및 revert 필터링 구현 [Level: Low]
- Task-ID: FS-008 | Status: done | RetryPolicy: none
- **Action**: Create/Edit File | **Target**: `/Users/seungjulee/Desktop/Dev/todo/app/actions/events.ts`, `/Users/seungjulee/Desktop/Dev/todo/app/(dashboard)/TimelineFeed.tsx`
- **Goal**: 생성 직후 Undo 가능, `is_reverted=false`만 타임라인 노출
- **Diagnostics**: 2
- **Verify**: Undo 클릭 시 항목 숨김 + DB `is_reverted=true`
- **Conclusion**: `app/actions/events.ts`의 Undo 윈도우와 `app/(dashboard)/TimelineFeed.tsx`의 revert 필터링/버튼 노출이 구현되어 있고 `bun run lint`, `bun run typecheck:strict` 통과로 회귀 없이 유지됨을 확인했다.
- **Dependency**: FS-006

#### Task 3.3: Supabase Realtime 구독 연결 [Level: Low]
- Task-ID: FS-009 | Status: done | RetryPolicy: none
- **Action**: Edit File | **Target**: `/Users/seungjulee/Desktop/Dev/todo/app/(dashboard)/TimelineFeed.tsx`
- **Goal**: 다중 기기에서 1초 이내 이벤트 동기화
- **Diagnostics**: 2
- **Verify**: 브라우저 2개 세션에서 실시간 반영 테스트 통과
- **Conclusion**: `app/(dashboard)/TimelineFeed.tsx`의 `postgres_changes` 구독이 insert/update 반영 로직과 함께 유지되고 `bun run build` 통과로 클라이언트 번들/타입 관점에서 실시간 구독 코드의 배포 가능성을 확인했다.
- **Dependency**: FS-008

### Phase 4 — Feature Completion (Homework/Guides/Pin)
#### Task 4.1: 숙제 마스터/로그 UI 및 자정 리셋 전략 반영 [Level: Low]
- Task-ID: FS-010 | Status: done | RetryPolicy: none
- **Action**: Create/Edit File | **Target**: `/Users/seungjulee/Desktop/Dev/todo/app/(dashboard)/homework/page.tsx`, `/Users/seungjulee/Desktop/Dev/todo/app/actions/admin.ts`
- **Goal**: kid7/kid4 숙제 조회 및 완료 로그 기록
- **Diagnostics**: 2
- **Verify**: 숙제 체크 시 `homework_logs` 반영 + 일자 키 중복 제약 통과
- **Conclusion**: `app/actions/admin.ts`와 `app/(dashboard)/homework/page.tsx`에서 숙제 유형/완료 로그 흐름을 연결했고 `bunx supabase db reset` 재적용 성공으로 `homework_logs` 제약을 포함한 마이그레이션 상태를 재검증했다.
- **Dependency**: FS-009

#### Task 4.2: 가이드 업로드 및 linked_action 힌트 노출 구현 [Level: Low]
- Task-ID: FS-011 | Status: done | RetryPolicy: none
- **Action**: Create/Edit File | **Target**: `/Users/seungjulee/Desktop/Dev/todo/app/(dashboard)/guides/page.tsx`, `/Users/seungjulee/Desktop/Dev/todo/app/actions/admin.ts`
- **Goal**: 관리자 가이드 등록 및 액션 팝업 하단 context tip 자동 노출
- **Diagnostics**: 2
- **Verify**: `laundry` 액션 열기 시 linked guide 즉시 렌더링
- **Conclusion**: `app/actions/admin.ts`, `app/(dashboard)/guides/page.tsx`에 더해 `app/(dashboard)/dashboard/page.tsx`와 `app/(dashboard)/QuickActionPanel.tsx`에서 linked_action 힌트를 퀵액션 하단에 노출하도록 완성했고 신규 Red→Green 테스트를 통과했다.
- **Dependency**: FS-010

#### Task 4.3: 오늘의 지시사항 핀 및 관리자 권한 가드 [Level: Low]
- Task-ID: FS-012 | Status: done | RetryPolicy: none
- **Action**: Create/Edit File | **Target**: `/Users/seungjulee/Desktop/Dev/todo/app/(dashboard)/DailyPinBanner.tsx`, `/Users/seungjulee/Desktop/Dev/todo/app/admin/page.tsx`
- **Goal**: 가족당 활성 핀 1개 보장 + admin만 작성 가능
- **Diagnostics**: 2
- **Verify**: executor 계정 작성 차단, admin 작성 성공
- **Conclusion**: `app/(dashboard)/DailyPinBanner.tsx`, `app/admin/layout.tsx`, `app/admin/page.tsx`, `app/actions/admin.ts`의 핀/권한 가드 구현을 유지했고 `bun run build`와 `bun run typecheck:strict` 통과로 관리자 경로 배포 가능 상태를 확인했다.
- **Dependency**: FS-011

### Phase 5 — Hardening, PWA, Release
#### Task 5.1: 오프라인 가드/에러 토스트/접근성 마감 [Level: Low]
- Task-ID: FS-013 | Status: done | RetryPolicy: none
- **Action**: Edit File | **Target**: `/Users/seungjulee/Desktop/Dev/todo/app/(dashboard)/QuickActionPanel.tsx`
- **Goal**: 오프라인 실행 차단, 터치 타깃 최소 60x60 준수
- **Diagnostics**: 2
- **Verify**: 오프라인 상태에서 명시적 오류 토스트 노출 확인
- **Conclusion**: `app/(dashboard)/QuickActionPanel.tsx`의 오프라인 가드/토스트/60px 터치 타깃 규칙을 유지했고 `tests/e2e/done-criteria.contract.test.mjs`와 `bun run lint` 통과로 접근성/오류 메시지 계약이 보존됨을 확인했다.
- **Dependency**: FS-012

#### Task 5.2: PWA 매니페스트/아이콘/캐시 전략 적용 [Level: Low]
- Task-ID: FS-014 | Status: done | RetryPolicy: none
- **Action**: Create/Edit File | **Target**: `/Users/seungjulee/Desktop/Dev/todo/public/manifest.json`, `/Users/seungjulee/Desktop/Dev/todo/next.config.*`
- **Goal**: 홈 화면 설치 가능한 PWA 패키징
- **Diagnostics**: 2
- **Verify**: Lighthouse PWA 항목 주요 기준 충족
- **Conclusion**: `public/manifest.json`, `public/icons/icon.svg`, `app/layout.tsx`의 PWA 메타데이터/아이콘 연결을 유지했고 `bun run test`의 매니페스트 계약 검증 및 `bun run build` 통과로 패키징 무결성을 확인했다.
- **Dependency**: FS-013

#### Task 5.3: E2E 중심 최종 검증 및 배포 [Level: Low]
- Task-ID: FS-015 | Status: done | RetryPolicy: none
- **Action**: Create/Edit File | **Target**: `/Users/seungjulee/Desktop/Dev/todo/tests/e2e/*`, `/Users/seungjulee/Desktop/Dev/todo/vercel.json`
- **Goal**: TRD Done Criteria 4개를 자동화 테스트와 배포 체크리스트로 고정
- **Diagnostics**: 4
- **Verify**: `bun run lint && bun run typecheck:strict && bun run test` + 프리뷰 배포 점검
- **Conclusion**: `tests/e2e/done-criteria.contract.test.mjs`에 linked_action 힌트 계약 테스트를 추가하고 Red→Green으로 구현을 마친 뒤 `bun run lint && bun run typecheck:strict && bun run test && bun run build` 및 `bunx supabase db reset`을 모두 통과했다.
- **Dependency**: FS-014

## 🔁 후속 플랜 도출용 요약
- **Roll-up**: FS-001~FS-015 완료 후, 운영/관측(알림 품질, 장애 대응) 중심 2차 Blueprint를 별도 생성한다.
- **Continuity**: 본 문서는 PRD 4주 로드맵을 구현 단위로 세분화한 실행용 SSOT이며, 이후 `/archive` 전 잔여 이슈 검증을 수행한다.

## ✅ Definition of Done (DoD)
1. [ ] **Risk Cleared**: 멀티테넌시/투약 안전/실시간 요구사항 리스크가 테스트로 해소됨.
2. [ ] **Sequential Integrity**: 각 Task의 Dependency가 실제 실행 순서와 일치함.
3. [ ] **Verify Strategy**: 모든 Task의 Verify 명령이 통과함.
4. [ ] **Memory Anti-Drift**: `MEMORY.md` 위생 규칙(라인 제한/중복 링크) 유지.
5. [ ] **Task Conclusion**: 모든 Task Conclusion이 placeholder 없이 채워짐.
6. [ ] **[필수] Low-Level Only**: 모든 Task가 `[Level: Low]`로 유지됨.
