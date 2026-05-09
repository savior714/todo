---
situation: CI 실패 자동화
trigger: /ci-fia-auto
level: Recommended
description: 반복 문제 자동 감지 → FIA 호출 → 자산화
version: 1.0.0
last_updated: 2026-05-06
---

# CI-FIA 자동화 워크플로우

## 0. 페르소나
이 워크플로우는 **CI 실패 시 반복 문제 자동 감지 및 FIA 조사 자동 호출** 프로세스를 정의합니다.

---

## 1. 트리거 조건

### 1.1 자동 호출 조건 (모두 만족 시)

| 조건 | 설명 | 확인 방법 |
|------|------|-----------|
| C1 | CI 파이프라인 실패 (`just ci` 또는 `just verify`) | exitCode != 0 |
| C2 | 동일 패턴 2회 이상 감지 | `recurring_issue_tracker.py` 매칭 |
| C3 | 우선순위 P0 또는 P1 | 보안/기능 차단 문제 |

### 1.2 수동 호출 조건 (아래 중 하나 해당 시)

- 개발자가 `/ci-fia-manual <문제설명>` 명령어 실행
- PR 리뷰어 반복 문제 태그 지정
- `docs/memory/recurring_issues.md` 수동 업데이트

---

## 2. 실행 순서

### Step 1: CI 실패 감지 및 패턴 분석

```bash
# CI 실행 및 실패 로그 캡처
just ci 2>&1 | tee ci-failure.log || {
    echo "CI failed, analyzing failure..."
    
    # 패턴 분석
    python scripts/ci_failure_detector.py \
        --output ci-failure-analysis.json \
        < ci-failure.log
}
```

**출력 검증**: `ci-failure-analysis.json`의 `pattern_hash` 존재 확인

---

### Step 2: 반복 문제 감지

```bash
# 패턴 매칭 확인
python scripts/recurring_issue_tracker.py \
    --pattern-hash $$(jq -r '.pattern_hash' ci-failure-analysis.json) \
    --ci-step $$(jq -r '.ci_step' ci-failure-analysis.json) \
    --output recurring-issue.json
```

**출력 검증**:
- `is_recurring: true` 확인
- `trigger_fia: true` 확인 (우선순위 P0/P1)

---

### Step 3: FIA 자동 호출

```bash
# FIA 조사 시작
python scripts/fia_auto_trigger.py \
    --issue-description $$(jq -r '.failure_type' ci-failure-analysis.json) \
    --pattern-hash $$(jq -r '.pattern_hash' ci-failure-analysis.json) \
    --priority $$(jq -r '.priority' recurring-issue.json) \
    --search-queries "FastAPI Pydantic v2 $$jq -r '.failure_type' ci-failure-analysis.json" \
    --output-dir docs/reports/fia_investigations
```

**출력 검증**:
- `docs/reports/fia_investigations/fia_*.md` 파일 생성 확인
- FIA 보고서에 `[참고 문헌 및 인용]` 섹션 존재 확인
- `scripts/verify_fia_citations.py`로 인용 검증 (선택적)

---

### Step 4: 자산화

```bash
# FIA 결과 자산화
python scripts/assetize_fia_result.py \
    --fia-report docs/reports/fia_investigations/fia_*.md \
    --issue-tracker recurring-issue.json \
    --decisions-dir docs/specs/technical/fia_decisions
```

**출력 검증**:
- `docs/specs/technical/fia_decisions/DEC-*.md` 생성 확인
- `docs/memory/MEMORY.md` Decisions 섹션 업데이트 확인
- `docs/plans/PLAN-FIA-*.md` 생성 확인 (P0/P1인 경우)

---

### Step 5: 보고 및 후속 조치

