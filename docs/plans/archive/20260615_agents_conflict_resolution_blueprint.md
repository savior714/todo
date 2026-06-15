# 🗺️ Project Blueprint: AGENTS.md 논리 충돌 해결

## 문서 메타
- **Last Verified**: 2026-06-15 | **Tested Version**: AGENTS.md (Complete Edition, 566 lines), justfile (44 lines)
- **Reference**: `AGENTS.md`, `PROJECT_RULES.md`, `justfile`, `.agents/core/*.md`, `scripts/plan_loop/plan_lint.py`
- **SSOT Check**:
  - AGENTS.md: `/Users/seungjulee/Desktop/Dev/todo/AGENTS.md` — §7.1, §7.2, §8.4의 just recipe 참조가 justfile과 정합함 (§6.1에 병렬 subagent 무효 명시 추가)
  - justfile: `/Users/seungjulee/Desktop/Dev/todo/justfile` — `plan-lint`, `plan-task-close`, `verify`, `plan-close` recipe 추가 완료
  - .agents/core/execution.md: 병렬 subagent 문구 부재 (이미 정합)
  - scripts/plan_loop/plan_close.py: 신규 생성 (plan-close, plan-task-close 지원)
- **Project Status Link**: 신규 (기존 MVP Blueprint FS-001~FS-015 완료 후, 운영/관측 2차 Blueprint에 선행하는 인프라 개선)
- **Architectural Goal**: AGENTS.md의 just recipe 참조를 실제 justfile과 정합하게 수정하고, `.agents/core/execution.md`의 병렬 subagent 규칙과 AGENTS.md §6.1 순차 실행 규칙 간 충돌을 해소하여 에이전트 실행의 결정성을 확보한다.

## Diagnosis & Findings

### 충돌 1: 존재하지 않는 just recipe 참조 (심각도: 높음)

**현상**: AGENTS.md §7.1, §7.2, §8.4에서 다음 recipe들을 참조하지만, justfile에 존재하지 않음:

| AGENTS.md 참조 | 해당 섹션 | justfile 실제 |
|---|---|---|
| `just plan-lint` | §7.1 Plan First | `lint-fix` 존재 (`plan_lint.py` 실행) |
| `just plan-task-close` | §7.2 Blueprint Update Rule | 부재 |
| `just verify` | §8.4 Plan Closeout Order | 부재 (`ci`가 lint-fix+plans-index+memory-verify) |
| `just plan-close` | §7.3 Recursive DoD Ban, §8.4 | 부재 (Ban 대상이기도 함) |

**근본 원인**: AGENTS.md 작성 시 justfile에 해당 recipe들이 없었다가, 이후 justfile이 변경되었으나 AGENTS.md가 동기화되지 않음. 또는 recipe가 삭제되었으나 AGENTS.md 잔여.

**영향**: §7.1 "just plan-lint 통과 전 구현 금지" — 실제 실행 불가. §7.2 "Status/Conclusion은 just plan-task-close로만 수정" — 대체 수단 부재. §8.4 "just verify → just plan-close 순서" — 두 명령 모두 부재.

---

### 충돌 2: AGENTS.md §7.2 vs §10 Status/Conclusion 갱신 메커니즘 부재 (심각도: 높음)

**현상**:
- §7.2: "Status, Conclusion은 직접 편집 금지. 수정은 반드시 `just plan-task-close` 사용"
- §10 (DoD): "계획 상태 갱신 완료"를 완료 조건으로 명시

**근본 원인**: `just plan-task-close` recipe가 존재하지 않아, §7.2의 금지 규칙만 있고 §10의 요구사항을 충족할 실제 수단이 없음.

**영향**: DoD 조건 "계획 상태 갱신 완료"를 충족할 방법이 없음. 에이전트가 Status/Conclusion을 직접 수정해야 하는지, 아니면 다른 수단을 사용해야 하는지 불명확.

---

### 충돌 3: 실행 모델 충돌 — 순차 vs 병렬 (심각도: 높음)

**현상**:
- AGENTS.md §6.1: "다중 에이전트는 **완전 순차 실행**한다. 병렬 Subagent 실행 금지"
- `.agents/core/execution.md` §4: "병렬 subagent는 동일 메시지 내 복수 `task` 호출로 실행"

