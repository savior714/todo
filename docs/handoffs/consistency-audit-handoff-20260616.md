# Hand-off: Documentation-Code Consistency Audit → Fixes

**Date:** 2026-06-16
**Audit Scope:** README.md, PRD.md, TRD.md, PROJECT_RULES.md §8, Blueprints (10 files), .agents/ docs (20+ files) vs actual codebase
**Audit Method:** 6 parallel subagent deep-dive checks

---

## Audit Results Summary

### Critical Issues (Must Fix)

| ID | Source | Issue | Code Reference |
|----|--------|-------|----------------|
| **C1** | PROJECT_RULES.md §8.1-3 | `deleteProfile()` 물리 삭제 — §8 "물리 삭제 금지" 위반 | `app/actions/admin.ts:444-450` — `tx.delete(events)`, `tx.delete(dailyPins)`, `tx.delete(homeworkLogs)`, `tx.delete(routineLogs)` 모두 hard delete |
| **C2** | PRD.md §F1 | Status Board(세탁일 추적) 미구현 — "태권도복/유치원복 2일 경과 시 붉은색 경고" but 테이블·컴포넌트 없음 | — |
| **C3** | PRD.md §F1 | 실시간 토스트 알림 미구현 — "다른 사람 완료 시 녹색 토스트(3초)" but WebSocket/SSE/polling 없음 | `QuickActionPanel.tsx:204-211` — self-only toast |
| **C4** | .agents/ docs | just recipe 7개 문서 참조 but justfile에 없음 | `route-prep`, `route-manifest-status`, `session-gate`, `session-gate-strict`, `commit-gate-retry`, `update-guidelines`, `directory_verify` |

### High Issues (Fix This Cycle)

| ID | Source | Issue | Details |
|----|--------|-------|---------|
| **H1** | README.md | FS-003/FS-009/FS-011 편차 미설명 | RLS→app-level familyId 검증, Realtime→revalidatePath, care_guides→dropped. Blueprint와 코드 간 차이 설명 누락 |
| **H2** | README.md | `npm run`/`bun run` 혼용 | Lines 63-72: `bun run`, lines 75-134: `npm run`. 통일 필요 |
| **H3** | TRD.md §4.1 | 3개 테이블 미수록 | `quick_actions` (line 208-233), `routine_items` (line 236-257), `routine_logs` (line 259-279) — 구현됐으나 TRD에 없음 |
| **H4** | TRD.md §4.1 | Auth.js 테이블 미수록 | `users`, `accounts`, `sessions`, `verificationTokens`, `authenticators` — Drizzle adapter 자동 생성 |
| **H5** | TRD.md §8 | `StatusBoard.tsx` 언급 but 미존재 | 컴포넌트 트리에 있으나 코드베이스에 없음 |
| **H6** | TRD.md §4.2 | 타입 불일치 | TRD: `uuid pk`, `timestamptz` / Schema: `text("id").primaryKey()`, `integer(mode: "timestamp_ms")` |
| **H7** | .agents/memory/MEMORY.md | 구시대 기록 5개 | Supabase 명령어, npm 명령어, `just memory-verify` 부재(현재 존재함), `plan_lint.py` 부재(현재 존재함), `docs/memory/` 경로(디렉토리 없음) |
| **H8** | docs/plans/ | 2개 PLAN 파일 누락 | `PLAN_createEvent_constraint_handling.md`, `PLAN_auth_error_handling.md` — 존재 안 함 |
| **H9** | docs/plans/ | db_post_improvement_blueprint.md 미아카이브 | 모든 작업 완료 but archive/로 이동 안 됨 (§7.4 위반) |
| **H10** | PRD.md §Phase 4 | PWA 완전 세팅 미달 | manifest.json 있으나 service worker/next-pwa 없음 |
| **H11** | PRD.md §Phase 4 | 가족 초대 미구현 | `families.inviteCode` 컬럼 있으나 초대 UI/URL 생성 기능 없음 |
| **H12** | PRD.md | Routine Items 미언급 | `routine_items` + `routine_logs` 테이블 + UI 완전 구현 but PRD에 없음 |

### Medium Issues (Next Cycle)

| ID | Source | Issue |
|----|--------|-------|
| **M1** | Blueprint IV-003 | `undo-policy.ts:38-39` default가 24h 반환 — unknown action type 검증 미완 |
| **M2** | Blueprint IV-007 | unknown action type 중 slug 패턴 일치하는 것이 silent pass |
| **M3** | Blueprint P-001, P-004 | 파일 경로 불일치 — `lib/events/db-queries.ts` (blueprint: `lib/db-queries.ts`), `lib/quick-actions-seed.ts` (삭제됨) |
| **M4** | .agents/testing/tdd.md | `tests/integration/` 레이어 명시 but 디렉토리 없음 |
| **M5** | .agents/core/principles.md §1.5 | Pythonic Integrity(Ruff) — TypeScript 레포와 무관, 본문 비어있음 |
| **M6** | .agents/core/routing.md | `scripts/agent/route_context.py`의 `get_route_bundle` 함수 — 실제 파일에 없음 (context_route_gate.py에서 import) |

---

## Recommended Fix Order

### Phase 1: Code Fix (C1 — 가장 중요)

**파일:** `app/actions/admin.ts`
**현재 코드 (line 444-450):**
```typescript
await tx.delete(events).where(eq(events.profileId, profileId));
await tx.delete(dailyPins).where(eq(dailyPins.createdBy, profileId));
await tx.delete(homeworkLogs).where(eq(homeworkLogs.completedBy, profileId));
await tx.delete(routineLogs).where(eq(routineLogs.completedBy, profileId));
await tx.delete(profiles).where(eq(profiles.id, profileId));
```

