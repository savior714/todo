# AGENTS.md (Complete Edition)

## 1. Purpose

본 문서는 에이전트의 분석, 구현, 검증, 수정 및 계획 관리 절차를 정의한다.

모든 작업은 다음 원칙을 따른다.

* 정확성 우선
* 단순성 우선
* 최소 변경 원칙
* 검증 가능성 확보
* 규칙 위반 시 즉시 중단 후 재평가

---

# 2. Rule Hierarchy

규칙 충돌 시 아래 우선순위를 적용한다.

```text
PROJECT_RULES.md (§8 Critical Logic 포함)
  > AGENTS.md
    > .agents/core/ (상시 적용, priority: 1)
      > .agents/domains/ (경로별 동적 적용)
        > .agents/workflows/ (명시적 트리거 시)
          > .agents/adaptive/ (조건부)
```

`PROJECT_RULES.md` §8(Critical Logic)은 **가족 데이터 격리·투약 안전·인증** 등 코드에서 절대 깨지면 안 되는 경계를 정의한다.

충돌 또는 해석 불가 상황에서는 작업을 중단하고 사용자에게 질의한다.

---

# 3. Core Operating Principles

## 3.1 Think Before Coding

구현 전에 반드시:

1. 요구사항 분석
2. 영향 범위 파악
3. 성공 기준 정의
4. 구현 계획 수립

을 수행한다.

분석 없이 구현을 시작하지 않는다.

---

## 3.2 Simplicity First

다음 행위를 금지한다.

* 불필요한 추상화
* 미래를 위한 설계
* 요청되지 않은 기능 추가
* 과도한 예외 처리
* 과도한 리팩터링

현재 문제를 해결하는 최소 변경만 허용한다.

---

## 3.3 Targeted Modification

수정 범위는 요청 범위로 제한한다.

다음은 금지한다.

* 관련 없는 파일 수정
* 스타일 통일 목적 변경
* 광범위한 구조 변경

---

## 3.4 Schema Change Checklist (P-11)

`db/schema.ts` 의 컬럼 mode 변경 시 반드시 확인:

1. `.select()` 반환 타입 (number vs Date 객체)
2. 비교 연산자 사용처 (`gte`, `lte`, `gt`, `lt`)
3. `getTime()` 호출 필요 여부
4. JSON 직렬화/역직렬화 영향

변경 전 `bun run typecheck:strict` 필수 + 영향 범위 grep 자동화.

---

## 3.5 Debug Workflow

버그 수정 시:

```text
/diagnose (Matt Pocock 6단계 진단 — 피드백 루프 → 수정 → 회귀 테스트)
→ /debug_error (Frontend→Backend 전체 호출 흐름 추적 — 근본 원인 분석)
→ 수정
→ 검증
```

순서로 수행한다.

- `/diagnose`: 단순 버그, 성능 회귀, 빠른 원인 추적
- `/debug_error`: 복잡한 에러, 전체 스택 트레이스 추적, Blueprint 연계 필요 시

원인 분석 없이 추측성 수정 금지.

---

## 3.6 Review Workflow

병합 전 반드시:

```text
/review
```

를 수행한다.

---

## 3.7 Commit Gate

다음을 금지한다.

```bash
git commit --no-verify
```

검증 실패 시 원인을 수정한 후 재실행한다.

---

## 3.8 Quality Lifecycle

모든 변경은 다음 사이클을 따른다.

```text
설계
→ 구현
→ 리뷰
→ 테스트
→ 필요 시 반복
```

---

# 4. Dynamic Rule Loading

## 4.1 Session Startup

세션 시작 시 로드:

```text
PROJECT_RULES.md
MEMORY.md
```

---

# 5. Editing Gate

파일 수정 전 다음 절차를 반드시 따른다.

## Step 1

최신 디스크 상태 읽기

---

## Step 2

수정 대상 문자열이 정확히 1회 등장하는지 확인

---

## Step 3

다음을 확인

```text
oldString ≠ newString
```

동일하면 수정 시도 금지

---

## Step 4

다음 응답 수신 시:

```text
No changes to apply
```

동일 요청 반복 금지

절차:

```text
재읽기
→ 상태 확인
→ 1회만 재시도
```

---

# 6. Multi-Agent Execution Model

## 6.1 General Rule

다중 에이전트는 **완전 순차 실행**한다.

다음을 금지한다.

* 병렬 Subagent 실행
* 동시 파일 수정
* 동일 파일 중복 담당

---

## 6.2 Phase Workflow

### Phase 1 — Analysis & Planning

담당:

```text
Main Agent
```

수행:

* 요구사항 분석
* 범위 정의
* 성공 기준 정의
* 작업 분해

산출물:

```text
Task List
```

---

### Phase 2 — Implementation

담당:

```text
Subagent (1개씩 순차 실행)
```

수행:

* 할당된 범위 구현
* 변경 사항 정리
* git diff 제출

규칙:

다음 구현은 이전 구현 결과 검토 후 시작

---

### Phase 3 — Verification

담당:

```text
Fresh Verification Subagent
```

수행:

* diff 검토
* 체크리스트 검증

규칙:

구현 담당 Subagent와 별도 컨텍스트 사용

---

### Phase 4 — Remediation

담당:

```text
Fresh Fix Subagent
```

수행:

* 검증 단계에서 발견된 Issue만 수정

규칙:

새 기능 추가 금지

---

### Phase 5 — Final Audit

담당:

```text
Main Agent
```

수행:

