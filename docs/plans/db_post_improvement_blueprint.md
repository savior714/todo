<!-- Language: ko -->

# 🗺️ Project Blueprint: DB 저장 방식 후속 개선 (마이그레이션·UI·정리)

## 문서 메타
- **Last Verified**: 2026-06-16 | **Tested Version**: Next.js 15 + Drizzle ORM v0.45.2 + Turso/libSQL
- **Reference**: `docs/specs/TRD.md` §3.2 (백엔드/데이터), `db/schema.ts`, `scripts/migrate-turso.mjs`
- **SSOT Check**: `db/schema.ts`(충돌 없음), `scripts/migrate-turso.mjs`(충돌 없음), `app/admin/page.tsx`(충돌 없음)
- **Project Status Link**: 신규 — `fix(db): [DATA-01]` 세션의 후속 작업
- **Priority**: 1
- **Labels**: fix, infrastructure
- **Architectural Goal**: DB 스키마 무결성 확보 + Admin UI 완성도 향상

## 📎 관련 명세

| 문서 | 범위 |
| :--- | :--- |
| `docs/specs/TRD.md` §3.2 | Turso + Drizzle ORM 스키마 관리 요구사항 |
| `docs/specs/TRD.md` §3.3 | 가족 단위 격리(Multi-tenancy) 및 권한 모델 |

## 📋 업무 요약 (협업용)

### 개요

FamilySync 의 DB 스키마에 추가한 UNIQUE 제약 2건(숙제 유형 중복 방지, 퀵 액션 버튼 중복 방지)을 실제 Turso DB 에 반영하고, Admin 페이지에 프로필 삭제 기능을 연결하여 orphan 레코드 문제를 방지합니다. 또한 마이그레이션 충돌 유발 파일을 정리하여 파이프라인을 청결하게 합니다.

### staff·경영에서 바뀌는 점

- 숙제 유형과 퀵 액션 버튼의 중복 입력이 DB 레벨에서 차단됨
- Admin 이 본인 프로필을 삭제할 수 있으며, 관련 기록이 함께 정리됨

### 끝났을 때 확인할 것

- `bun run db:migrate` 실행 시 UNIQUE 인덱스 생성 에러 없음
- Admin 페이지에 "프로필 삭제" 섹션이 표시됨
- `bun run lint` 와 `bun run typecheck:strict` 통과

## 🎯 Origin Intent

- **출처**: 직접 요청 (DB 저장 방식 체크 후속 작업)
- **원래 목적**: schema.ts 변경사항 중 실제 DB 스키마 변경이 필요한 항목을 마이그레이션으로 반영하고 Admin UI 를 완성함
- **완료 관찰**: Turso DB 에 UNIQUE 인덱스 생성, Admin 페이지에 프로필 삭제 버튼 표시

## ⚠️ Edge Case Trace

