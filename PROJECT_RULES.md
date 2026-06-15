# PROJECT_RULES.md — Policy Hub

## 0. Purpose

본 문서는 프로젝트 정책·스택·품질·아키텍처 제약(What)을 정의한다.

에이전트 실행 방식은 `AGENTS.md`를 따른다. 세부 규칙 모듈 색인은 `.agents/registry/RULE_INDEX.md`를 참고한다.

**중요**: 모든 기능 구현 및 수정 시 반드시 `Reference Index`의 관련 명세(Specs)를 먼저 읽어야 하며, 명세는 이 정책 문서와 함께 프로젝트의 핵심 SSOT로 취급된다.

---

# 1. Architecture Rules

## MUST
- 본 문서 §8(Critical Logic)·`docs/specs/PRD.md`·`TRD.md`에 정의한 **가족 데이터 격리·투약 안전·인증/프로필** 등 비기능 경계를 코드로 반영한다.
- 데이터 접근·변경은 **서버**(Server Actions·Route Handlers·서버 유틸)에서 `family_id`·`active_profile_id` 문맥을 검증한 뒤에만 수행한다 (구현 SSOT: 본 문서 §8).
- 동작·계약을 바꾸면 `tests/e2e` 및 관련 스펙·본 문서 §8을 동기화한다.

## MUST NOT
- 다른 가족 `family_id`로 이어지는 조회·쓰기 경로(멀티테넌시 붕괴).
- 민감 제약(투약 간격 등)을 **클라이언트만** 믿도록 두는 설계.
- 스펙·계약 없는 contract-breaking 변경.

---

# 2. Stack & Runtime Policy

## 단일 앱 스택 (FamilySync MVP)
- **프레임워크**: Next.js(App Router), React, TailwindCSS — 소스는 주로 `app/`·`lib/`·`db/` (`README.md` 디렉토리 맵).
- **데이터**: Turso(libSQL) + Drizzle; 마이그레이션은 `db/migrations/*.sql`, 적용 절차는 `README.md`·`bun run db:migrate`(`scripts/migrate-turso.mjs`).
- **Turso 마이그레이션 적용(에이전트)**: `db/migrations/`에 SQL을 **추가하거나 내용을 바꾼 커밋/작업**이면, 에이전트는 사용자에게 실행을 넘기지 않고 **`bun run db:migrate`를 직접 실행**해 적용·로그까지 확인한다(`TURSO_*`는 스크립트가 `.env`→`.env.local`→`.env.vercel.dev`→`.env.vercel.prod` 순으로 로드). **복수 Turso**(개발 DB와 운영 DB URL이 env로 분리)인 경우, 한 번의 실행은 **현재 로드되는 URL 한 곳**에만 적용되므로, 운영까지 필요하면 해당 env를 기준으로 **재실행**하거나 사용자에게 적용 대상만 한 줄 확인한다.
- **인증**: Auth.js + Google OAuth (세션·쿠키 정책은 본 문서 §8.3).
- **본 레포는** 루트 `docker-compose.dev.yml`·`./run_dev.sh` 기반 로컬 풀스택을 두지 않는다(과거 템플릿 문구는 무시).

## Workspace File I/O Policy
- 워크스페이스 파일 읽기·쓰기·목록·검색은 Built-in 파일 도구(`Read`, `Write`, `Grep`, `Glob`, `SemanticSearch`)를 우선 사용한다.
- 위 경로로 처리 불가한 경우에만 Shell 접근을 허용한다.

## Standard Runtime (로컬)
- 앱: `bun run dev` (`package.json`)
- 검증: `README.md`의 검증 명령 + `AGENTS.md` §4 Verification Matrix + `just ci` (`justfile`)

---

# 3. Verification & Quality Policy

