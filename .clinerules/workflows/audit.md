---
situation: 프로젝트 진단
trigger: /audit
level: Optional
description: EMR 심사 평가 + 프로젝트 진단 — 6-category scoring, MD+HTML dual output, trend tracking, guardrail validation을 포함한 통합 워크플로우
version: 1.0.0
last_updated: 2026-05-06
---

## 문서 메타 (Version SSOT)
- **Last Verified**: 2026-04-19
- **Tested Version**: 통합 audit v2.0 (audit + assess merge)
- **Min Supported**: EMR 2주기 인증 기준 + AGENTS.md 가드레일 v2
- **Reference**: `PROJECT_RULES.md` (§1.1, §4.0.1), `AGENTS.md` (§2.1.1, §7.1)

## 문서 경계(SSOT)
- **규칙/운영**: `PROJECT_RULES.md`
- **결정/핵심 불변(대안/채택 이유/증적 경로)**: `docs/CRITICAL_LOGIC.md`
- **세션 지식**: `docs/memory/`

---

# 🏥 통합 심사 평가 및 프로젝트 진단 워크플로우 (/audit)

이 워크플로우는 EMR 2주기 인증 심사를 위한 **6-category 종합 평가**와, 프로젝트의 **지속적 건강도 추적(Delta)**을 하나의 파이프라인으로 수행합니다.

> **⚠️ Fatal Rule**: `/audit` 실행 시 반드시 **Markdown 리포트와 HTML 리포트를 동시에 생성**해야 합니다. 하나라도 누락 시 워크플로우 실패로 간주합니다.

---

## 📋 실행 파이프라인 (4 Phase)

```
Phase 1: 데이터 수집 → project_digest.py + audit_tool.py 병렬 실행
Phase 2: 가드레일 검증 → korean_text + import_linter + type_imports
Phase 3: 평가 점수 산정 → 6-category scoring + Delta 분석
Phase 4: 리포트 생성 → MD + HTML 동시 출력 + SSOT 갱신
```

---

## Phase 1: 데이터 수집 (Data Collection)

### Step 1.1: 프로젝트 구조 스캔 (Discovery)

```
1. backend/src/ 의 3계층(domain/application/infrastructure/main) 분리 상태 확인
2. frontend/src/ 의 컴포넌트 구조, 컨텍스트, 피처 모듈화 상태 확인
3. docs/specs/ 의 스펙 문서 존재 여부 및 최신성(Last Verified) 확인
4. tests/ 의 테스트 파일 수 및 지표 커버리지 파악
5. scripts/cert_gap/ 의 증적 생성 스크립트 및 실행 이력 확인
```

### Step 1.2: 메트릭 수집 (Digest)

`python3 scripts/project_digest.py --all --output md` 실행

- **생성 위치**: `docs/digest/project_digest_YYYYMMDD.md`
- **5개 도메인 데이터**: 인증 준수도, 아키텍처 건강도, 구현 진척도, 문서 정합성, 외부 연동 성숙도
- **Delta 분석**: 이전 digest(`project_digest_YYYYMMDD_prev.md`) 대비 변화량 자동 계산

### Step 1.3: 종합 평가 도구 실행 (Audit Tool)

`python3 scripts/audit_tool.py` 또는 `./audit.sh` 실행

- **생성 위치**: `docs/audit/YYYYMMDD_HHMMSS/audit_report.md` 및 `.html`
- **6-category scoring** (100점 만점): 문서화, 아키텍처, 인증 지표, 테스트, 보안, 코드 품질
- **59개 지표 상세 테이블** 포함

---

## Phase 2: 가드레일 검증 (Guardrail Validation)

### Step 2.1: 한글 텍스트 오염도 검사

```bash
uv run python scripts/verify_korean_text.py --dir docs
```

- 스캔 대상: `docs/` 전체
- 체크 항목: 한자, 일본어, 인코딩(Mojibake), 읽기 오류
- 통과 기준: 0건

### Step 2.2: 아키텍처 의존성 검증

```bash
./scripts/run_import_linter.sh
```

- SDD 4계층 위반 여부 확인 (domain → application → infrastructure → main)
- config 갱신 필요 시 `ValueError` 기록

### Step 2.3: 타입 임포트 정합성

