---
domain: "testing"
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

## 테스트 레이어 정의

| 레이어 | 위치 | 범위 | 러너 |
|---|---|---|---|
| Unit | `tests/unit/` | 순수 함수, 검증 로직, UI 헬퍼 | `bun test` |
| Integration | `tests/integration/` | Server Actions + DB 라운드트립, 트랜잭션, family 격리 | `bun test` |
| Contract | `tests/e2e/` | 소스 코드 정적 계약 검증 (regex 기반) | `node --test` |

### Integration 테스트 작성 규칙

- **실제 DB 엔진 사용**: `libsql` 파일 기반 또는 `:memory:` 인메모리 DB (프로덕션과 동일한 엔진)
- **Seed 함수**: `tests/integration/setup.ts`에서 테스트용 family/profile 생성
- **Critical Logic 우선**: medication safety → family isolation → events CRUD → admin ops 순으로 테스트 작성
- **Red-First**: 비즈니스 로직 변경 시 반드시 실패 테스트 먼저 작성

## MUST NOT

- 구현 후 테스트만 덧붙이기(post-hoc only)
- Red 로그 없이 "TDD 완료" 선언