## 3.1 Plan & TDD Enforcement
- **Plan-First**: 모든 설계 및 복합 작업은 **통합 심층 설계(Unified Deep Planning, `/plan`)** 워크플로우 선행 필수. 이는 진단(Diagnose), 아키텍처 심화(Improve), 태스크 분해(Plan)를 단일 문서로 통합한 표준입니다. 특히 설계 단계에서 완벽한 근거 확보를 위한 **코드 실행 및 연구(Research)**를 적극 권장하며, 무결점 순차성을 가진 `[Level: Low]` 태스크 분해를 지향한다. 상세 절차는 `AGENTS.md` 참조.
- **TDD Red-First**: 구현 전 실패 테스트 작성 및 실행 로그 확인 필수. `Red -> Green -> Refactor` 사이클 준수.

## 3.2 Quality Gates
- **Strict Lint/Type**: `bun run lint`(ESLint) 및 `bun run typecheck:strict`(`tsc --noEmit`) 통과 필수.
- **No Bypass**: 검증 통과를 위한 severity 하향(`error -> warn`)이나 gate 우회 금지.
- **TS/React**: `habitual any`·무근거 `ts-ignore`·소문자 JSX 컴포넌트명 금지(§4 TypeScript & Frontend Rules).
- **Auth Guard**: 인증 실패 시 `throw new Error()` 금지. `@/auth`의 `unauthorized()` 함수 사용.

---

# 4. TypeScript & Frontend Rules

## MUST
- `bun run typecheck:strict`
- PascalCase React components & filenames
- reusable UI extraction & responsive layouts
- `unknown` 타입 사용 시 Type Guard 를 통한 Narrowing 선행
- **Server/Client 분리 규칙 (P-6)**: Shared UI 컴포넌트는 기본적으로 `use client` 선언 + props 기반 렌더링. Server Component 에서 Client Component 로 전달할 데이터가 있고, Client Component 가 상태 관리/상호작용이 필요하면 분리.

## MUST NOT
- habitual `any`
- unjustified ts-ignore
- lowercase JSX components
- monolithic TSX components

---

# 5. Documentation & Reporting Integrity

## 5.1 Documentation
- **SSOT Preservation**: `README.md` 디렉토리 맵, `docs/plans` 로드맵 정보를 온전히 유지.
- **No Truncation**: 미래 태스크(`todo`/`pending`)를 임의 삭제하여 로드맵을 파괴하는 행위 금지.
- **Link Validity**: 내부 링크 및 참조 정합성 유지.
- **Blueprint Edit Safety**: `edit` 도구 사용 시 `oldString`이 파일 내에서 정확히 1회 등장하는지 확인. 중복 시 Diagnostics/Verify/Dependency 라인을 포함한 넓은 컨텍스트 사용.

## 5.2 Communication & Reporting
- **한국어 우선**: 모든 응답·요약·보고서는 한국어로 작성. 영문-only 리포트 금지.
- **기본 간결**: `AGENTS.md` §10 Reporting Protocol 준수. 대화 전 구간 동일하게 짧게 보고; 상세는 실패·블로커·명시 요청 시에만.

---

# 6. SSOT Hub

| Purpose | SSOT |
|---|---|
| Project overview | `README.md` |
| Execution protocol | `AGENTS.md` |
| Project policy | `PROJECT_RULES.md` |
| Critical logic | 본 문서 §8 (Critical Logic) |
| Requirements contract | `tests/` |
| Session memory | `.agents/memory/` |

---

# 8. Critical Logic — Non-Negotiables & Architecture Decisions

본 섹션은 코드와 운영에서 깨지면 안 되는 경계와 이미 확정된 아키텍처 결정만 기록한다. 세부 구현은 `docs/specs/PRD.md`·`TRD.md`를 따른다.

---

## 8.1 제품 불변 조건 (Non-Negotiables)

