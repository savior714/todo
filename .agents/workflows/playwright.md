---
description: Playwright MCP 기반 자동 페이지 문제 발견 → Blueprint 생성
trigger: /playwright <scope> 또는 자연어 "playwright로 [scope] 확인"
version: 1.0.0
last_updated: 2026-05-08
---

# 🌐 Playwright MCP 자동 문제 발견 워크플로우

Playwright MCP를 사용해 브라우저에서 실제 페이지 탐색 후, 발견된 문제를 Blueprint 문서로 자동화합니다.

## 🎯 목적

실제 브라우저 환경에서 다음을 자동 탐지:
- **Critical**: 500 빌드 에러, 페이지 진입 불가 (`"use client"` 누락 등)
- **High**: API 연결 실패, 리디렉션 루프
- **Medium**: 스타일/UX 이슈, 경고 메시지
- **Low**: 개선 제안 (stale 버전 등)

## 🔄 실행 프로토콜

### 1단계 — Scope 분석
사용자 입력에서 대상 페이지/플로우 파싱:
```
/playwright login      → /login, /auth/* 라우트 + 세션 리디렉션 확인
/playwright dashboard  → /dashboard/* 전체 + API 연동 상태
/playwright full       → 핵심 플로우 (login → dashboard)
/playwright <커스텀>    → 사용자가 지정한 URL/플로우
```

**기본 Scope 매핑** (사용자 코멘트 없을 시):
- `login` → `/login`, `/auth/*` 라우트 + 세션 리디렉션 확인
- `dashboard` → `/dashboard/*` 전체 + API 연동 상태
- `full` 또는 생략 → 핵심 플로우 (login → dashboard → 주요 기능)

### 2단계 — 브라우저 탐색
```
1. browser_navigate(url)           - 진입점 이동
2. browser_console_messages(level="error", all=true) - 에러 수집
3. browser_snapshot(boxes=true)    - UI 상태 스냅샷
4. browser_network_requests()      - API 호출 확인 (선택적)
```

### 3단계 — 문제 분류 및 정량화
| Severity | 기준 | 예시 |
|----------|------|------|
| **Critical** | 페이지 진입 불가, 500 에러 | `"use client"` 누락, 빌드 실패 |
| **High** | 기능 중단, 데이터 손실 위험 | API 연결 실패, 리디렉션 루프 |
| **Medium** | UX 저하, 경고 메시지 | 스타일 깨짐, stale 버전 |
| **Low** | 개선 제안 | 코드 최적화, 주석 부족 |

### 4단계 — Blueprint 생성
```
docs/plans/playwright_<scope>_<YYYYMMDD>.md
```

**필수 준수 사항**:
1. `docs/specs/technical/plan_blueprint_contract.md` 컨트랙트 준수
2. 모든 Task에 `[Level: Low]`, `Task-ID`, `Status`, `RetryPolicy`, `Conclusion` 포함
3. 생성 직후 `uv run python scripts/plan_loop/plan_lint.py <blueprint_path>` 실행 필수

### 5단계 — 보고
```markdown
## 발견된 문제 요약

### Critical Severity
| ID | 문제 | 영향도 |
|----|------|--------|
| BUG-XXX | ... | ... |

### High Severity
...
```

+ Blueprint 경로 제공

## 📋 출력 형식

**산출물**: `docs/plans/` 내 Blueprint 문서 (기존 `/plan` 워크플로우와 동일한 컨트랙트 준수)

**보고 형식**: 3~5줄 요약 + severity별 문제 목록 + Blueprint 경로

## ⚙️ 설정

| 변수 | 기본값 | 설명 |
|------|--------|------|
| `PLAYWRIGHT_BASE_URL` | `http://127.0.0.1:3000` | 프론트엔드 진입점 |
| `API_PROXY_URL` | `http://127.0.0.1:8000` | 백엔드 API 프록시 (next.config.ts 참고) |

## 🔍 자연어 명령 인식 규칙

사용자가 슬래시 명령어 대신 자연어로 요청할 때 다음 패턴을 인식합니다:

| 패턴 예시 | 매칭된 Scope |
|-----------|-------------|
| "playwright로 로그인 확인" | `login` |
| "대시보드 playwright 테스트" | `dashboard` |
| "전체 페이지 playwright 탐색" | `full` |
| "auth 관련 playwright 확인" | `login` (자동 매핑) |

**매칭 우선순위**:
1. 명시적 `/playwright <scope>` 명령어
2. 자연어에서 키워드 추출 (`로그인`, `대시보드`, `전체`)
3. 기본값: `full` (명확한 지시가 없을 때)

## 🛑 가드레일 (Strict No-Fix Policy)

- **Blueprint 전용**: 이 워크플로우의 유일한 목적은 **문제 발견 및 계획 수립**입니다. 발견된 문제를 **직접 수정하지 마십시오**.
- **토큰 최적화**: 코드 수정 시도는 대량의 파일 읽기/쓰기를 유발하여 토큰을 낭비합니다. 오직 `docs/plans/` 생성까지만 수행하십시오.
- **수정 금지 강제**: 문제를 고치라는 명시적 추가 지시가 없는 한, 구현 단계로 진입하는 것은 정책 위반입니다.
- **Blueprint 생성 전**: 실제 브라우저 탐색 필수 (추측 금지)
- **plan_lint 통과**: 검증 없이 저장 금지
- **중복 계획 방지**: 기존 `docs/plans/README.md`에서 동일 scope plan 확인 후 확장 우선
