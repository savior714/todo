---
scope: ["tests/e2e/**/*", "**/*.spec.ts", ".playwright-mcp/**/*"]
always_apply: false
priority: normal
description: Playwright E2E·Discovery
---

<!-- Language: ko -->
# Playwright & Browser Testing Rules

## MUST

- **Discovery**: UI 변경·버그 시 Playwright MCP 등으로 페이지 상태를 스캔하고 이슈를 기록한다.
- **Blueprint**: `/playwright` 워크플로우 결과는 `docs/plans/` Blueprint로 관리한다. [.agents/workflows/playwright.md](../../workflows/playwright.md) 참조.
- **안정적 선택자**: `data-testid` 또는 role 기반 locator 우선.

## MUST NOT

- 깨지기 쉬운 selector만으로 E2E 유지
- 네트워크·애니메이션 무반영 즉시 assertion 남발 (적절한 대기·재시도 패턴)