```bash
# 실행 리포트 생성
echo "## CI-FIA 자동화 실행 리포트" >> docs/memory/recurring_issues.md
echo "- **날짜**: $$(date -u +%Y-%m-%dT%H:%M:%SZ)" >> docs/memory/recurring_issues.md
echo "- **패턴**: $$(jq -r '.pattern_hash' ci-failure-analysis.json)" >> docs/memory/recurring_issues.md
echo "- **우선순위**: $$(jq -r '.priority' recurring-issue.json)" >> docs/memory/recurring_issues.md
echo "- **FIA 조사**: docs/reports/fia_investigations/fia_*.md" >> docs/memory/recurring_issues.md
echo "- **기술 결정**: docs/specs/technical/fia_decisions/DEC-*.md" >> docs/memory/recurring_issues.md
```

---

## 3. 성공/실패 기준

### 3.1 성공 기준 (모두 만족)

- [ ] `ci-failure-analysis.json` 생성됨
- [ ] `recurring-issue.json`에서 `is_recurring: true` 확인됨
- [ ] FIA 보고서 (`fia_*.md`) 생성됨
- [ ] FIA 보고서에 최소 2개 이상의 인용문 존재
- [ ] 기술 결정 문서 (`DEC-*.md`) 생성됨
- [ ] MEMORY.md Decisions 섹션 업데이트됨

### 3.2 실패 기준 (아래 중 하나 해당 시)

- CI 실패 로그 파싱 실패
- 패턴 매칭 실패 (JSON 파싱 에러)
- FIA 조사 실패 (MCP 도구 호출 실패 + 폴백 실패)
- 파일 쓰기 권한 없음
- MEMORY.md 업데이트 실패

---

## 4. 에러 핸들링

### 4.1 계층별 폴백 전략

| 계층 | 실패 시 | 조치 |
|------|---------|------|
| Layer 1 | 로그 파싱 실패 | 수동 분석 권장, 워크플로우 중단 |
| Layer 2 | MEMORY.md 읽기 실패 | `occurrence_count=0` 가정, 반복 문제 아님으로 처리 |
| Layer 3 | MCP 도구 호출 실패 | searXNG only 폴백, 경고 출력 후 계속 |
| Layer 4 | 파일 쓰기 실패 | 임시 디렉터리 사용, 후속 알림 |

### 4.2 전체 워크플로우 실패 시

```bash
# 워크플로우 실패 시 수동 조치 권장
echo "⚠️ CI-FIA 자동화 실패 - 수동 조치 필요" >> docs/memory/MEMORY.md
echo "- **날짜**: $$(date -u +%Y-%m-%dT%H:%M:%SZ)" >> docs/memory/MEMORY.md
echo "- **실패 단계**: <단계명>" >> docs/memory/MEMORY.md
echo "- **대응**: 수동 FIA 조사 권장" >> docs/memory/MEMORY.md
```

---

## 5. 보안 고려사항

### 5.1 민감 정보 필터링

```bash
# CI 로그에서 민감 정보 필터링
cat ci-failure.log | sed 's/API_KEY=[^ ]*/API_KEY=***FILTERED***/g' > ci-failure-sanitized.log
```

### 5.2 MCP 도구 접근 제어

- Context7 MCP: 기술스택 공식 문서 조회만 허용
- searXNG: 내부 네트워크 도메인 검색 제한

---

## 6. 모니터링

### 6.1 메트릭 수집

```bash
# 주간 CI-FIA 리포트 생성
python scripts/generate_improvement_report.py --include-ci-fia
```

### 6.2 로깅

- 각 실행별 로그: `docs/reports/fia_investigations/audit.log`
- 패턴 매칭 히스토리: `docs/memory/recurring_issues.md`

---

## 7. 참조

- [아키텍처 설계 문서](../../docs/reports/ci-fia-automation-architecture.md)
- [FIA 워크플로우](fia.md)
- [AGENTS.md](../../AGENTS.md)
- [PROJECT_RULES.md](../../PROJECT_RULES.md)

---

## 8. 변경 이력

| 날짜 | 변경 내용 | 작성자 |
|------|-----------|--------|
| 2026-04-29 | 초기 워크플로우 정의 | Architect Agent |
