---
scope: ["app/actions/**/*", "app/api/**/*"]
always_apply: false
priority: normal
description: Server Actions·Route Handlers·입출력 계약
---

<!-- Language: ko -->
# API & Server Contract Rules

## MUST

- **Contract-First**: 외부 입력·경계 데이터는 Zod 등으로 스키마화하고, 서비스 진입 전 검증한다.
- **명시적 오류**: 인증·권한·검증 실패 시 일관된 오류 처리(프로젝트 패턴 유지).
- **멀티테넌시**: Action·Handler에서 세션·프로필 문맥을 확정한 뒤에만 DB 접근한다.

## MUST NOT

- `any`로 요청 본문·쿼리를 통째로 삼키기
- 클라이언트 전달값만 믿고 `family_id`를 결정하기