```bash
uv run python scripts/verify_type_imports.py --dir backend/src/application/dtos
```

---

## Phase 3: 평가 점수 산정 (Scoring)

### 카테고리 1: 문서화 및 SSOT 체계 (20점 만점)

| 체크 항목 | 평가 기준 |
| :--- | :--- |
| **SSOT 경계 명확성** | `PROJECT_RULES.md` vs `CRITICAL_LOGIC.md` vs `docs/specs/` vs `docs/memory/` 역할 분리 |
| **Decision Log 품질** | Context→Decision→Rationale→증적 형식 준수 |
| **체크리스트 모듈화** | 500라인 가드레일 준수, 하위 문서 분리 |
| **재점검 등급 체계** | `[x]` 항목의 A/B/C 신뢰도 등급 존재 여부 |
| **MEMORY.md 밀도** | 500라인 제한, 인덱스 전용, Anti-Drift (`AGENTS.md` §2.1.1) |
| **스펙-구현 동기화** | Docs-First 원칙 준수 여부, 사후 업데이트 흔적 |

**채점 가이드**: A(18~20), A-(15~17), B+(12~14), B(9~11), C(~8)

### 카테고리 2: 아키텍처 건전성 (20점 만점)

| 체크 항목 | 평가 기준 |
| :--- | :--- |
| **3계층 분리** | domain(정책) → application(유스케이스) → infrastructure(구현) |
| **FHIR/KR Core 준수** | 도메인 모델이 FHIR R5 리소스와 매핑되는가 |
| **라우팅 안정성** | 정적 라우트 우선, Direct Proxy, 회귀 방지 규칙 |
| **모듈화 가드레일** | 500라인 초과 시 즉시 분리, Barrel Router 패턴 |
| **디렉토리 과밀도** | 단일 디렉토리 파일 수 15개 초과 시 분리 권장 |
| **DB 마이그레이션** | SQLite→PostgreSQL 경로 자동화 수준 |

**채점 가이드**: A(18~20), B+(15~17), B(12~14), C+(9~11), C(~8)

### 카테고리 3: 인증 지표 준수도 (25점 만점)

```
1. cert_checklist.md 의 59개 지표 목록을 로드
2. 각 지표별로 상태 분류: ✅ 완료 / ⚠️ 부분 / ❌ 미구현
3. 유형1(의원급) 필수 항목 가중치 부여 (필수=1.5배, 선택=1.0배)
4. 감점 계산: ✅ 만점, ⚠️ 50% 감점, ❌ 100% 감점
```

**주요 지표 그룹**:
| 그룹 | 지표 범위 | 필수/선택 |
| :--- | :--- | :--- |
| **기능성(A)** | A001~A027 | 필수 18, 선택 9 |
| **상호운용성(B)** | B001~B009 | 선택 (사업 참여 시 필수) |
| **고속도로(C)** | C001~C006 | 필수 2, 선택 4 |
| **공중보건(D)** | D001~D005 | 필수 2, 선택 3 |
| **보안(F)** | F001~F012 | 필수 12 |

**채점 가이드**: A(22~25), B+(18~21), B(15~17), C+(12~14), C(~11)

### 카테고리 4: 테스트 커버리지 (15점 만점)

| 체크 항목 | 평가 기준 |
| :--- | :--- |
| **테스트 파일 수** | 30개 이상이면 기본점수 충족 |
| **지표 커버리지** | 59개 지표 중 테스트가 있는 지표 비율 |
| **E2E 테스트** | Playwright 등 핵심 워크플로우 E2E 존재 여부 |
| **통합 테스트** | 실제 DB(PostgreSQL) 기반 테스트 존재 여부 |
| **Mock 의존도** | 외부 시스템 Mock 비율 (낮을수록 좋음) |
| **커버리지 측정** | pytest-cov 등 정량 도구 도입 여부 |

**채점 가이드**: A(13~15), B+(10~12), B(7~9), C+(4~6), C(~3)

### 카테고리 5: 보안 및 암호화 (10점 만점)

