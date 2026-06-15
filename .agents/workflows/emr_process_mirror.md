---
scope: [".agents/workflows/emr_process_mirror.md"]
domain: "workflows"
---
<!-- Language: ko -->
# `/emr-process-mirror` — upstream 진행 방식 점검

## 목적

`dev/emr`(또는 팀이 지정한 **upstream** 경로)의 **최신 에이전트 운영 방식**을 참고해, 본 레포(`todo`)의 **일하는 방식**을 정렬한다.

- **오마주 대상**: `AGENTS.md` 헌법 구조, `.agents/registry/`(Phase·라우팅), `core`/`adaptive`/`domains` **역할 분리**, `workflows/*.md` **파일 목록·트리거 패턴**, 검증 매트릭스 **표 형식**, Plan/Blueprint **게이트 문구** 등 **프로세스·메타**만.
- **금지**: FHIR·의료·Vault 등 **emr 도메인 컨텐츠** 복사, emr 앱 소스·API 계약 이식, 본 레포 `PROJECT_RULES`·`CRITICAL_LOGIC`과 충돌하는 검증 명령 강제 교체.

## 전제 (경로)

- 기본 upstream 루트: **형제 디렉터리** `../emr` (본 레포가 `.../Dev/todo`일 때 `.../Dev/emr`).
- 다른 경로를 쓰려면 세션에서 **`EMR_ROOT`**(또는 사용자가 말한 절대 경로)를 한 번 확정한 뒤, 이후 diff는 그 경로만 SSOT로 삼는다.

## 실행 절차

### 1. 범위 고정 (1분)

- upstream이 존재하는지 확인한다. 없으면 **블로커 보고** 후 중단한다.
- 이번 라운드의 질문을 한 문장으로 고정한다.  
  예: *"registry Phase 정의가 달라졌는가?"*, *"신규 워크플로 파일이 생겼는가?"*

### 2. 구조 스냅샷 (읽기 전용)

upstream에서 **다음만** 목록·헤딩 수준으로 본다 (대량 본문 복붙 금지).

| 대상 | 무엇을 보나 |
|------|-------------|
| `AGENTS.md` | 섹션 목차, Verification 표 **열 구성**, Workflow 표 **행 수·링크 패턴** |
| `.agents/registry/` | `LOAD_ORDER.md` Phase 목록, `CONTEXT_ROUTING.md` Always Load·표 **행 추가/삭제**, `RULE_INDEX.md` 섹션 구조 |
| `.agents/core/` | 파일명 목록, `planning.md` 등 **절 번호·게이트 이름** 변화 |
| `.agents/adaptive/` | 파일명·소제목 변화 |
| `.agents/domains/` | **상위 분류 폴더** 증감(의료·인프라 등 이름만; 내용 복사 안 함) |
| `.agents/workflows/` | **파일명 목록** (신규·삭제·이름 변경) |

### 3. 본 레포와 diff (방식만)

- 동일 항목을 `todo` 쪽에서 읽어 **차이만** 표로 정리한다.
- 각 차이에 대해 **태그**를 붙인다: ` adopt`(이식 권장) / ` adapt`(이 레포에 맞게 변형 후 이식) / ` ignore`(도메인 전용·불필요) / ` discuss`(정책 결정 필요).

### 4. 이식 결정 (최소 패치)

- `adopt`·`adapt`만 **구체 패치 후보**로 내린다. 한 라운드당 **파일 3개 또는 30줄 이내**를 권장 상한으로 삼는다 (폭발적 동기화 방지).
- 검증 명령·Turso·FamilySync SSOT는 **`PROJECT_RULES.md`·`AGENTS.md`가 이미 정한 것**을 깨지 않는다. emr의 `just lint` 등은 **참고용**으로만 적고, 본 레포 표현(`bun run …`)으로 **변형(adapt)** 한다.

### 5. 보고

- 한국어 **3~7줄**: 이번에 발견한 방식 차이 1~2개, 권장 조치, 다음 라운드에서 볼 포인트.
- 사용자가 요청한 경우에만 `docs/plans/`에 **후속 태스크 한 줄** 또는 `docs/reports/`에 짧은 diff 메모를 남긴다.

## 권장 주기

- **수시**: `/emr-process-mirror` 입력 시.
- **정기**: 릴리스 전·분기 초 등, 팀이 정한 간격(예: 월 1회)으로 캘린더에만 걸어 두고 동일 절차 실행.

## 운영 테스트

이 워크플로가 쓸모 있으면: upstream에만 있는 **워크플로 파일명**을 빠르게 발견하고, 본 레포 `RULE_INDEX`·`AGENTS` 표에 **빈 링크 없이** 반영할 수 있어야 한다. 반대로 emr 제품 문서·스펙을 복사해 오지 않아야 한다.
