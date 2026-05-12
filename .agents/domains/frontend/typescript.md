---
scope: ["*.ts", "*.tsx"]
always_apply: false
priority: normal
description: TypeScript 타입 안정성
---

<!-- Language: ko -->
# TypeScript & Type Safety Rules

## MUST

- **Strict**: `bun run typecheck:strict`로 타입 에러 0건을 목표로 한다.
- **Narrowing**: `unknown` 사용 시 Type Guard·내로잉 후 사용한다.
- **ESLint**: `bun run lint` 정책을 따른다 (`PROJECT_RULES.md`).

## MUST NOT

- 습관적 `any`
- 정당한 사유 없는 `@ts-ignore` / `@ts-expect-error` (불가피 시 사유 주석)