* 전체 Diff 감사
* Lint
* Test
* 최종 승인

---

## 6.3 Transition Rule

각 페이즈는:

```text
완료
→ 결과 확인
→ 다음 페이즈
```

순으로 진행한다.

중간 생략 금지.

---

## 6.4 Proactive Subagent Usage

모든 작업에서 subagent를 적극적으로 활용한다.

### 6.4.1 When to Use Subagent

다음 조건 중 하나라도 해당되면 subagent를 사용한다:

* 파일 검색 / 패턴 탐색
* 코드 구조 파악 / 영향 범위 분석
* 단일 파일 수정 (read → edit → verify)
* 테스트 작성 / 테스트 실행
* lint / typecheck 실행 및 결과 확인
* git diff 검토

### 6.4.2 Mandatory Subagent Triggers

다음 작업은 **항상** subagent를 통해 수행한다:

| 작업 | Agent Type |
|------|-----------|
| 코드베이스 탐색 | `explore` |
| 구현 작업 | `general` |
| 검증 / 감사 | `general` (별도 컨텍스트) |

### 6.4.3 Main Agent Role

Main Agent는 subagent를 직접 지시하고 결과를 검토한다:

```text
Main Agent → Subagent 지시 → 결과 확인 → 다음 단계
```

Main Agent가 직접 파일을 수정하지 않는다. 가능한 한 subagent에 위임한다.

### 6.4.4 Subagent Delegation Pattern

```text
1. Main Agent: 작업 범위와 성공 기준 명시
2. Subagent: 할당된 범위 구현
3. Main Agent: 결과 검토 및 다음 작업 지시
```

한 번에 하나의 subagent만 지시한다. 병렬 지시 금지.

### 6.4.5 Non-Negotiable

다음은 예외 없이 금지한다:

```text
Main Agent의 직접 파일 수정 (subagent 위임이 가능한 경우)
복잡한 작업을 Main Agent가 혼자 수행
subagent 결과 검토 없이 다음 단계 진행
```

위 항목 위반 시 작업을 중단하고 재평가한다.

# 7. Planning & Blueprint Governance

## 7.1 Plan First

복합 작업은:

```text
just plan-lint (alias for lint-fix — runs scripts/plan_loop/plan_lint.py)
```

통과 전 구현 금지

---

## 7.2 Blueprint Update Rule

다음 항목은 직접 편집 금지

```text
Status
Conclusion
```

수정은 반드시:

```bash
just plan-task-close
```

사용 (scripts/plan_loop/plan_close.py task-close 기반, 기본 경로: docs/plans/archive/20260615_agents_conflict_resolution_blueprint.md)

recipe 부재 시 대체 수단: 직접 편집 후 git commit 메시지에 변경 사유 명시

---

## 7.3 Recursive DoD Ban

DoD에 다음 포함 금지

```text
just plan-close
```

자기 호출 재귀 발생 가능

---

## 7.4 Archive Rule

계획 파일 이동은 전용 스크립트만 사용

수동:

* 복사
* 삭제
* 이동

금지

---

# 8. Verification Rules

## 8.1 TDD First

가능한 경우:

```text
Red
→ Green
→ Refactor
```

순서 준수

---

## 8.2 Lint Requirement

모든 변경은:

```text
Lint PASS
```

필수

---

## 8.3 Test Requirement

모든 변경은 `just verify` 실행 후 통과 필수:

```text
just verify (runs lint + typecheck:strict + test)
```

테스트 존재 시: `Test PASS` 필수

---

## 8.4 Plan Closeout Order

반드시:

```text
just verify (runs lint + typecheck:strict + test)
→ just plan-close (updates blueprint status to done)
```

순서 준수

---

## 8.5 Conclusion Quality

Conclusion 작성 규칙:

* 최소 25자 이상
* 실제 검증 결과 포함
* Placeholder 금지

예시:

```text
Implemented API validation,
executed lint and unit tests,
all checks passed successfully.
```

---

## 8.6 Recipe Validation

DoD에 명시된 모든:

```text
just <recipe>
```

는 사전에:

```bash
just --list
```

로 존재 여부 확인

---

# 9. Content Safety Rules

## 9.1 Korean Bulk Edit Rule

대량 한글 수정 시:

```bash
cat << 'EOF'
```

또는

```bash
python3
```

우회 사용

부분 수정 도구 의존 금지

---

## 9.2 Static Selector Rule

정적 HTML/JS에서:

```javascript
querySelector(...)
```

사용 시 대상은 반드시 고유해야 한다.

중복 텍스트 기반 선택 금지.

---

## 9.3 Secret Protection

다음 정보 출력 금지:

* API Key
* Token
* Password
* Secret
* Credential
* 환경 변수 민감 정보

로그에도 노출 금지

---

# 10. Definition of Done (DoD)

작업 완료 조건:

* 요구사항 충족
* 최소 변경 원칙 준수
* 관련 테스트 통과
* Lint 통과
* 리뷰 완료
* 계획 상태 갱신 완료
* 검증 결과 기록 완료

위 조건을 모두 만족할 때만 작업을 완료로 간주한다.

---

# 11. Non-Negotiable Rules

다음은 예외 없이 금지한다.

```text
분석 없는 구현
병렬 Subagent 실행
--no-verify 사용
Blueprint 직접 수정
검증 실패 무시
추측성 버그 수정
요청 외 기능 추가
시크릿 노출
```

위 항목 위반 시 작업을 중단하고 재평가한다.