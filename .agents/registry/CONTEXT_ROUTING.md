<!-- Language: ko -->
# Context Routing Strategy

작업 중인 파일의 경로에 따라 어떤 에이전트 규칙(Instruction)을 우선적으로 로딩할지 정의하는 라우팅 테이블이다.

## 상시 적용 규칙 (Always Load)

아래 규칙은 모든 파일 작업 및 세션 시작 시 항상 로딩된다.

- `core/execution.md`: 기본 사고 방식 및 파일 접근 원칙
- `core/verification.md`: 검증 게이트 및 패치 정합성
- `core/planning.md`: 설계 및 완료 게이트
- `core/reporting.md`: 보고 프로토콜
- `core/memory_hygiene.md`: 메모리 위생
- `adaptive/*.md`: 자기 진화 및 인지 로깅

## 경로별 동적 매핑 (Path-based Loading)

| 파일 경로 패턴 (Glob) | 적용 규칙 파일 (Domain) | 용도 |
| :--- | :--- | :--- |
| `**/*.md`, `docs/**/*` | `documentation/markdown.md` | 한국어 정책, 문서 SSOT |
| `docs/plans/**/*` | `documentation/planning_docs.md` | Blueprint·계획 문서 |
| `CRITICAL_RULES.md`, `docs/CRITICAL_LOGIC.md` | `product/critical_logic.md` | 불변·멀티테넌시·투약 경계 |
| `**/*.{ts,tsx}` | `frontend/typescript.md` | Strict, 타입 내로잉 |
| `app/**/*.{tsx,jsx}`, `**/*.{tsx,jsx}` | `frontend/react.md` | React, 컴포넌트·UI |
| `lib/**/*`, `db/**/*` | `backend/ddd.md` | 계층·서버 경계 (lib/db 일관성) |
| `app/actions/**/*`, `app/api/**/*` | `backend/api_contracts.md` | Server Actions·Route Handlers·계약 |
| `tests/**/*`, `**/*.test.ts`, `**/*.test.tsx` | `testing/tdd.md` | TDD Red-First |
| `tests/e2e/**/*`, `**/*.spec.ts` | `testing/playwright.md` | E2E·Playwright |
| `Dockerfile*`, `docker-compose*` | `infra/docker.md` | 컨테이너 정책 (레포 정책과 함께) |

## 적용 우선순위 (Precedence)

1. `AGENTS.md` (헌법)
2. `PROJECT_RULES.md` (전역 정책)
3. 경로 매핑 규칙 (도메인 특화)
4. 상시 적용 코어 규칙

---

**Last Updated**: 2026-05-12 (emr `CONTEXT_ROUTING` 구조 재동기화)