1. **가족 데이터 격리**: 모든 업무 데이터는 **하나의 `family_id`** 안에서만 읽고 쓴다. 다른 가족 행에 도달하는 코드 경로는 버그로 간주한다.
2. **투약 안전**: 동일 `target`(아이 구분)에 대해 **최근 2시간 이내** 비-revert 투약 이벤트가 있으면, 서버는 기본적으로 생성을 거부한다. 예외는 **`metadata.override === true`** 일 때만 허용한다.
3. **감사 가능한 타임라인**: 이벤트는 되도록 **삭제하지 않고** `is_reverted`로 무효화한다. 목록·집계는 revert되지 않은 행만 포함한다.
4. **2단계 신원**: "구글 계정 로그인"과 "어떤 가족 프로필로 행동하는지"를 분리한다. 후자는 **`active_profile_id` 쿠키**(HTTP-only)로만 식별한다.

---

## 8.2 멀티테넌시·신원 (구현 SSOT)

- **저장소**: Turso(libSQL) + Drizzle. DB에 Postgres RLS는 없으며, **경계는 서버**(Server Actions·라우트)에서 강제한다.
- **사용자 → 가족**: `user_families.user_id`로 현재 로그인 사용자의 `family_id`를 결정한다. (`lib/auth/session.ts`의 `getCurrentFamilyId`)
- **프로필 문맥**: `getActiveProfileContext()`는 (1) 세션 `userId`, (2) `active_profile_id` 쿠키, (3) `profiles.id`가 해당 `family_id`에 속하는지 **동시에** 만족할 때만 유효하다. 하나라도 어긋나면 `null`·에러 처리로 끝낸다.
- **첫 로그인 시드**: `ensureDefaultFamilyForUser`는 `user_families`가 없을 때만 `families`·멤버십·기본 프로필 2명(admin/executor)을 만든다. 중복 호출은 멱등이다.

---

## 8.3 인증·세션 (Auth.js)

- **프로바이더**: Google OAuth. 세션은 **DB 어댑터**를 사용한다(Auth.js 표준 테이블: `users`, `accounts`, `sessions`, `verificationTokens` 등).
- **`AUTH_URL` 정책**: Vercel Preview에서는 `instrumentation.ts`가 `AUTH_URL`/`NEXTAUTH_URL`을 제거해 **현재 호스트** 기준 콜백을 쓴다. 로컬에서 `NEXT_PUBLIC_SITE_URL`이 localhost인데 `AUTH_URL`만 프로덕션 도메인이면 동일하게 제거해 **redirect 불일치**를 막는다.
- **운영 점검**: `GET /api/health`는 비밀을 노출하지 않고, 필수 env 존재·DB ping·핵심 테이블(Auth 어댑터 + 앱 스키마의 `quick_actions` 등) 존재 여부를 반환한다. `tables` 중 하나라도 `false`이면 Auth/세션·대시보드 경로가 실패할 수 있으므로 **마이그레이션 미적용**을 최우선 의심한다.
- **퀵 액션 장애 관측**: 대시보드 SSR에서 `quick_actions` 시드·조회가 실패하면 사용자에게는 마이그레이션 안내 배너만 노출하고, 민감 정보 없이 `console.error("[dashboard] quick_actions load failed", { familyId, message, code? })` 형태로 **서버 로그에만** 원인을 남긴다 (`app/(dashboard)/dashboard/page.tsx`).

---

## 8.4 이벤트 모델·타임라인