| 엣지 케이스 | 출처 | Task-ID / 범위 밖 | 비고 |
| :--- | :--- | :--- | :--- |
| 기존 Turso DB 에 UNIQUE 제약과 충돌하는 더티 데이터 존재 | Risk | PLAN-MIG-004 | 인덱스 생성 실패 시 롤백 전략 |
| 본인 프로필이 아닌 다른 프로필 삭제 시도 | Origin | PLAN-UI-001 | `deleteProfile()` 이 본인 ID 체크로 차단 |
| 마이그레이션 재실행 시 이미 적용된 파일 슂 | Risk | PLAN-MIG-002 | `migrate-turso.mjs` 가 메타 테이블로 추적 |
| Admin 페이지에 컴포넌트 추가 시 레이아웃 깨짐 | Origin | PLAN-UI-002 | 기존 섹션 패턴 복사하여 일관성 유지 |
| `0000_good_prism.sql` 제거 후 drizzle-kit regenerate 시 충돌 | 범위 밖 — 현재 세션 범위 외 | | 다음 세션에서 처리 |
| `0000_good_prism.sql` 이 마이그레이션 러너에 의해 중복 실행되어 테이블 충돌 발생 | Risk | PLAN-ORG-001 | `bootstrapLegacyApplied()` 가 `0000_initial.sql` 을 기록하지만 `0000_good_prism.sql` 은 별도 파일로 중복 CREATE TABLE 유발 |
| 프로필 삭제 시 foreign key 제약으로 events/daily_pins/homework_logs/routine_logs 삭제가 먼저 필요 | Origin | PLAN-UI-001 | `deleteProfile()` 이 transaction 내에서 FK 순서대로 삭제 (events → daily_pins → homework_logs → routine_logs → profiles) |
| 마이그레이션 중 Turso 연결 끊김 | Risk | PLAN-MIG-003 | `migrate-turso.mjs` 가 batch API 사용 — 부분 적용 시 메타 테이블에 일부만 기록됨. 재실행 시 skip 처리 |
| UNIQUE 인덱스 생성 시 대소문자 비교 차이 (SQLite) | 범위 밖 — SQLite 기본 동작 | | SQLite 는 기본 대소문자 불일치. Drizzle ORM 도 동일 — 추가 처리 불필요 |

## 🧭 Context Pre-read Gate (실행 전 필수)

> ⚠️ **에이전트 주의**: Blueprint 파일 생성 직후, `just plan-lint`를 돌리기 **전에** 반드시 아래 명령을 먼저 실행하여 마커를 주입하세요.
> `just plan-preread docs/plans/db_post_improvement_blueprint.md --write`

(planned: `just plan-preread docs/plans/db_post_improvement_blueprint.md --write`)

## 실행 순서·선행

| Phase | 설명 | 선행 |
| :--- | :--- | :--- |
| Phase 1 | UNIQUE 제약 마이그레이션 파일 생성 + 적용 | None |
| Phase 2 | Admin UI 에 프로필 삭제 버튼 연결 | None (Phase 1 과 병렬 가능) |
| Phase 3 | 마이그레이션 파일 정리 (선택 사항) | Phase 1 완료 후 |

## Diagnosis & Findings

- **현상**:
  - `db/schema.ts` 에 UNIQUE 제약 2건 추가했으나 Turso DB 에 실제 적용되지 않음
  - `app/actions/admin.ts` 에 `deleteProfile()` 구현되었으나 UI 에서 호출 안 함
  - `db/migrations/0000_good_prism.sql` 이 레거시 `0000_initial.sql` 과 충돌
- **근본 원인**:
  - `{ mode: "timestamp_ms" }` 변경은 ORM 클라이언트 설정이므로 마이그레이션 불필요하나, UNIQUE 제약은 실제 DB 스키마 변경이므로 별도 마이그레이션 파일 필요
  - `deleteProfile()` 은 Server Action 으로 정의만 되어 있고 Admin UI 에 삭제 버튼/페이지 연결 안 됨
  - `0000_good_prism.sql` 은 drizzle-kit generate 로 자동 생성된 전체 스키마 파일로 기존 수동 마이그레이션과 충돌

## Architectural Deepening

- **Seam**:
  - 마이그레이션: `scripts/migrate-turso.mjs` 가 `db/migrations/*.sql` 을 순차 적용 — 새 파일 추가 시 별도 러너 수정 불필요
  - Admin UI: `app/admin/page.tsx` 가 레이아웃, 클라이언트 컴포넌트가 콘텐츠 — 프로필 삭제 컴포넌트는 별도 파일로 분리
  - Server Action: `app/actions/admin.ts` 의 `deleteProfile()` 은 이미 구현됨 — UI 에서 import 만 하면 됨
- **Leverage**:
  - UNIQUE 제약 적용 → 중복 데이터 방지 (개발자 개입 없이 DB 레벨 보장)
  - 프로필 삭제 UI → Admin 기능 완성도 향상, orphan 방지

## Conceptual Sketch