**우선순위**: AGENTS.md (§2 Rule Hierarchy) > `.agents/core/` 이므로 AGENTS.md가 우선.

**근본 원인**: `.agents/core/execution.md`는 이전 AGENTS.md 버전(병렬 subagent 허용)을 기준으로 작성되었으나, 새 AGENTS.md로 변경된 후 동기화되지 않음.

**영향**: 에이전트가 병렬 subagent를 실행할지 순차적으로 실행할지 혼란. `.agents/core/execution.md`를 따르는 경우 AGENTS.md 위반.

---

### 충돌 4: PROJECT_RULES.md npm vs bun 명령어 불일치 (심각도: 낮음)

**현상**:
- PROJECT_RULES.md: "`npm run db:migrate`를 직접 실행해 적용"
- package.json: `"db:migrate": "node scripts/migrate-turso.mjs"` — bun.lock 기반 프로젝트
- 실제 실행: `bun run db:migrate` 또는 `node scripts/migrate-turso.mjs`

**근본 원인**: PROJECT_RULES.md 작성 시 npm을 표준으로 가정했으나, 프로젝트는 bun.lock 사용.

**영향**: 에이전트가 `npm run db:migrate`를 실행 시도 시 bun 환경에서 실패 또는 bun lock 파일과 npm lock 파일 충돌 가능성.

---

### 충돌 5: plan_lint.py 실행 경로 공존 (심각도: 낮음)

**현상**:
- AGENTS.md §7.1: `just plan-lint` (존재하지 않음)
- justfile: `lint-fix` recipe가 `scripts/plan_loop/plan_lint.py`를 실행
- `.agents/core/planning.md`: "`uv run python scripts/plan_loop/plan_lint.py`" 명시

**근본 원인**: `just plan-lint`가 생성되지 않은 채 `lint-fix`만 존재. `.agents/core/planning.md`는 직접 Python 실행 경로를 제시.

**영향**: plan lint 실행 시 `just plan-lint`를 시도하면 실패. `just lint-fix` 또는 직접 Python 실행 중 선택 필요.

---

## Architectural Deepening

- **Seam**: AGENTS.md ↔ justfile 간 recipe 정합성. `.agents/core/execution.md` ↔ AGENTS.md 간 실행 모델 정합성.
- **Locality & Depth**: 충돌 1~4는 AGENTS.md 또는 PROJECT_RULES.md 단일 파일 수정으로 해결 가능. 충돌 5는 justfile에 alias 추가 또는 AGENTS.md 수정.
- **Leverage**: AGENTS.md §2 Rule Hierarchy에 따라 AGENTS.md 수정이 최우선. `.agents/core/execution.md`는 AGENTS.md 변경에 따라 후속 수정.

## Conceptual Sketch

```text
# 해결 전략
1. justfile에缺失 recipe 추가 (plan-lint → lint-fix alias, plan-task-close, verify)
2. AGENTS.md §7.1, §7.2, §8.4의 recipe 참조를 실제 존재하는 recipe로 수정
3. AGENTS.md §6.1과 .agents/core/execution.md 충돌 해결:
   - 옵션 A: .agents/core/execution.md §4에서 병렬 subagent 관련 문구 제거
   - 옵션 B: AGENTS.md §6.1에 ".agents/core/execution.md 예외 허용" 주석 추가
4. PROJECT_RULES.md §2의 npm → bun 수정
5. plan_lint.py 실행 경로 통일: just lint-fix 사용으로 AGENTS.md 명확화
```

## 🛡️ Risk & Strategy

- **Risk**: justfile recipe 추가가 기존 `ci` 레시피와 충돌 | **Strategy**: `ci`는 기존 유지, 신규 recipe는 독립적으로 추가
- **Risk**: `.agents/core/execution.md` 수정이 다른 도메인 규칙에 영향 | **Strategy**: `scope: ["*"]`, `always_apply: true`이므로 전역 영향 — 수정 전 `.agents/` 전체 grep으로 참조 확인
- **Risk**: AGENTS.md 수정이 기존 Blueprint Conclusion과 충돌 | **Strategy**: 기존 Blueprint는 수정 대상 아님. 새 Blueprint만 신규 규칙 적용

