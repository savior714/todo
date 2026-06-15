#!/usr/bin/env python3
"""check_residual_issues.py — Blueprint 아카이브 전 잔여 이슈 검증

완료된 Blueprint의 Conclusion과 후속 플랜 섹션에서
추적해야 할 잔여 이슈를 추출하고 보고한다.

Exit code:
  0 — 잔여 이슈 없음 (아카이브 진행 가능)
  1 — 잔여 이슈 발견 (새 Blueprint 생성 필요)

Usage:
  python3 scripts/verify/check_residual_issues.py docs/plans/<blueprint>.md
"""

import re
import sys
from pathlib import Path


# Conclusion 내에서 후순위/범위외를 나타내는 키워드 (대소문자 구분 없음)
RESIDUAL_KEYWORDS = [
    r"후속",
    r"남은",
    r"out of scope",
    r"추후",
    r"follow-up",
    r"roll-up",
    r"이후.*blueprint",
    r"다음.*blueprint",
    r"후.*진행",
    r"remaining",
    r"pending",
]

# 후속 플랜 섹션 헤더 패턴
FOLLOW_UP_SECTION = r"##\s*[🔁➡️→]\s*후속\s*플랜"

# Task-ID 패턴 (예: RC-001, P-001, IV-001)
TASK_ID_PATTERN = re.compile(r"([A-Z]{2,10}-\d{2,})")

# Blueprint 파일명에서 ID 추출 (예: 20260615_input_validation_blueprint.md → IV)
BLUEPRINT_ID_PATTERN = re.compile(r"(?:input.validation|error.handling|race.condition|implementation.patterns)", re.IGNORECASE)


def extract_task_ids(text):
    """텍스트 내 모든 Task-ID 추출"""
    return TASK_ID_PATTERN.findall(text)


def check_task_statuses(lines):
    """모든 Task의 Status가 done인지 확인"""
    incomplete = []
    for line in lines:
        match = re.match(
            r"- Task-ID:\s*(\S+)\s*\|\s*Status:\s*(todo|running|blocked|done)",
            line,
        )
        if match:
            task_id = match.group(1)
            status = match.group(2)
            if status != "done":
                incomplete.append((task_id, status))
    return incomplete


def extract_residual_from_conclusions(lines):
    """Conclusion 필드에서 후순위/범위외 이슈 추출"""
    residuals = []
    in_conclusion = False
    current_conclusion = []

    for line in lines:
        # Conclusion 필드 시작 감지
        if re.match(r"- \*\*Conclusion", line):
            in_conclusion = True
            current_conclusion = [line]
            continue

        # Conclusion 필드 종료 (다음 필드 또는 빈 줄)
        if in_conclusion:
            if line.strip() and not line.strip().startswith("- **"):
                current_conclusion.append(line)
                continue
            else:
                in_conclusion = False
                conclusion_text = " ".join(current_conclusion)

                # 키워드 매칭
                for keyword in RESIDUAL_KEYWORDS:
                    if re.search(keyword, conclusion_text, re.IGNORECASE):
                        residuals.append(conclusion_text.strip())
                        break
                current_conclusion = []
                break

    return residuals


def extract_follow_up_section(lines):
    """후속 플랜 섹션 추출 및 Roll-up 항목 파싱"""
    follow_up_text = []
    in_follow_up = False

    for line in lines:
        if re.search(FOLLOW_UP_SECTION, line):
            in_follow_up = True
            continue

        if in_follow_up:
            # 다음 섹션 시작 시 종료
            if line.startswith("## "):
                break
            follow_up_text.append(line)

    if not follow_up_text:
        return []

    text = "\n".join(follow_up_text)

    # Roll-up 항목에서 Blueprint ID 추출
    rollup_match = re.search(r"\*\*Roll-up\*\*:\s*(.+)", text)
    if not rollup_match:
        return []

    rollup_text = rollup_match.group(1)
    task_ids = extract_task_ids(rollup_text)

    # Blueprint 파일명에서 다음 Blueprint 추정
    blueprint_refs = []
    for match in re.finditer(r"([A-Z]{2,10}-\d+~[A-Z]{2,10}-\d+|[A-Z]{2,10}-\d+~)", rollup_text):
        blueprint_refs.append(match.group(0))

    return {
        "raw": rollup_text.strip(),
        "task_ids": task_ids,
        "blueprint_refs": blueprint_refs,
    }


def check_blueprint(plan_path: str) -> int:
    """Blueprint 파일 분석 및 잔여 이슈 보고"""
    path = Path(plan_path)
    if not path.exists():
        print(f"[ERROR] File not found: {path}")
        return 1

    content = path.read_text(encoding="utf-8")
    lines = content.split("\n")

    has_residual = False
    findings = []

    # 1. Task Status 검증
    incomplete_tasks = check_task_statuses(lines)
    if incomplete_tasks:
        has_residual = True
        findings.append({
            "type": "INCOMPLETE_TASKS",
            "severity": "blocker",
            "message": f"미완료 Task {len(incomplete_tasks)}건 발견",
            "details": incomplete_tasks,
        })
    else:
        findings.append({
            "type": "TASK_STATUS",
            "severity": "ok",
            "message": "모든 Task Status: done",
        })

    # 2. Conclusion 내 잔여 이슈 추출
    residuals = extract_residual_from_conclusions(lines)
    if residuals:
        has_residual = True
        findings.append({
            "type": "RESIDUAL_IN_CONCLUSION",
            "severity": "warning",
            "message": f"Conclusion 내 후순위 이슈 {len(residuals)}건 발견",
            "details": residuals,
        })

    # 3. 후속 플랜 섹션 분석
    follow_up = extract_follow_up_section(lines)
    if follow_up and follow_up.get("raw"):
        findings.append({
            "type": "FOLLOW_UP_PLAN",
            "severity": "info",
            "message": "후속 플랜 참조 발견",
            "details": follow_up,
        })

    # 결과 출력
    for f in findings:
        severity_label = {"ok": "[OK]", "info": "[INFO]", "warning": "[RESIDUAL]", "blocker": "[BLOCKER]"}[f["severity"]]
        print(f"{severity_label} {f['message']}")

        if f["type"] == "INCOMPLETE_TASKS":
            for task_id, status in f["details"]:
                print(f"  - {task_id}: {status}")

        if f["type"] == "RESIDUAL_IN_CONCLUSION":
            for item in f["details"]:
                print(f"  - {item[:120]}...")

        if f["type"] == "FOLLOW_UP_PLAN":
            details = f["details"]
            print(f"  Roll-up: {details['raw'][:200]}")
            if details.get("task_ids"):
                print(f"  Task-ID 참조: {', '.join(details['task_ids'])}")
            if details.get("blueprint_refs"):
                print(f"  Blueprint 참조: {', '.join(details['blueprint_refs'])}")

    # Exit code 결정
    if has_residual:
        print()
        print("잔여 이슈 발견 — 새 Blueprint 생성 필요")
        return 1

    print()
    print("잔여 이슈 없음 — 아카이브 진행 가능")
    return 0


def main():
    if len(sys.argv) < 2:
        print(__doc__)
        sys.exit(1)

    plan_path = sys.argv[1]
    exit_code = check_blueprint(plan_path)
    sys.exit(exit_code)


if __name__ == "__main__":
    main()