```sql
-- db/migrations/0006_add_unique_constraints.sql
CREATE UNIQUE INDEX IF NOT EXISTS homework_types_family_child_title_unique_idx
  ON homework_types (family_id, child_group, title);

CREATE UNIQUE INDEX IF NOT EXISTS quick_actions_family_label_unique_idx
  ON quick_actions (family_id, label);
```

```typescript
// app/admin/profile-delete-section.tsx (개념)
"use client";
import { deleteProfile } from "@/app/actions/admin";

export function ProfileDeleteSection() {
  const handleDelete = async () => {
    if (!confirm("정말 삭제하시겠습니까?")) return;
    await deleteProfile(profileId);
  };
  return <section id="profile-delete-admin">...</section>;
}
```

## 🛡️ Risk & Strategy

- **Risk**: 마이그레이션 실행 시 기존 데이터 충돌 — **Strategy**: `IF NOT EXISTS` 사용 + 스테이징에서 먼저 테스트
- **Risk**: 프로필 삭제 시 의도치 않은 데이터 손실 — **Strategy**: `confirm()` + 본인 프로필만 삭제 가능 제한
- **Risk**: `0000_good_prism.sql` 제거 시 drizzle-kit 재생성 — **Strategy**: 다음 세션에서 `drizzle-kit generate` 로 새 파일 생성

## 🔍 Impact Scope

| 수정 대상 | 역할 |
| :--- | :--- |
| `db/migrations/0006_add_unique_constraints.sql` | DB 스키마 변경 — UNIQUE 인덱스 2건 |
| `app/admin/profile-delete-section.tsx` | Admin UI 컴포넌트 — 프로필 삭제 UI |
| `app/admin/page.tsx` | Admin 페이지 레이아웃 — 새 섹션 추가 |
| `db/migrations/0000_good_prism.sql` | 마이그레이션 파일 — git 에서 제거 (선택) |

## Agent Completion Contract

본 Blueprint Task 를 실행하는 세션(`@PLAN_* task N.M`, `/plan` 후 구현)에서 사용자가 별도 금지하지 않는 한, 아래는 **해당 Task 범위에 포함**된다.

| 허용 | 금지 |
| :--- | :--- |
| `just plan-task-close` CLI 를 사용한 Task `Status`·`Conclusion` 자동 갱신 | 텍스트 에디터(replace 등)로 본 파일 Task 상태 In-place 직접 수정 |
| Task `Verify` 직후 `just plan-lint docs/plans/db_post_improvement_blueprint.md` | Conclusion 없이 `Status: done` 처리 |
| **Closeout Task**에서 Roll-up 줄 편집 | Closeout Task **외** Blueprint Task `Status`/`Conclusion` 직접 수정 |
| Task Goal에 명시된 Target·명세 동반 수정 | ROADMAP·다른 Blueprint 대량 수정 |
| (동결 중) `just plan-task-close`·Closeout Roll-up | Task 추가·삭제·Goal/Target/Dependency/Trace **구조 변경** · 실행 중 AskQuestion 범위 재협상 |

**실행 동결**: `plan-lint` PASS 후 사용자가 **전체 진행**을 요청하면 Blueprint 구조는 고정. 표준 패턴 — 파일 작성 완료 → `@PLAN_*` 전체 순차 실행 → Closeout. 상세: `.agents/workflows/plan.md` §Blueprint 실행 동결.

**Task 완료 정의**: `Verify` exit 0 → `just plan-task-close` 실행 → `just plan-lint` PASS. **플랜 전체 완료**는 마지막 Closeout Task 까지 포함한다.

## 🛠️ Step-by-Step Execution Plan

> **에이전트 스코프**: 사용자가 Blueprint **전체 실행**을 요청하면 Task 를 **Dependency 순**으로 1 개씩만 진행한다. Blueprint Task 구조는 **동결** — `plan-task-close`·Closeout Roll-up 만 예외. `Verify` PASS → `just plan-task-close plan=... task=... conclusion="..."` → `just plan-lint docs/plans/db_post_improvement_blueprint.md` → 다음 Task. **마지막 Closeout Task**에서 Roll-up 후 `just plan-close` Verify.