- **스키마 요지**: `events`는 `family_id`, `profile_id`, `action_type`, `target`, `metadata`(JSON 문자열), `is_reverted`, `created_at`을 가진다.
- **날짜 열 배치**: 대시보드 3열(어제/오늘/내일) 및 주 단위 이동은 **`metadata.timelineDate`** (`YYYY-MM-DD`)가 있으면 그날짜에 붙이고, 없으면 `created_at`의 **로컬 자정 기준 날짜**로 붙인다. (`lib/timeline-date.ts`의 `getEventDisplayDateKey`)
- **3열 헤더·주말 구분**: 각 열 상단에 로컬 `YYYY-MM-DD`와 브라우저 **`ko-KR` 긴 요일**을 표시하며, **어제/오늘/내일** 상대 문구가 있으면 함께 노출한다. **토·일** 열은 시각 구분용 옅은 배경을 쓴다(법정 공휴일은 별도 캘린더 없이 미반영).
- **대시보드 초기 타임라인 윈도우**: 서버 초기 로드는 `lib/dashboard-timeline.ts`의 **`TIMELINE_LOOKBACK_MS`·`TIMELINE_EVENT_LIMIT`** 로 범위·행 수를 제한한다(성능·Turso RTT). 과거 구간을 더 쓰면 별도 조회·페이지네이션으로 확장한다.
- **투약 상세 메타**: `action_type === "medication"`일 때 구조화 필드는 **`metadata.medication`** 에 둔다 (`subject`: `kid7`(주원이) \| `kid4`(승원이) \| `family`, `items[]`: 약 이름·용량·단위, 선택 `note`). 저장 전 검증은 `lib/event-metadata.ts`의 `normalizeAndValidateEventMetadata`가 수행한다. UI 기록은 `RecordEventModal`을 경유한다.
- **등·하원 메타**: `action_type`이 **`school_dropoff`** 또는 **`school_pickup`** 일 때 **`metadata.schoolRun`** 에 `child`(`kid7`=주원이 \| `kid4`=승원이)와 선택 **`place`**(장소 문자열)를 둔다. **`events.target`** 은 `schoolRun.child` 와 동일하게 저장해 타임라인·집계에서 대상이 일치하도록 한다.
- **투약 차단 쿼리**: `action_type = 'medication'`, 동일 `family_id`·`target`, `is_reverted = false`, `created_at >= now - 2h` 조건으로 최근 1건을 조회한다. (`app/actions/events.ts`) 모달에서 확정한 **투약 대상**과 동일한 값이 `events.target`으로 저장되어야 차단 키가 일치한다.
- **대시보드 RSC 갱신**: `events`를 변경하는 Server Action(`createEvent`, `undoEvent` 등)은 성공 경로에서 **`revalidatePath("/dashboard")`** 를 호출한다. 상단 퀵 액션 기록 후 `router.refresh()`만으로 타임라인이 비어 보이던 현상은, 동일 페이지의 다른 변이(예: `completeHomework`)에만 revalidate가 있을 때 재현될 수 있으므로 **이벤트 변이에도 동일 패턴**으로 맞춘다.

---

## 8.5 Undo (실행 취소)

- **방식**: `is_reverted = true` 업데이트. 물리 삭제 금지.
- **권한·범위**: 동일 `family_id`에 속한 이벤트만 대상으로 한다.
- **시간 윈도우 (액션별)**: `lib/event-undo-policy.ts`의 `getUndoWindowMsForActionType`가 단일 SSOT이다.
  - **투약** (`action_type === "medication"`): 생성 시각 기준 **30분**.
  - **그 외** (식사·등하원 등 저위험): 생성 시각 기준 **24시간**.
  서버 `undoEvent`와 타임라인 UI 노출이 동일 정책을 따른다.

---

## 8.6 권한 모델

- **`profiles.role`**: `admin` | `executor`. Pin·숙제 설정 등 **관리자 전용 변이**는 서버에서 `admin`을 검증한다.
- **공동 관리자(선택)**: 환경변수 **`FAMILY_CO_ADMIN_EMAILS`**(쉼표·공백 등 구분, 이메일 대소문자 무시)에 등록된 Google 계정으로 **로그인(`signIn`)할 때**, 해당 사용자의 `family_id`에 속한 **`executor` 프로필은 `admin`으로 멱등 승격**된다. 가족 내 executor를 유지해야 하는 비관리자 프로필이 있으면 allowlist에 넣지 않는다. (`lib/auth/promote-co-admins.ts`)
- **숙제 유형**: 물리 삭제 대신 **`homework_types.is_active = false`** 로 숨긴다. 트래커 UI는 활성 행만 노출한다.
- **숙제 vs 이벤트 퀵 액션**: `quick_actions` 한 줄은 **`RecordEventModal` → `createEvent` → `events`** 흐름만 탄다. **일일 숙제 완료**의 SSOT는 **`homework_logs`** 이며 대시보드 숙제 바로가기는 **`completeHomework`** 를 호출한다(타임라인 이벤트와 혼동 금지). **`/admin` 편집 링크**는 활성 프로필이 **`profiles.role === "admin"`** 일 때만 UI에 노출한다.
- **루틴 체크리스트**(숙제와 별도): 반복해서 챙길 일의 마스터는 **`routine_items`**, 날짜별 완료는 **`routine_logs`** 가 SSOT이다. 완료 시 **`events.action_type === "routine_check"`** 및 **`metadata.routine`**(항목 id·제목)으로 타임라인에 남기며, 실행 취소는 숙제와 동일하게 로그와 불일치를 막기 위해 UI에서 비활성화한다.
- **실행자**: 퀵 액션·숙제 완료·타임라인 조회 등은 일반적으로 활성 프로필만 유효하면 된다(세부는 각 Server Action).