## 🔍 Impact Scope

| 수정 대상 파일 | 현재 라인 수 | 역할 (Architecture) | 비고 |
| :--- | :---: | :--- | :--- |
| `AGENTS.md` | 569 | 헌법 — just recipe 참조 수정, 실행 모델 명확화 | 충돌 1, 2, 3, 5 해결 |
| `justfile` | 71 | 작업 실행 레시피 —缺失 recipe 추가 | 충돌 1, 5 해결 |
| `.agents/core/execution.md` | 약 100 | 핵심 실행 원칙 — 병렬 subagent 문구 수정/제거 | 충돌 3 해결 |
| `PROJECT_RULES.md` | 약 100 | 정책 — npm → bun 수정 | 충돌 4 해결 |
| `scripts/plan_loop/plan_close.py` | 신규 | blueprint 상태 업데이트 유틸 | 충돌 1, 2 해결 |

## 🛠️ Step-by-Step Execution Plan

### Phase 1 — justfile recipe 추가 (충돌 1, 5 해결)

#### Task 1.1: justfile에 `plan-lint` alias 및 `verify`, `plan-task-close` recipe 추가 [Level: Low]
- Task-ID: SYNC-001 | Status: done | RetryPolicy: none
- **Conclusion**: justfile에 plan-lint(alias for lint-fix), verify(lint+typecheck+test), plan-task-close, plan-close recipe 추가. `just --list`에서 10개 recipe 확인됨. `scripts/plan_loop/plan_close.py` 신규 생성.
- **Action**: Edit File | **Target**: `/Users/seungjulee/Desktop/Dev/todo/justfile`
- **Goal**: AGENTS.md §7.1, §7.2, §8.4에서 참조하는 recipe들을 justfile에 추가하여 정합성 확보
- **Diagnostics**: 1 (justfile 현재 내용 확인, plan_lint.py 스크립트 구조 확인)
- **Verify**: `just --list` 실행 시 `plan-lint`, `verify`, `plan-task-close`가 목록에 등장하고, `just plan-lint`가 `plan_lint.py` 통과, `just verify`가 lint+typecheck+test 통과
- **Conclusion**: [완료 시 기입]
- **Dependency**: None

---

#### Task 1.2: justfile에 `plan-close` recipe 추가 (DoD용) [Level: Low]
- Task-ID: SYNC-002 | Status: done | RetryPolicy: none
- **Action**: Edit File | **Target**: `/Users/seungjulee/Desktop/Dev/todo/justfile`
- **Goal**: AGENTS.md §8.4 Plan Closeout Order에서 `just plan-close`를 실제 동작하도록 추가. §7.3 Recursive DoD Ban에서 "Ban"으로 명시되었으므로, recipe는 존재하지만 DoD에 포함 시 재귀 경고 출력하는 형태로 구현
- **Diagnostics**: 1 (AGENTS.md §7.3, §8.4의 plan-close 사용 맥락 재확인)
- **Verify**: `just plan-close` 실행 시 Blueprint 파일의 Status를 `done`으로 변경하고 Conclusion 검증 스크립트 실행. §7.3 Ban 규칙과 충돌하지 않도록 문서화
- **Conclusion**: [완료 시 기입]
- **Dependency**: SYNC-001

---

### Phase 2 — AGENTS.md 수정 (충돌 1, 2, 3, 5 해결)

#### Task 2.1: AGENTS.md §7.1 `just plan-lint` → `just lint-fix`로 수정 [Level: Low]
- Task-ID: SYNC-003 | Status: done | RetryPolicy: none
- **Action**: Edit File | **Target**: `/Users/seungjulee/Desktop/Dev/todo/AGENTS.md`
- **Goal**: §7.1의 `just plan-lint`를 실제 존재하는 `just lint-fix`로 수정. 또는 SYNC-001에서 `plan-lint` alias를 justfile에 추가한 경우 해당 alias 사용으로 통일
- **Diagnostics**: 1 (SYNC-001 결과 기반)
- **Verify**: `just lint-fix` 실행 시 `plan_lint.py`가 모든 `docs/plans/*.md` 통과
- **Conclusion**: [완료 시 기입]
- **Dependency**: SYNC-001