### Phase 0 — Edge case gap audit

#### Task 0.1: Edge Case Trace 갭 감사 및 보완 Task 반영 [Level: Low]
- Task-ID: [PLAN-MIG-001] | Status: done | Priority: 1 | Labels: plan | RetryPolicy: none
- **Pre-read**: 이 Task 만 — `write`/`patch` 전 **전부** Read
  1. `[rule]` `.agents/workflows/plan.md`
  2. `[rule]` `.agents/core/code_quality_lifecycle.md`
- **Action**: Edit File | **Target**: `docs/plans/db_post_improvement_blueprint.md`
- **Closeout**: `docs/plans/db_post_improvement_blueprint.md` (Task PLAN-MIG-001 `Conclusion`·`Status`)
- **Goal**: Origin Intent 와 Risk 를 근거로 Edge Case Trace 표를 채우고, 인범위·미매핑 엣지마다 Atomic Task 를 추가하거나 범위 밖 사유를 업무 요약에 기록한다.
- **Diagnostics**: 0
- **Verify**: `just plan-lint docs/plans/db_post_improvement_blueprint.md`
- **Conclusion**: Edge Case Trace 4건 추가 — `0000_good_prism.sql` 마이그레이션 중복 실행 리스크, 프로필 삭제 FK 순서, Turso 연결 끊김 재실행 처리, SQLite 대소문자 비교 기본 동작 명시. plan-lint PASS.
- **Dependency**: None

### Phase 1 — UNIQUE 제약 마이그레이션 파일 생성 + 적용

#### Task 1.1: 마이그레이션 SQL 파일 생성 [Level: Low]
- Task-ID: [PLAN-MIG-002] | Status: done | Priority: 1 | Labels: fix, database | RetryPolicy: none
- **Pre-read**: 이 Task 만 — `write`/`patch` 전 **전부** Read
  1. `[code]` `scripts/migrate-turso.mjs` (라인 1-50: 파일 읽기 패턴 및 메타 테이블 확인)
  2. `[code]` `db/migrations/0005_events_duplicate_guard.sql` (기존 마이그레이션 형식 참고)
- **Action**: Write File | **Target**: `db/migrations/0006_add_unique_constraints.sql`
- **Closeout**: `docs/plans/db_post_improvement_blueprint.md` (Task PLAN-MIG-002 `Conclusion`·`Status`)
- **Goal**: UNIQUE 인덱스 2건 생성 SQL 파일 작성 — `homework_types_family_child_title_unique_idx`, `quick_actions_family_label_unique_idx`
- **Diagnostics**: 0
- **Verify**: `cat db/migrations/0006_add_unique_constraints.sql`
- **Conclusion**: `db/migrations/0006_add_unique_constraints.sql` 생성 — homework_types(family_id, child_group, title) UNIQUE 인덱스, quick_actions(family_id, label) UNIQUE 인덱스 IF NOT EXISTS 포함.
- **Dependency**: PLAN-MIG-001

#### Task 1.2: 마이그레이션 실행 전 스테이징 검증 [Level: Low]
- Task-ID: [PLAN-MIG-003] | Status: done | Priority: 1 | Labels: fix, database | RetryPolicy: none
- **Pre-read**: 이 Task 만 — `write`/`patch` 전 **전부** Read
  1. `[code]` `scripts/migrate-turso.mjs` (라인 50-100: 에러 핸들링 및 메타 테이블 업데이트 로직 확인)
- **Action**: Bash | **Target**: `bun run db:migrate`
- **Closeout**: `docs/plans/db_post_improvement_blueprint.md` (Task PLAN-MIG-003 `Conclusion`·`Status`)
- **Goal**: 마이그레이션 실행 — 에러 메시지 확인 및 `_turso_applied_migrations` 메타 테이블 업데이트 확인
- **Diagnostics**: 0
- **Verify**: `bun run db:migrate`
- **Conclusion**: `bun run db:migrate` 실행 성공 — 0000~0005 skip(이미 적용됨), 0006_add_unique_constraints.sql 적용 완료. `_turso_applied_migrations` 메타 테이블 업데이트 확인.
- **Dependency**: PLAN-MIG-002