---

## 8.7 Daily Pin 제약

- **비즈니스 규칙**: 가족당 **활성(`is_active`) 핀은 최대 1개**. DB에는 부분 유니크 인덱스로 보강한다. (`TRD` 스키마 절 참고)

---

## 8.8 운영·보안 결정

- **일회성 마이그레이션 라우트 금지**: 운영 DB에 스키마를 맞추기 위해 **임시 관리자 HTTP 라우트를 배포했다가 두는 패턴**은 사용하지 않는다. 필요 시 로컬/CI에서 `npm run db:migrate` 등 **정식 경로**만 사용하고, 과거에 사용했다면 즉시 제거·계약 테스트로 잔존을 금지한다.
- **Turso `npm run db:migrate`**: `scripts/migrate-turso.mjs`가 **`.env` → `.env.local` → `.env.vercel.dev` → `.env.vercel.prod`** 를 읽어 `TURSO_*`를 주입한다(`node`는 Next처럼 자동 로드하지 않음). 적용한 `db/migrations/*.sql` 파일명은 **`_turso_applied_migrations`** 테이블에 기록되며, 이미 기록된 파일은 재실행하지 않는다. 메타가 비어 있으나 **`users` 테이블이 이미 있으면** 레거시 DB로 보고 `0000_initial.sql`만 기록상 적용 처리한 뒤 이후 파일만 실행한다. `0001_quick_actions.sql`은 **`CREATE TABLE IF NOT EXISTS` / `CREATE INDEX IF NOT EXISTS`** 로 재적용이 안전하다. `0002_drop_care_guides.sql`은 **`DROP TABLE IF EXISTS care_guides`** 로 레거시 테이블만 제거한다.
- **민감 파일**: `.env*`, 로컬 마이그레이션 시크릿(예: `.migrate-secret.local`), 로컬 전용 도구 심링크 등은 Git에 올리지 않는다.

---

## 8.9 검증 기준 (회귀 방지)

- **계약 테스트**: `tests/e2e/done-criteria.contract.test.mjs`가 투약 로직·대시보드 revalidate·타임라인·헬스·마이그레이션 금지 등 핵심 불변을 문자열/구조 레벨에서 검증한다. 이 테스트를 약화시키는 변경은 본 문서와 PRD/TRD를 동시에 갱신해야 한다.

---

## 8.10 변경 절차

1. 동작 변경이 **사용자 안전·데이터 격리·인증**에 관련되면 → PRD/TRD 또는 본 섹션에 먼저 근거를 남긴다.
2. Red → Green 테스트로 회귀를 고정한다.
3. `README.md`의 스택·배포 설명과 충돌하면 README를 정합화한다.

---

# 9. Reference Index

- **제품·기술 요구**: `docs/specs/PRD.md`, `docs/specs/TRD.md`
- **불변·운영 경계**: 본 문서 §8 (Critical Logic)
- **실행 프로토콜**: `AGENTS.md`, `justfile`, `README.md`
- **추가 명세**: `docs/specs/technical/` 등은 레포에 없을 수 있다 — 신규 도입 시 본 절과 SSOT 표를 함께 갱신한다.