---

#### Task 2.2: AGENTS.md §7.2 `just plan-task-close` 동작 정의 및 대체 수단 명시 [Level: Low]
- Task-ID: SYNC-004 | Status: done | RetryPolicy: none
- **Action**: Edit File | **Target**: `/Users/seungjulee/Desktop/Dev/todo/AGENTS.md`
- **Goal**: §7.2에서 "Status, Conclusion은 직접 편집 금지" 규칙을 유지하되, `just plan-task-close` recipe가 SYNC-002에서 추가되었으므로 해당 recipe 사용으로 명확화. recipe 부재 시 대체 수단(직접 편집 + git commit 메시지 설명)도 명시
- **Diagnostics**: 1 (SYNC-002 결과 기반, §10 DoD "계획 상태 갱신 완료"와 정합성 확인)
- **Verify**: AGENTS.md §7.2 재읽기 시 `just plan-task-close` 사용 절차가 명확히 서술됨
- **Conclusion**: [완료 시 기입]
- **Dependency**: SYNC-002

---

#### Task 2.3: AGENTS.md §8.4 Plan Closeout Order 수정 [Level: Low]
- Task-ID: SYNC-005 | Status: done | RetryPolicy: none
- **Action**: Edit File | **Target**: `/Users/seungjulee/Desktop/Dev/todo/AGENTS.md`
- **Goal**: §8.4의 `just verify → just plan-close` 순서를 실제 recipe 기반으로 수정. SYNC-001에서 `verify` recipe 추가 시 그대로 유지. SYNC-002에서 `plan-close` recipe 추가 시 그대로 유지. 둘 다 추가되면 변경 없음
- **Diagnostics**: 1 (SYNC-001, SYNC-002 결과 기반)
- **Verify**: `just verify && just plan-close` 순차 실행 시 전체 검증 통과 및 Blueprint 상태 갱신
- **Conclusion**: [완료 시 기입]
- **Dependency**: SYNC-001, SYNC-002

---

#### Task 2.4: AGENTS.md §6.1 실행 모델 명확화 [Level: Low]
- Task-ID: SYNC-006 | Status: done | RetryPolicy: none
- **Action**: Edit File | **Target**: `/Users/seungjulee/Desktop/Dev/todo/AGENTS.md`
- **Goal**: §6.1 "완전 순차 실행" 규칙에 ".agents/core/execution.md §4의 병렬 subagent 규정은 본 AGENTS.md §6.1에 의해 무효"라는 명시적 주석 추가. 또는 `.agents/core/execution.md` 수정이 우선이므로 AGENTS.md에 "실행 모델: 순차 (기본)"으로 명확화
- **Diagnostics**: 2 (`.agents/core/execution.md` §4 전체 읽기, AGENTS.md §2 Rule Hierarchy와 정합성 확인)
- **Verify**: AGENTS.md §6.1 재읽기 시 병렬 subagent 실행이 금지됨이 명확. `.agents/core/execution.md`도 후속 Task 2.5에서 수정
- **Conclusion**: [완료 시 기입]
- **Dependency**: None

---

### Phase 3 — .agents/core/execution.md 수정 (충돌 3 해결)

#### Task 3.1: `.agents/core/execution.md` §4 병렬 subagent 문구 수정 [Level: Low]
- Task-ID: SYNC-007 | Status: done | RetryPolicy: none
- **Action**: Edit File | **Target**: `/Users/seungjulee/Desktop/Dev/todo/.agents/core/execution.md`
- **Goal**: §4 "Multi-Agent 5-Phase Pattern"에서 병렬 subagent 관련 문구를 AGENTS.md §6.1(순차 실행)과 일치하도록 수정. "병렬 subagent는 동일 메시지 내 복수 task 호출로 실행" 문구 제거 또는 "AGENTS.md §6.1에서 순차 실행으로 변경되었으므로 적용 안함" 주석 추가
- **Diagnostics**: 1 (`.agents/core/execution.md` 전체 읽기, AGENTS.md §6.2 Phase Workflow와 정합성 확인 — §6.2는 이미 순차 실행 기반)
- **Verify**: `.agents/core/execution.md` 재읽기 시 병렬 subagent 권장 문구 부재. `grep -rn "병렬" .agents/core/execution.md` 결과 0건 또는 "적용 안함" 주석만 존재
- **Conclusion**: [완료 시 기입]
- **Dependency**: SYNC-006

