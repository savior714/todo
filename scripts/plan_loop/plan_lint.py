#!/usr/bin/env python3
"""Lint markdown plan contracts for executor + blueprint safety.

This repo uses two plan-like markdown contracts:

1) "Executor Plan" blocks (used by scripts/plan_loop/execute_plan.py)
   - Heading: `#### Task: ...`
   - Fields: `- Key: value` (plain keys)

2) "Blueprint" blocks (produced by /plan workflow; docs/plans/*_blueprint.md)
   - Heading: `#### Task 1.1: ... [Level: Low]` (or similar)
   - Fields often use bold keys: `- **Action**: ...`
   - Task header line often packs multiple fields:
     `- Task-ID: XXX | Status: todo | RetryPolicy: none`

The linter accepts both formats but applies the stricter "Blueprint contract"
when a task block looks like a blueprint task.
"""

from __future__ import annotations

import argparse
import re
from pathlib import Path

EXECUTOR_REQUIRED_FIELDS = (
    "Task-ID",
    "Status",
    "Target",
    "Action",
    "Verify",
    "Writeback",
    "Dependency",
    "RetryPolicy",
)

BLUEPRINT_REQUIRED_FIELDS = (
    "Task-ID",
    "Status",
    "RetryPolicy",
    "Action",
    "Target",
    "Goal",
    "Diagnostics",
    "Verify",
    "Conclusion",
    "Dependency",
)
BLUEPRINT_REQUIRED_DOC_META_FIELDS = (
    "SSOT Check",
    "Project Status Link",
    "Architectural Goal",
)
ALLOWED_STATUS = {"todo", "running", "done", "failed", "blocked"}
ALLOWED_RETRY = {"none", "once_on_flake"}

# Accept both:
# - `#### Task: ...` (executor plan)
# - `#### Task 1.1: ... [Level: Low]` (blueprint)
TASK_HEADING_RE = re.compile(r"^####\s+Task\b.*$", re.MULTILINE)

# Examples:
# - `- Target: foo`
# - `- **Target**: foo`
FIELD_RE = re.compile(
    r"^- (?:\*\*(?P<bold_key>[^*]+)\*\*|(?P<plain_key>[A-Za-z-]+)):\s*(?P<value>.*)$"
)

# Packed meta line (blueprint style):
# - `- Task-ID: X | Status: todo | RetryPolicy: none`
PACKED_TASK_META_RE = re.compile(r"^- Task-ID:\s*(?P<rest>.*)$")

LOW_LEVEL_TAG = "[Level: Low]"

# Pipe-separated extra fields inside a single line value:
# `Edit File | **Target**: /abs/path`
PIPE_FIELD_RE = re.compile(
    r"^(?:\*\*(?P<bold_key>[^*]+)\*\*|(?P<plain_key>[A-Za-z-]+)):\s*(?P<value>.*)$"
)


def _split_task_blocks(text: str) -> list[str]:
    matches = list(TASK_HEADING_RE.finditer(text))
    if not matches:
        return []

    blocks: list[str] = []
    for index, match in enumerate(matches):
        start = match.start()
        end = matches[index + 1].start() if index + 1 < len(matches) else len(text)
        blocks.append(text[start:end].strip())
    return blocks


def _parse_fields(task_block: str) -> dict[str, str]:
    fields: dict[str, str] = {}
    lines = task_block.splitlines()
    i = 0
    while i < len(lines):
        line = lines[i]
        stripped = line.strip()

        packed = PACKED_TASK_META_RE.match(stripped)
        if packed:
            rest = packed.group("rest").strip()
            parts = [p.strip() for p in rest.split("|")]
            if parts:
                fields["Task-ID"] = parts[0].strip()
            for part in parts[1:]:
                if ":" not in part:
                    continue
                k, v = part.split(":", 1)
                fields[k.strip()] = v.strip()
            i += 1
            continue

        parsed = FIELD_RE.match(stripped)
        if not parsed:
            i += 1
            continue

        key = (parsed.group("bold_key") or parsed.group("plain_key") or "").strip()
        value = (parsed.group("value") or "").strip()
        if not key:
            i += 1
            continue

        # Multiline value support (common for Verify):
        # - **Verify**:
        #   - `cmd1`
        #   - `cmd2`
        if value == "":
            collected: list[str] = []
            j = i + 1
            while j < len(lines):
                nxt = lines[j]
                if nxt.startswith("#### ") or nxt.startswith("### ") or nxt.startswith("## "):
                    break
                if nxt.startswith("- "):
                    break
                if nxt.strip() == "":
                    j += 1
                    continue
                # Keep indented nested list lines / code fences
                collected.append(nxt.strip())
                j += 1

            if collected:
                fields[key] = "\n".join(collected).strip()
            else:
                fields[key] = ""
            i = j
            continue

        # Support pipe-separated multi-fields on one line:
        # - **Action**: Edit File | **Target**: /abs/path
        # - **Goal**: ... | **Diagnostics**: 3
        parts = [p.strip() for p in value.split("|")] if "|" in value else [value]
        if parts:
            fields[key] = parts[0].strip()
        for extra in parts[1:]:
            m = PIPE_FIELD_RE.match(extra)
            if not m:
                continue
            extra_key = (m.group("bold_key") or m.group("plain_key") or "").strip()
            extra_val = (m.group("value") or "").strip()
            if extra_key:
                fields[extra_key] = extra_val
        i += 1

    return fields