| 체크 항목 | 평가 기준 |
| :--- | :--- |
| **암호화 계층화** | Vault, GPKI, HSM, LocalCryptoFallback 다중화 |
| **세션 관리** | IDLE 타임아웃, TTL Capping 정책 |
| **계정 보안** | 비밀번호 정책, 로그인 시도 제한 |
| **PII 마스킹** | 한국형 개인정보 마스킹 구현 |
| **실제 연동 검증** | Vault/GPKI/TSA 실제 서버 연동 테스트 |
| **at-rest 암호화** | DB 레벨 암호화 적용 여부 및 알고리즘 명시 |

**채점 가이드**: A(9~10), B+(7~8), B(5~6), C+(3~4), C(~2)

### 카테고리 6: 코드 품질 및 컨벤션 (10점 만점)

| 체크 항목 | 평가 기준 |
| :--- | :--- |
| **TypeScript strict** | tsconfig.json strict: true 적용 |
| **ESLint 규칙** | Next.js 권장 규칙 적용, 오류 0 |
| **Pydantic v2** | 백엔드 전체 Pydantic v2 기반 |
| **빌드 오류** | tsc/build 오류 0, 경고 최소화 |
| **스타일링 SSOT** | Tailwind + shadcn/ui + 모듈 CSS 경계 일관성 |
| **Git 관리** | 일회성 로그 파일 .gitignore 적용 |

**채점 가이드**: A(9~10), B+(7~8), B(5~6), C+(3~4), C(~2)

---

## Phase 4: 리포트 생성 (Report Generation)

### Step 4.1: Markdown 리포트 생성

`docs/audit/YYYYMMDD_HHMMSS/audit_report.md`에 다음 구조로 작성:

```markdown
# 🏥 freeEMR 심사 평가서 (EMR 2주기 인증 기준)

> **평가자**: EMR 심사 담당관
> **평가일**: YYYY-MM-DD HH:MM:SS (KST)
> **평가 기준**: EMR 2주기 인증기준 (2025 v1.0, 59개 지표)

## 📊 종합 평가 요약

| 평가 항목 | 배점 | 득점 | 등급 | 비고 |
| :--- | :---: | :---: | :---: | :--- |
| 1. 문서화 및 SSOT 체계 | 20 | ?? | ? | |
| 2. 아키텍처 건전성 | 20 | ?? | ? | |
| 3. 인증 지표 준수도 | 25 | ?? | ? | |
| 4. 테스트 커버리지 | 15 | ?? | ? | |
| 5. 보안 및 암호화 | 10 | ?? | ? | |
| 6. 코드 품질 및 컨벤션 | 10 | ?? | ? | |
| **총계** | **100** | **??** | **?** | |

## 📈 Trend Analysis (Delta)

| 지표 | 이전 | 현재 | 변화(Δ) | 비고 |
| :--- | :---: | :---: | :---: | :--- |
| 인증 총점 | ?? | ?? | Δ? | |
| CRITICAL_LOGIC 결정 수 | ?? | ?? | Δ? | |
| SDD import 위반 | ?? | ?? | Δ? | |
| 백엔드 파일 수 | ?? | ?? | Δ? | |
| 테스트 파일 수 | ?? | ?? | Δ? | |
| 명세 수 | ?? | ?? | Δ? | |

## 1~6. 상세 평가 (강점/지적사항/권고)

### 인증 지표 준수도 상세

| 지표 | 상태 | 증적 |
| :--- | :---: | :--- |
| A001 (인적사항) | ✅ | 증적파일명 |
| A002 (다중번호) | ✅ | 증적파일명 |

## 🎯 종합 소견 및 우선순위

| 우선순위 | 작업 항목 | 소요 기간 |
| :---: | :--- | :---: |
| 🔴 긴급 (즉시 조치) | ... | 1~2일 |
| 🟠 높음 (인증 전 필수) | ... | 2~3일 |
| 🟡 보통 (인증 후 개선) | ... | 1일 |

## 🛡️ 가드레일 스냅샷

- **한자/일본어 오염도**: ??건 — 통과/실패
- **SDD import 위반**: ??건 — 통과/실패
- **MEMORY.md 라인**: ??라인 (500라인 제한 내)
```

### Step 4.2: HTML 리포트 생성 (High-Fidelity 필수)

`docs/audit/YYYYMMDD_HHMMSS/audit_report.html`을 다음 기준으로 생성:

