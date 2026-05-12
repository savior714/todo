---
scope: ["docs/plans/**/*"]
always_apply: false
priority: high
description: Blueprint·계획 문서 작성 규약 요약
---

<!-- Language: ko -->
# Planning Documents (Blueprint) Rules

## MUST

- **Plan-First**: 복합 작업은 `/plan` 선행.
- **Low-Level Tasks**: `[Level: Low]`로 분해해 순차성을 확보한다.
- **Contract**: `plan_lint.py` 통과 전 저장 금지. 필수 메타·필드는 [.agents/core/planning.md](../../core/planning.md) 및 [.agents/workflows/plan.md](../../workflows/plan.md)를 따른다.

## MUST NOT

- Task에 `Medium`/`High` 레벨 잔존
- `[완료 시 기입]` placeholder가 남은 채 `done` 처리