def _is_blueprint_task(block: str, fields: dict[str, str]) -> bool:
    has_blueprint_keys = any(k in fields for k in ("Goal", "Diagnostics", "Conclusion"))
    has_numbered_heading = bool(re.search(r"^####\s+Task\s+\d", block, flags=re.MULTILINE))
    has_level_tag = LOW_LEVEL_TAG in block
    return has_blueprint_keys or has_numbered_heading or has_level_tag


def _extract_doc_meta_fields(text: str) -> dict[str, str]:
    """Parse bullet-style document meta fields before the first task block."""
    first_task = TASK_HEADING_RE.search(text)
    meta_region = text[: first_task.start()] if first_task else text
    return _parse_fields(meta_region)


def _is_placeholder_value(value: str) -> bool:
    normalized = value.strip()
    if not normalized:
        return True
    return bool(re.fullmatch(r"\[[^\]]+\]", normalized))


def lint_plan_text(text: str) -> list[str]:
    issues: list[str] = []
    task_blocks = _split_task_blocks(text)
    if not task_blocks:
        return ["no task blocks found (expected '#### Task: ...')"]

    seen_ids: set[str] = set()
    for idx, block in enumerate(task_blocks, start=1):
        fields = _parse_fields(block)
        is_blueprint = _is_blueprint_task(block, fields)
        required = BLUEPRINT_REQUIRED_FIELDS if is_blueprint else EXECUTOR_REQUIRED_FIELDS

        missing = [field for field in required if not fields.get(field)]
        if missing:
            issues.append(f"Task#{idx} missing required fields: {', '.join(missing)}")
            continue

        if is_blueprint and LOW_LEVEL_TAG not in block:
            issues.append(f"Task#{idx} missing required level tag '{LOW_LEVEL_TAG}'")
            continue

        task_id = fields["Task-ID"]
        if task_id in seen_ids:
            issues.append(f"Task#{idx} duplicate Task-ID: {task_id}")
        else:
            seen_ids.add(task_id)

        status = fields["Status"]
        if status not in ALLOWED_STATUS:
            issues.append(
                f"Task#{idx} invalid Status '{status}' (allowed: {', '.join(sorted(ALLOWED_STATUS))})"
            )

        retry_policy = fields["RetryPolicy"]
        if retry_policy not in ALLOWED_RETRY:
            issues.append(
                f"Task#{idx} invalid RetryPolicy '{retry_policy}' (allowed: {', '.join(sorted(ALLOWED_RETRY))})"
            )

    blueprint_detected = any(_is_blueprint_task(block, _parse_fields(block)) for block in task_blocks)
    if blueprint_detected:
        # Check doc meta fields
        doc_fields = _extract_doc_meta_fields(text)
        for required_meta in BLUEPRINT_REQUIRED_DOC_META_FIELDS:
            value = doc_fields.get(required_meta, "")
            if _is_placeholder_value(value):
                issues.append(
                    f"Blueprint doc meta missing/empty required field: {required_meta}"
                )

        # Enforce existence of key architectural sections
        required_sections = (
            "Diagnosis & Findings",
            "Architectural Deepening",
            "Conceptual Sketch",
        )
        for section in required_sections:
            if not re.search(rf"^##\s+{section}", text, flags=re.MULTILINE):
                issues.append(f"Blueprint missing required section heading: ## {section}")

    return issues


def lint_plan_file(path: Path) -> list[str]:
    return lint_plan_text(path.read_text(encoding="utf-8"))


def main() -> int:
    parser = argparse.ArgumentParser(description="Lint plan markdown task contracts.")
    parser.add_argument("plan_file", type=Path, help="Path to plan markdown file")
    args = parser.parse_args()

    issues = lint_plan_file(args.plan_file)
    if not issues:
        print(f"[PASS] {args.plan_file} contract lint passed")
        return 0

    print(f"[FAIL] {args.plan_file} contract lint failed")
    for issue in issues:
        print(f" - {issue}")
    return 1


if __name__ == "__main__":
    raise SystemExit(main())
