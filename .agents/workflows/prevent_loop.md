---
scope: [".agents/workflows/prevent_loop.md"]
domain: "workflows"
situation: 루프 방지
trigger: /prevent_loop
level: Mandatory
description: 루프 방지 및 자가 교정 워크플로우 (/prevent_loop)
version: 1.0.0
last_updated: 2026-05-06
---
<!-- Language: ko -->

# 🔄 루프 방지 및 자가 교정 워크플로우 (/prevent_loop)

이 워크플로우는 에이전트가 도구 실행 실패로 인해 반복적인 루프에 빠지는 것을 감지했을 때, 스스로를 교정하기 위해 실행하는 비상 프로토콜입니다.

---

## 📋 핵심 실행 로직

### 1. 🔍 에러 원인 정밀 분석 (Analysis)

- **에러 메시지 키워드 추출**: `ENOENT`, `Permission denied`, `Command not found`, `null` placeholder 등을 식별한다.
- **인자(Arguments) 검토**:
    - `cwd`가 실제 존재하는 절대 경로인가? (`CallMcpTool`로 filesystem `list_directory` 호출해 확인)
    - `path`가 실제 존재하는 파일인가?
    - `command` 내에 오타나 환경 변수 누락이 없는가?
- **심층 사고 루프**: 위 분석 시 반드시 **`CallMcpTool(server="user-sequentialthinking", toolName="sequentialthinking", arguments={"thought":"에러 원인 분석 1단계","nextThoughtNeeded":true,"thoughtNumber":1,"totalThoughts":5})`** 형태로 최소 5단계 이상 사고 과정을 거쳐야 한다.
    - 호출 전 스키마 필수 필드(`thought`, `nextThoughtNeeded`, `thoughtNumber`, `totalThoughts`)를 확인한다.
    - 가능하면 직접 호출하지 말고 `tools/mcp_call_wrapper.py`로 payload를 생성해 인자 누락을 방지한다.
- **인프라/증거 확인**: 만약 검증 루프라면, 이미 실행한 `just verify`의 결과(`verify-last-result.json`)를 읽어 정밀한 실패 지점을 데이터로 확인. 재실행 금지.
- **진단 도구 활용**: `scripts/` 내의 진단용 스크립트(`verify_korean_text.py`, `verify_type_imports.py` 등)들을 원인 분석의 도구로 적극 활용한다.
- **물리적 상태 재확인 (Anti-Hallucination)**:
    - `ls -l <path>` 또는 `stat <path>`로 파일 크기가 0 bytes가 아님을 확인한다.
    - `grep -E "if __name__ == .__main__.:" <path>`로 진입점 존재 여부를 확인한다.
    - 출력이 없을 경우 "파일이 비어 있음"이 아닌 **"Interpret Silent Success"** (진입점 부재/조건 미충족/환경 오류) 3단계 분석을 실행한다.
    - 100라인 미만 소스 파일은 반드시 전체를 다시 읽어 구조를 재검토한다.

### 2. 🛠️ 인자 교정 및 환경 재설정 (Correction)

- **경로 정규화**: `cwd: "null"` 등은 현재 작업 중인 프로젝트 루트(`$PROJECT_ROOT`)로 즉시 교정한다.
- **의존성 확인**: 실행하려는 명령이 필요한 라이브러리(예: Pydantic, FastAPI)를 로드할 수 있는지 `PYTHONPATH`를 확인한다.
- **도구 교체**: 터미널 명령(`run_command`)이 계속 실패하면, 파일 확인(`view_file`, `list_dir` 또는 `mcp--filesystem`) 이나 다른 도구로 목적을 달성할 수 있는지 검토한다.

### 3. 🛡️ 재시도 및 보고 (Retry & Report)

- **동일 에러 3회 반복 시 즉시 보고**: 동일한 인자 및 동일한 에러 메시지로 인해 발생한 실패가 **3회(최초 1회 + 교정 시도 2회)**에 도달하면, 기계적 재시도를 중단하고 다음 내용을 포함하여 사용자에게 보고한다.
    - 실패한 명령 및 사용된 인자 조합
    - 발생한 에러 메시지 원본
    - `Sequential Thinking` 단계에서 분석한 '진짜 원인' 가설
    - 시도했지만 실패한 교정 조치 목록
    - 사용자의 확인 또는 직접적인 개입(권한 부여, 환경 설정 등)이 필요한 사항
- **자기 최적화 기록**: 루프 해결 혹은 보고 후, 해당 경험을 `/go` 워크플로우의 **'자기 최적화(Self-Optimization)'** 항목에 기록하여 세션 연속성을 보장한다.

---

## ✅ 루프 탈출 체크리스트

- [ ] 에러 메시지를 텍스트 그대로 해석했는가?
- [ ] `$PROJECT_ROOT` 등 환경 변수가 올바른가?
- [ ] `ls -l`로 파일 크기(bytes)를 직접 확인했는가?
- [ ] 출력이 없는 이유를 "진입점 부재" 관점에서 재검토했는가?
- [ ] 3회 이상 동일 에러가 반복되었는가? (Y -> 즉시 보고)