**디자인 큐 SSOT**: `docs/specs/technical/design_cues_audit_report.md`
**표준 템플릿**: `docs/templates/AUDIT_REPORT_HTML_TEMPLATE.html` (CSS/Layout/Structure SSOT)

**데이터 밀도 준수 규칙 (HTML 필수)**:

- 단기간의 요약이 아닌, **59개 전 지표의 상태를 테이블로 전수 기록**해야 함
- 각 지표 행(`indicator-row`)에 상세 정보를 포함한 `indicator-detail` 행을 반드시 쌍으로 배치
- 행 앞에 토글 아이콘(`<span class="toggle-icon">▶</span>`) 배치
- 각 지표 행 바로 다음에 상세 내용 행(`<tr class="indicator-detail">`) 배치
- CSS에서 `.indicator-detail`을 `display: none`으로 기본 숨김, `.visible` 클래스 시 `display: table-row`
- JavaScript `toggleIndicator()` 함수로 행 클릭 시 상세 내용 표시/숨김

**테이블 구조 규칙 (HTML 출력 시)**:

- `<thead>`에는 **반드시 열 제목 행만** 포함 (`<tr><th>제목1</th><th>제목2</th>...</tr>`)
- 모든 데이터 행은 **단일 `<tbody>`** 내에 포함
- 각 데이터 행은 별도 `<tbody>`로 감싸지 않음

### Step 4.3: 실행 가능한 후속 조치 (Next Action)

리포트 하단에 **가장 낮은 점수를 받은 항목을 개선하기 위한 /plan 트리거 프롬프트**를 반드시 포함:

> ⚙️ **평가 기반 최우선 개선 작업 (이관용)**
> `/plan 실행. 차순위 목표: [Step X. 카테고리명] 점수 복구(XX점 -> 20점). 지적사항 [내용] 해결을 위한 태스크 분해 및 구현 설계 시작.`

---

## SSOT 업데이트 (Lifecycle)

1. **평가서 저장**: `docs/audit/YYYYMMDD_HHMMSS/audit_report.md` + `.html`
2. **Digest 저장**: `docs/digest/project_digest_YYYYMMDD.md`
3. **MEMORY.md 인덱스 업데이트**: `AGENTS.md` §2.1.1 참조 — 한 줄 링크 원칙(Anti-Drift) 준수
4. **CRITICAL_LOGIC.md 갱신**: 중요 발견사항이 있으면 Decision Log로 추가
5. **cert_implementation_priority_tiers.md 진행 상황 반영**
6. **30일 이상 경과 평가서 아카이브 검토**: `docs/audit/archive/` 이동

---

## ✅ Definition of Done

- [ ] Phase 1: 프로젝트 구조 스캔 + 메트릭 수집 완료 (`project_digest.py`, `audit_tool.py`)
- [ ] Phase 2: 가드레일 검증 완료 (korean_text, import_linter, type_imports)
- [ ] Phase 3: 6-category scoring 산정 + Delta 분석 완료
- [ ] Phase 4.1: **Markdown 리포트** 생성 (`docs/audit/YYYYMMDD_HHMMSS/audit_report.md`)
- [ ] Phase 4.2: **HTML 리포트** 생성 (59개 지표 상세 테이블, toggle 기능 포함)
- [ ] Next Action: `/plan` 트리거 프롬프트 포함
- [ ] SSOT 업데이트: `AGENTS.md` §2.1.1 참조 — MEMORY.md(한 줄 링크), CRITICAL_LOGIC.md(필요 시), priority_tiers 반영
- [ ] 리포트 라인 검증: MD 500라인 이내, HTML 구조 유효성

---

## 📌 주의사항

- **객관성 유지**: 보고서에는 LLM의 주관적 답변보다는 **수치 및 지표 중심**의 객관적 데이터만 포함합니다.
- **SSOT 경계**: 문서 간 중복 서술을 피하고, 상세 결정 사항은 `CRITICAL_LOGIC.md`를 링크합니다.
- **인코딩 보호**: 모든 생성 문서는 **UTF-8 (BOM 없음)**을 유지합니다.
- **MD+HTML 동시 출력**: 하나라도 누락 시 워크플로우 실패로 간주합니다.