#### Task 1.3: 마이그레이션 적용 후 스키마 검증 [Level: Low]
- Task-ID: [PLAN-MIG-004] | Status: done | Priority: 1 | Labels: fix, database | RetryPolicy: none
- **Pre-read**: 이 Task 만 — `write`/`patch` 전 **전부** Read
  1. `[code]` `db/schema.ts` (라인 164-224: UNIQUE 제약 추가된 테이블 정의 확인)
- **Action**: Bash | **Target**: Turso DB 또는 로컬 libSQL
- **Closeout**: `docs/plans/db_post_improvement_blueprint.md` (Task PLAN-MIG-004 `Conclusion`·`Status`)
- **Goal**: UNIQUE 인덱스 생성 확인 — `bun run typecheck:strict` 으로 스키마 변경으로 인한 타입 에러 없는지 확인
- **Diagnostics**: 0
- **Verify**: `bun run typecheck:strict`
- **Conclusion**: `bun run typecheck:strict` 통과 — UNIQUE 인덱스 추가 후 Drizzle ORM 타입 에러 없음. 스키마 변경으로 인한 타입 호환성 문제 확인되지 않음.
- **Dependency**: PLAN-MIG-003

#### Task 1.4: 마이그레이션 충돌 데이터 처리 [Level: Low]
- Task-ID: [PLAN-MIG-005] | Status: done | Priority: 2 | Labels: fix, database | RetryPolicy: none
- **Pre-read**: 이 Task 만 — `write`/`patch` 전 **전부** Read
  1. `[code]` `scripts/migrate-turso.mjs` (에러 처리 로직)
  2. `[code]` `db/schema.ts` (UNIQUE 제약 컬럼 정의)
- **Action**: Bash | **Target**: Turso DB
- **Closeout**: `docs/plans/db_post_improvement_blueprint.md` (Task PLAN-MIG-005 `Conclusion`·`Status`)
- **Goal**: UNIQUE 제약과 충돌하는 더티 데이터가 있으면 삭제 또는 수정 — 인덱스 생성 재시도
- **Diagnostics**: 0
- **Verify**: `bun run db:migrate`
- **Conclusion**: `bun run db:migrate` 재실행 시 0006 skip(이미 적용됨) — UNIQUE 인덱스 생성 실패로 인한 더티 데이터 없음. 마이그레이션 완전한 idempotent 상태.
- **Dependency**: PLAN-MIG-004

### Phase 2 — Admin UI 에 프로필 삭제 버튼 연결

#### Task 2.1: 프로필 삭제 컴포넌트 생성 [Level: Low]
- Task-ID: [PLAN-UI-001] | Status: done | Priority: 1 | Labels: fix, ui | RetryPolicy: none
- **Pre-read**: 이 Task 만 — `write`/`patch` 전 **전부** Read
  1. `[code]` `app/actions/admin.ts` (라인 437-455: deleteProfile 구현 확인)
  2. `[code]` `app/admin/quick-actions-admin-section.tsx` (기존 클라이언트 컴포넌트 패턴 참고)
- **Action**: Write File | **Target**: `app/admin/profile-delete-section.tsx`
- **Closeout**: `docs/plans/db_post_improvement_blueprint.md` (Task PLAN-UI-001 `Conclusion`·`Status`)
- **Goal**: 클라이언트 컴포넌트 생성 — `deleteProfile()` 호출, confirm() 경고, 본인 프로필만 삭제 가능 제한
- **Diagnostics**: 0
- **Verify**: `bun run typecheck:strict`
- **Conclusion**: `app/admin/profile-delete-section.tsx` 생성 — 클라이언트 컴포넌트, `deleteProfile()` 호출, confirm() 경고, 본인 프로필만 삭제 가능(서버 측 검증), 삭제 후 홈으로 리다이렉트. typecheck:strict PASS.
- **Dependency**: PLAN-MIG-001

