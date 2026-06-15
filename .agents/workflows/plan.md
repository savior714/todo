---
description: 전략적 설계 및 문서화 워크플로우 (/plan)
---

# 🏗️ 전략적 설계 및 문서화 워크플로우 (/plan)

이 가이드는 요구사항을 **원자적 태스크**로 분해하고 이를 **Blueprint**로 정교하게 문서화하기 위한 지침입니다. 특히 "완벽한 설계"를 지향하며, 계획 단계에서의 조사와 검증을 적극 장려합니다.

## 1. 에이전트 지침 및 원칙

1.  **연구 기반 설계 (Research-First)**: 설계의 명확성을 위해 계획 단계에서의 **코드 읽기, 임시 수정(Instrumentation), 테스트 실행**을 적극 권장합니다. "추측"이 아닌 "증거"에 기반해 Blueprint를 작성하십시오.
2.  **원자적 순차성 (Zero-Friction Sequentiality)**: 50개 이상의 태스크가 되더라도 상관없습니다. 중요한 것은 Task N의 완료가 Task N+1의 완벽한 토대가 되어야 한다는 점입니다. 각 Task는 독립적으로 검증 가능하며, 앞선 작업의 결과를 신뢰할 수 있는 "원자 단위"여야 합니다.
3.  **저사양 모델 최적화 (Atomicity)**: 태스크가 크고 모호할수록 작은 모델은 길을 잃습니다. 인간과 에이전트 모두가 한 치의 의심 없이 수행할 수 있을 정도로 태스크를 잘게 쪼개십시오.
4.  **방향성 명시 (Pseudo-code)**: 복잡한 로직의 경우 설계 섹션에 **Conceptual Sketch (의사 코드)**를 포함하여 전체적인 구현 방향을 미리 확정하십시오.
5.  **Linting Philosophy (의도 기반 검증)**: `plan_lint.py`는 형식적 정합성을 넘어 "논리적 흐름"을 보장해야 합니다. 단순 필드 체크를 넘어, Task 간의 의존성과 검증 방법의 구체성을 스스로 자문하십시오.

---

## 2. 📝 Task Conclusion 작성 규약 (필수)

완료된 Blueprint만으로 다음 `/plan` 주기를 도출할 수 있게 각 Task에 **압축된 결론**을 남깁니다.
- **시기**: Task를 `done`으로 바꿀 때 즉시 작성.
- **내용**: **한 문장**. 단순히 "완료"가 아닌, 무엇이 변했고 무엇이 확인되었는지 기술. (예: "User 모델에 email 필드 추가 및 migration 완료. db-check 통과.")

---

## 3. 🔍 7단계 심층 설계 프로세스

1.  **P1 (Clarification)**: 최종 목적지를 확정합니다.
2.  **P2 (Evidence Discovery)**: 코드를 실행하고 로그를 심어 문제의 실체를 **물리적으로 확인**합니다.
3.  **P3 (Architectural Deepening)**: Seam, Locality, Depth, Leverage 관점에서 아키텍처 개선안을 도출합니다.
4.  **P4 (Conceptual Sketch)**: 주요 구현 로직을 의사 코드로 스케치하여 방향을 검증합니다.
5.  **P5 (Zero-Friction Decomposition)**: `[Level: Low]` 단위로 순차적 태스크를 분해합니다. 단계가 많아지는 것을 두려워하지 마십시오.
5.5 **TDD Red-First**: 각 Task의 비즈니스 로직에 대해 `tests/unit/` 또는 `tests/integration/`에 실패하는 테스트를 먼저 작성한다. Red 로그 확인 없이 구현 시작 금지.
6.  **P6 (Physical Verify Design)**: 각 단계가 확실히 끝났음을 증명할 명령어를 설계합니다.
7.  **P7 (Final Drafting & Lint)**: Blueprint 작성 및 `plan_lint` 검증.
8.  **P8 (Post-Implementation Verification)**: 구현 완료 후 `just verify` 실행으로 전체 체크 통과 확인.