**수정 방향:**
- `events`: `tx.update(events).set({ isReverted: true }).where(eq(events.profileId, profileId))`
- `daily_pins`: `tx.update(dailyPins).set({ isActive: false }).where(eq(dailyPins.createdBy, profileId))`
- `homework_logs`, `routine_logs`: `isReverted` 컬럼이 있는지 확인 후 동일하게 soft-delete, 없으면 로그만 남기고 skip
- `profiles`: `isDeleted` flag 추가 또는 기존 `isReverted` 패턴 활용

**검증:** `just verify` (lint + typecheck:strict + test)

---

### Phase 2: README.md Fix (H1, H2, H12)

**파일:** `README.md`
**수정 항목:**
1. Line 13 부근: FS-003/FS-009/FS-011 편차 설명 추가
   ```
   - FS-003: Supabase RLS → Turso 마이그레이션으로 application-level familyId 검증으로 대체
   - FS-009: Supabase Realtime → revalidatePath(RSC)로 대체
   - FS-011: care_guides → quick_actions 테이블로 통합 (삭제)
   ```
2. Lines 63-134: 모든 `npm run` → `bun run`으로 통일
3. Directory overview 부근: `lib/` (auth, dashboard, events, homework, quick-actions, timeline), `types/` 추가 설명

---

### Phase 3: TRD.md Fix (H3, H4, H5, H6)

**파일:** `docs/specs/TRD.md`
**수정 항목:**
1. §4.1 Data Model에 3개 테이블 추가: `quick_actions`, `routine_items`, `routine_logs`
2. §4.1에 Auth.js 테이블 섹션 추가: `users`, `accounts`, `sessions`, `verificationTokens`, `authenticators` (Drizzle adapter 자동 생성)
3. §8 Component Structure에서 `StatusBoard.tsx` 제거 (미구현)
4. §4.2 타입 설명에 주석 추가: "TRD는 PostgreSQL 기준, 실제 Turso(SQLite)에서는 text UUID + integer timestamp_ms 사용"

---

### Phase 4: PRD.md Fix (H10, H11, H12)

**파일:** `docs/specs/PRD.md`
**수정 항목:**
1. §Phase 4에 PWA 완전 세팅 상태 명시: "manifest.json만 구현, service worker는 미구현"
2. §Phase 4에 가족 초대 상태 명시: "inviteCode 컬럼 존재 but UI 미구현"
3. Core Features에 Routine Items(반복 루틴 체크) 추가 또는 별도 섹션으로
4. (선택) Status Board / 실시간 토스트에 "[MVP scope 외]" 주석 추가 — 향후 구현용

---

### Phase 5: .agents/ Docs Cleanup (C4, H7, M4, M5, M6)

**파일들:**
- `.agents/memory/MEMORY.md` — 구시대 기록 (lines 59-106) 정리, 현재 스택(Turso+Auth.js+bun) 기준으로 갱신
- `.agents/core/verification.md` — `directory_verify` 참조 제거
- `.agents/core/routing.md` — `route-prep`, `route-manifest-status` 참조 제거 또는 justfile에 recipe 추가
- `.agents/domains/documentation/markdown.md` — `session-gate`, `session-gate-strict` 참조 제거
- `.agents/core/principles.md` — §1.5 Pythonic Integrity 본문 채우거나 제거
- `.agents/domains/testing/tdd.md` — `tests/integration/` 레이어 설명 제거
- `.agents/core/routing.md` — `get_route_bundle` 참조 실제 파일명(`context_route_gate.py`)으로 수정

---

### Phase 6: Blueprint Housekeeping (H8, H9)

**작업:**
1. `docs/plans/db_post_improvement_blueprint.md` → `docs/plans/archive/`로 이동 (`just plan-task-close` 또는 수동 이동 + git commit)
2. `PLAN_createEvent_constraint_handling.md`, `PLAN_auth_error_handling.md` — 존재 확인. 없으면 Blueprint 참조 제거 또는 실제 구현 파일로 링크 수정

---

## Verification Commands (각 Phase 완료 시)

```bash
just verify          # lint + typecheck:strict + test
just ci              # plan-lint + memory-verify + stale-lib-ref + verify
```

## Files Modified (Expected)

| Phase | Files |
|-------|-------|
| 1 | `app/actions/admin.ts` |
| 2 | `README.md` |
| 3 | `docs/specs/TRD.md` |
| 4 | `docs/specs/PRD.md` |
| 5 | `.agents/memory/MEMORY.md`, `.agents/core/verification.md`, `.agents/core/routing.md`, `.agents/domains/documentation/markdown.md`, `.agents/core/principles.md`, `.agents/domains/testing/tdd.md` |
| 6 | `docs/plans/db_post_improvement_blueprint.md` (move to archive) |

## Audit Artifacts

6 subagent 결과 파일은 이 세션에서 생성됨. 필요시 `task_id` 참조:
- README check: `ses_13182b4d0ffepUdhWy1HKAkkuN`
- PRD check: `ses_1318274f0ffedeIeVwm3aDWtl0`
- TRD check: `ses_13182310fffeQXJmy0ui1Y5vCI`
- PROJECT_RULES §8 check: `ses_131815fcbffeYjhmJSH3TggHO5`
- Blueprint check: `ses_13176fe93ffedWot2HENhSlh1N`
- .agents/ check: `ses_1317692abffeudSiHTvTTYLbe2`