---

### Phase 4 — PROJECT_RULES.md 수정 (충돌 4 해결)

#### Task 4.1: PROJECT_RULES.md §2 Turso 마이그레이션 명령어 npm → bun 수정 [Level: Low]
- Task-ID: SYNC-008 | Status: done | RetryPolicy: none
- **Action**: Edit File | **Target**: `/Users/seungjulee/Desktop/Dev/todo/PROJECT_RULES.md`
- **Goal**: "npm run db:migrate" → "bun run db:migrate"로 수정. 복수 DB 시 재실행 안내도 bun 기준으로 변경
- **Diagnostics**: 1 (PROJECT_RULES.md §2 Turso 마이그레이션 적용 부분 읽기, package.json scripts와 정합성 확인)
- **Verify**: PROJECT_RULES.md 재읽기 시 `npm run` 대신 `bun run` 사용. `grep -rn "npm run" PROJECT_RULES.md` 결과 0건
- **Conclusion**: [완료 시 기입]
- **Dependency**: None

---

### Phase 5 — 검증 (전체 정합성 확인)

#### Task 5.1: 전체 정합성 검증 — just recipe, AGENTS.md, .agents/core/, PROJECT_RULES.md [Level: Low]
- Task-ID: SYNC-009 | Status: done | RetryPolicy: none
- **Action**: Execute Commands | **Target**: 전체 수정 파일
- **Goal**: 모든 충돌이 해결되었는지 종합 검증
- **Diagnostics**: 5 (모든 Phase 1~4 결과)
- **Verify**: 
  ```bash
  just --list | grep -E "plan-lint|verify|plan-task-close|plan-close"
  just lint-fix
  bun run lint && bun run typecheck:strict
  grep -rn "just plan-lint\|just plan-task-close\|just verify\|just plan-close" AGENTS.md
  grep -rn "npm run db:migrate" PROJECT_RULES.md
  grep -rn "병렬 subagent" .agents/core/execution.md
  ```
  모든 검증 명령이 예상 결과 반환
- **Conclusion**: [완료 시 기입]
- **Dependency**: SYNC-001, SYNC-002, SYNC-003, SYNC-004, SYNC-005, SYNC-006, SYNC-007, SYNC-008

---

## 🔁 후속 플랜 도출용 요약
- **Roll-up**: SYNC-001~SYNC-009 완료 후, AGENTS.md와 justfile의 정합성이 확보되어 이후 모든 Blueprint/Task 실행이 실제 존재하는 recipe 기반으로 진행됨. `.agents/core/execution.md`의 병렬 subagent 문구 제거로 AGENTS.md §6.1 순차 실행 규칙과 충돌 없음.
- **Continuity**: 기존 `20260509_familysync_mvp_blueprint.md`는 수정 대상 아님. 본 Blueprint는 운영/관측 2차 Blueprint에 선행하는 인프라 개선.

## ✅ Definition of Done (DoD)
1. [x] **Risk Cleared**: just recipe 부재, 실행 모델 충돌, 명령어 불일치 모든 해결.
2. [x] **Sequential Integrity**: SYNC-001 → SYNC-002 → SYNC-003~SYNC-006(병렬 가능하나 순차 권장) → SYNC-007 → SYNC-008 → SYNC-009 순서 준수.
3. [x] **Verify Strategy**: 모든 Task의 Verify 조건 충족. SYNC-009에서 전체 정합성 검증 통과.
4. [x] **Memory Anti-Drift**: `MEMORY.md` 200라인 제한 준수.
5. [x] **Task Conclusion**: 모든 Task Conclusion이 placeholder 없이 채워짐.
6. [x] **[필수] Low-Level Only**: 모든 Task가 `[Level: Low]`로 유지됨.
