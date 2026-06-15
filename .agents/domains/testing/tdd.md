---
scope: ["tests/**/*", "**/*.test.ts", "**/*.test.tsx"]
always_apply: false
priority: normal
description: TDD·단위·통합 테스트
---

<!-- Language: ko -->
# TDD & Testing Rules

## MUST

- **Red-First**: 구현 전 실패 테스트 작성 후 **실패 로그**를 확인한다.
- **Red → Green → Refactor** 준수.
- **Assertion**: 검증문 없는 테스트는 무효로 간주한다.
- **동기화**: 비즈니스 로직 변경 시 관련 테스트를 함께 갱신한다.

## MUST CHECKLIST

- [ ] Red 테스트 작성 → `bun run test` 실패 로그 확인
- [ ] 구현 → `bun run test` 통과 확인
- [ ] 리팩터링 → 테스트 재실행으로 전/후 동일 통과 확인
- [ ] `bun run lint` + `bun run typecheck:strict` 통과

## MUST NOT

- 구현 후 테스트만 덧붙이기(post-hoc only)
- Red 로그 없이 "TDD 완료" 선언