---

## 🏗️ BLUEPRINT DOCUMENT TEMPLATE (Unified Deep Planning)

```markdown
# 🗺️ Project Blueprint: [목표 이름]

## 문서 메타
- **Last Verified**: [YYYY-MM-DD] | **Tested Version**: [스택/버전]
- **Reference**: `docs/knowledge/*.md` 파일 경로 + 소절 제목
- **SSOT Check**: [확인한 SSOT 경로 목록 + 충돌 여부(없음/있음)]
- **Project Status Link**: [현재 진행 plan/메모리 항목과의 관계: 신규/연장/대체/종속]
- **Architectural Goal**: [이 프로젝트가 지향하는 아키텍처적 깊이와 지레(Leverage) 목표]

## 🔍 Diagnosis & Findings (진단)
- **현상 (Symptoms)**: [발견된 증상 및 로그]
- **재현 경로 (Evidence)**: [직접 실행/테스트를 통해 확인된 증거. (예: `npm run test` 결과)]
- **근본 원인 (Root Cause)**: [분석된 원인 - 구체적 파일/라인 지목 권장]

## 🏗️ Architectural Deepening (아키텍처 심화)
- **Seam**: [인터페이스 경계 및 의존성 주입 지점]
- **Locality & Depth**: [파편화된 로직의 응집 전략 및 모듈 심화 방안]
- **Leverage**: [설계 변경으로 얻는 호출 측의 이득]

## 📜 Conceptual Sketch (의사 코드)
```typescript
// 핵심 로직이나 변경 방향을 자유롭게 스케치 (선택 사항이나 권장)
```

## 🛡️ Risk & Strategy
- **Risk**: [리스크] | **Strategy**: [검증 전략 및 인증 지표]

## 🔍 Impact Scope
| 수정 대상 파일 | 현재 라인 수 | 역할 (Architecture) | 비고 |
| :--- | :---: | :--- | :--- |

## 🛠️ Step-by-Step Execution Plan

### Phase X — [이름]
#### Task X.Y: [제목] [Level: Low]
- Task-ID: [PLAN-001] | Status: todo | RetryPolicy: none
- **TDD Red**: [실패하는 테스트 먼저 작성 → `bun test` 또는 `node --test`로 실패 로그 확인]
- **Action**: [Read/Edit File] | **Target**: [절대 경로]
- **Goal**: [구체적 목표] | **Diagnostics**: [진단 수]
- **Verify**: [물리적 증거 확보 명령어 — `bun run lint` / `typecheck:strict` / `test` / `just ci`]
- **Conclusion**: [완료 시 기입]
- **Dependency**: [선행 Task ID 또는 None]

## 🔁 후속 플랜 도출용 요약
- **Roll-up**: 각 Task의 Conclusion을 근거로 다음 주기 목표/리스크를 요약.
- **Continuity**: 기존 활성 plan/메모리와의 연속성을 명시.
```

## ✅ Definition of Done (DoD)

1. [ ] **Risk Cleared**: Impact Scope에 명시된 리스크 부재 확인.
2. [ ] **Sequential Integrity**: 앞선 Task의 결과가 다음 Task의 실패 없이 완벽한 기반이 되는지 확인.
3. [ ] **Verify Strategy**: 모든 Task의 `Verify` 조건 충족.
4. [ ] **Memory Anti-Drift**: `MEMORY.md` 200라인 제한 및 위생 상태 준수.
5. [ ] **Task Conclusion**: 모든 Task에 구체적 결론 채움 확인.
6. [ ] **[필수] Low-Level Only**: 모든 Task가 `[Level: Low]` 레벨로 분해되었음을 확인.

## 🛑 Level 위반 차단 규칙 (Fatal)
```bash
# 모든 Task의 Level이 Low인지 확인
grep -E "\[Level: (Medium|High)\]" docs/plans/<파일명>.md && echo "FAIL: Medium/High 레벨 발견" || echo "PASS: All Low"
```