#### Task 2.2: Admin 페이지에 컴포넌트 연결 [Level: Low]
- Task-ID: [PLAN-UI-002] | Status: done | Priority: 1 | Labels: fix, ui | RetryPolicy: none
- **Pre-read**: 이 Task 만 — `write`/`patch` 전 **전부** Read
  1. `[code]` `app/admin/page.tsx` (기존 섹션 임포트 패턴 확인)
  2. `[code]` `app/admin/profile-delete-section.tsx` (생성된 컴포넌트)
- **Action**: Edit File | **Target**: `app/admin/page.tsx`
- **Closeout**: `docs/plans/db_post_improvement_blueprint.md` (Task PLAN-UI-002 `Conclusion`·`Status`)
- **Goal**: `ProfileDeleteSection` 임포트 + 렌더링 — 기존 Daily Pin 폼 아래 배치
- **Diagnostics**: 0
- **Verify**: `bun run typecheck:strict`
- **Conclusion**: `app/admin/page.tsx` 에 `ProfileDeleteSection` 임포트 + 렌더링 추가 — `getActiveProfileContext()` 로 프로필 정보 가져와서 props 전달. 기존 오늘의 지시사항 섹션 아래 배치. typecheck:strict PASS.
- **Dependency**: PLAN-UI-001

#### Task 2.3: Admin UI 통합 검증 [Level: Low]
- Task-ID: [PLAN-UI-003] | Status: done | Priority: 1 | Labels: fix, ui | RetryPolicy: none
- **Pre-read**: 이 Task 만 — `write`/`patch` 전 **전부** Read
  1. `[rule]` `.agents/core/code_quality_lifecycle.md` (빌드 검증 기준)
- **Action**: Bash | **Target**: `bun run build`
- **Closeout**: `docs/plans/db_post_improvement_blueprint.md` (Task PLAN-UI-003 `Conclusion`·`Status`)
- **Goal**: 빌드 성공 + lint 통과 확인
- **Diagnostics**: 0
- **Verify**: `bun run build`
- **Conclusion**: `bun run build` 통과 — 정적 생성 성공, /admin 페이지 동적 렌더링 확인. lint/typecheck/build 모두 통과.
- **Dependency**: PLAN-UI-002

### Phase 3 — 마이그레이션 파일 정리 (선택 사항)

#### Task 3.1: `0000_good_prism.sql` git 에서 제거 [Level: Low]
- Task-ID: [PLAN-ORG-001] | Status: done | Priority: 3 | Labels: docs, cleanup | RetryPolicy: none
- **Pre-read**: 이 Task 만 — `write`/`patch` 전 **전부** Read
  1. `[code]` `scripts/migrate-turso.mjs` (라인 30-60: `bootstrapLegacyApplied()` 로직 확인)
  2. `[code]` `db/migrations/0000_initial.sql` (레거시 파일이 대체 가능한지 확인)
- **Action**: Bash | **Target**: `git rm db/migrations/0000_good_prism.sql`
- **Closeout**: `docs/plans/db_post_improvement_blueprint.md` (Task PLAN-ORG-001 `Conclusion`·`Status`)
- **Goal**: 충돌 유발 파일 제거 — git 히스토리는 유지
- **Diagnostics**: 0
- **Verify**: `git status`
- **Conclusion**: `0000_good_prism.sql` 이 git 추적에서 제거됨(이미 미존재) — 마이그레이션 충돌 유발 파일 정리 완료. migrations 디렉토리 청결 상태 확인.
- **Dependency**: PLAN-MIG-004

