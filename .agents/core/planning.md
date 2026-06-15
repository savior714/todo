---
scope: ["*"]
always_apply: true
priority: 1
---
<!-- Language: ko -->
# Planning & Thinking Levels

본 문서는 프로젝트의 설계(Planning) 프로세스와 사고 수준(Thinking Levels), 그리고 계획 완료를 위한 게이트 규칙을 정의합니다.

Blueprint 템플릿·7단계 심층 설계·Playwright Discovery 요약 등 **전개 본문**은 [.agents/workflows/plan.md](../workflows/plan.md), [.agents/workflows/playwright.md](../workflows/playwright.md)를 참고합니다.

---

## 1. Adaptive Thinking Levels

복잡도와 영향도에 따라 적절한 사고 수준을 적용합니다.

| Level | When |
|---|---|
| L1 | optional |
| L2 | recommended |
| L3 | mandatory: architecture, migration, data integrity, external integration, large refactor |

불확실하거나 범위가 커질수록 더 높은 레벨을 적용합니다.

---

## 2. Blueprint Contract & Plan Gate

### 2.1 Blueprint Contract 자동 검증

모든 plan 파일(`docs/plans/*.md`)의 생성 및 수정 시 즉시 `scripts/plan_loop/plan_lint.py`를 실행해야 합니다. 통과 전 저장 금지.

#### 자동 감지 규칙

1. Task 헤딩은 `#### Task X.Y: 제목 [Level: Low]` 형식만 허용
2. `Medium` / `High` 금지
3. 각 Task 필수 필드: `Task-ID`, `Action`, `Target`, `Goal`, `Diagnostics`, `Verify`, `Conclusion`
4. 문서 상단 필수 메타: `SSOT Check`, `Project Status Link`, `Architectural Goal`
5. Status 값: `blocked`, `done`, `failed`, `running`, `todo` (`completed` 금지)
6. `RetryPolicy`: `none`, `once_on_flake`
7. Dependency 누락 시 자동 추가 (선행 Task가 없으면 `None`)

### 2.2 Conclusion 강제 게이트

- Task 완료 선언 전 `Conclusion` 필드에 실제 수행 내용을 반드시 기입합니다.
- `[완료 시 기입]` placeholder가 남아 있는 상태에서 `Status: done` 선언 금지.
- 완료 조건: 최소 25자 이상, 구체적인 변경 파일명/행위/검증 결과 포함.

### 2.3 Plan Update Hard Gate

다음 중 하나면 완료 선언 전 plan Conclusion 업데이트가 필수입니다.

1. plan 파일 수정 포함
2. `/plan` 워크플로우 트리거됨
3. 세션 내 plan 파일 read

### 2.4 Plan Close Gate

```bash
just plan-close plan=docs/plans/<target>.md verify="<cwd>::<cmd>|||..."
```

- `verify` exit ≠ 0 → 완료 금지
- `Script not found` 발생 → 완료 금지
- `verify-last-result.json` fail → 상태 `in_progress` 유지

---

## 3. 본 레포 (FamilySync) 보강

- **`plan_lint` 실패 시**: 에러 메시지 기반으로 즉시 수정 후 재실행한다.
- **자동 검증 예시**: `uv run python scripts/plan_loop/plan_lint.py docs/plans/<파일명>.md`
- **Task 분할**: 기존 Task 메타를 유지한 채 `spN` 분해 시 모든 신규 Task에 `Conclusion: [완료 시 기입]`을 둔다. 상단 `SSOT Check` 등 메타 필드는 삭제하지 않는다.
- **placeholder 점검**: 세션 종료 시 `grep -rn "\[완료 시 기입\]" docs/plans/` 권장.
- **`just plan-close`**: `justfile`에 레시피가 없을 수 있다. 없으면 Blueprint `Verify`에 적힌 명령(`bun run lint` 등)을 동일 기준으로 직접 실행한다.
