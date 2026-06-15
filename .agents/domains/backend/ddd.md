---
domain: "backend"
scope: ["lib/**/*", "db/**/*"]
always_apply: false
priority: normal
description: Next.js·lib·db 계층 경계
---

<!-- Language: ko -->
# Layering & Domain Rules (FamilySync)

본 레포는 **Next.js App Router** 단일 앱이다. Python식 DDD 레이어 명칭 대신 다음 경계를 SSOT로 삼는다.

## MUST

- **서버 신뢰**: `family_id`·`active_profile_id` 등 테넌시·프로필 문맥은 서버(Server Actions·Route Handlers·서버 유틸)에서 검증한다. 상세는 `PROJECT_RULES.md` §8.
- **lib**: 공유 도메인 로직·검증(Zod 등)·쿼리 헬퍼. UI(`app/`)에 비즈니스 규칙이 새지 않도록 유지한다.
- **db**: Drizzle 스키마·`db/migrations/*.sql`. 스키마 변경 시 `PROJECT_RULES.md`의 Turso 마이그레이션 절차를 따른다.
- **단방향 의존**: UI → actions/API → lib → db 순을 기본으로 하고, `db`가 `app`을 import하지 않는다.

## MUST NOT

- 멀티테넌시 검증 없이 다른 가족 데이터에 닿는 조회·쓰기
- 민감 제약을 **클라이언트만**에 의존하는 설계
