<!-- Language: ko -->
# Load Order & Precedence

## 목적

세션 초기화 시 규칙 파일 로딩 순서와 충돌 해결 기준을 정의한다. Bootstrap(GEMINI.md 등 에디터 세션 부트스트랩)은 이 문서의 순서를 따른다.

## Phase 1: Governance (필수, 항상)

1. `PROJECT_RULES.md`
2. `AGENTS.md`

## Phase 2: Routing Metadata (필수, 항상)

3. `.agents/registry/LOAD_ORDER.md` (본 문서)
4. `.agents/registry/CONTEXT_ROUTING.md`

## Phase 3: Memory (필수, 항상)

5. `docs/memory/MEMORY.md` (인덱스만, 200줄 이하)

## Phase 4: Core Rules (필수, 항상)

`AGENTS.md` §3 "Always Load" 목록을 따른다. (구체적 파일 목록은 `AGENTS.md`가 SSOT)

## Phase 5: Domain Rules (조건부)

`CONTEXT_ROUTING.md`의 경로 매핑에 따라 선택적 로딩. (구체적 매핑은 `CONTEXT_ROUTING.md`가 SSOT)

## Phase 6: Workflow Rules (조건부)

슬래시 커맨드 또는 워크플로우 트리거 시에만 로딩.

## Phase 7: Adaptive (조건부)

세션 종료 시 또는 명시적 트리거 시에만 로딩.

## 충돌 해결 원칙

- 낮은 Phase 번호가 높은 Phase를 override
- 동일 Phase 내에서는 명시적 규칙 > 암시적 규칙
- Domain 규칙 간 충돌 시 더 specific한 경로 패턴 우선