#### Task 3.2: drizzle-kit 메타 정리 [Level: Low]
- Task-ID: [PLAN-ORG-002] | Status: done | Priority: 3 | Labels: docs, cleanup | RetryPolicy: none
- **Pre-read**: 이 Task 만 — `write`/`patch` 전 **전부** Read
  1. `[code]` `drizzle.config.ts` (설정 확인)
- **Action**: Bash | **Target**: `rm -rf db/migrations/meta/`
- **Closeout**: `docs/plans/db_post_improvement_blueprint.md` (Task PLAN-ORG-002 `Conclusion`·`Status`)
- **Goal**: stale 메타 파일 제거 — 다음 generate 시 재생성
- **Diagnostics**: 0
- **Verify**: `ls db/migrations/meta/` (디렉토리 없음 확인)
- **Conclusion**: `db/migrations/meta/` 제거 — stale drizzle-kit 스냅샷(`0000_snapshot.json`, `_journal.json`) 정리. 다음 generate 시 재생성됨.
- **Dependency**: PLAN-ORG-001

### Phase 9 — Blueprint closeout

#### Task 9.9: Roll-up 작성 및 plan-close [Level: Low]
- Task-ID: [PLAN-CLO-001] | Status: done | Priority: 3 | Labels: docs | RetryPolicy: none
- **Pre-read**: 이 Task 만 — `write`/`patch` 전 **전부** Read
  1. `[rule]` `.agents/workflows/plan.md`
- **Action**: Edit File | **Target**: `docs/plans/db_post_improvement_blueprint.md`
- **Closeout**: `docs/plans/db_post_improvement_blueprint.md` (Task PLAN-CLO-001 `Conclusion`·`Status`)
- **Goal**: 선행 Task Conclusion 을 근거로 `## 🔁 Conclusion & Summary` Roll-up 1 문단을 실측으로 작성한다.
- **Diagnostics**: 0
- **Verify**: `just plan-close plan=docs/plans/db_post_improvement_blueprint.md`
- **Conclusion**: 모든 선행 Task Conclusion 근거로 Roll-up 작성 완료 — UNIQUE 제약 마이그레이션 적용, Admin 프로필 삭제 UI 연결, 마이그레이션 파일 정리. plan-close 실행 예정.
- **Dependency**: PLAN-UI-003

## 🔁 Conclusion & Summary

- **Roll-up**: `db/migrations/0006_add_unique_constraints.sql` 생성 및 Turso DB 적용 완료 — homework_types(family_id, child_group, title) 및 quick_actions(family_id, label) UNIQUE 인덱스 2건 생성, 마이그레이션 idempotent 확인. `app/admin/profile-delete-section.tsx` 클라이언트 컴포넌트 생성 및 `/admin` 페이지 연결 완료 — 본인 프로필만 삭제 가능(confirm + 서버 측 검증), 삭제 시 events/daily_pins/homework_logs/routine_logs 함께 정리. `0000_good_prism.sql` 마이그레이션 충돌 유발 파일 제거 및 drizzle-kit stale meta 정리. `bun run build` · `typecheck:strict` · `db:migrate` 모두 통과.

## ✅ Definition of Done (DoD)

> **작성 규칙**: 사람이 개입해야 하는 수동 스모크 테스트(Manual Smoke Test) 작성을 금지합니다.
> 모든 DoD 항목은 기계적으로 자동 검증 가능한 형태로 작성하되, 실행할 명령어는 **반드시 백틱(\`)으로 감싸서** 리스트 항목으로 작성하세요. `[ ]` 체크리스트 포맷은 사용하지 마세요.
> **Closeout Task** 의 `just plan-close` 가 여기 명시된 명령을 자동 파싱·일괄 실행합니다 — 수동으로 `[x]` 체크할 필요 없음.

- `just plan-lint docs/plans/db_post_improvement_blueprint.md`
- `bun run typecheck:strict`

## 검증 행렬

| Scope | Command |
| :--- | :--- |
| Blueprint | `just plan-lint docs/plans/db_post_improvement_blueprint.md` |
| Type Check | `bun run typecheck:strict` |
