"""Tests for plan-lint recurrence guards (DoD recursion, related specs)."""

from __future__ import annotations

import unittest
from pathlib import Path

from scripts.plan_loop.plan_lint import lint_plan_text
from scripts.plan_loop.plan_lint.recurrence import (
    extract_dod_backtick_commands,
    is_plan_close_command,
    lint_active_blueprint_recurrence_guards,
)


def _body(*, dod_lines: str, with_specs: bool = True) -> str:
    specs = """
## 📎 관련 명세

| 문서 | 범위 |
| :--- | :--- |
| `docs/specs/ui/SPEC_ui_test.md` | test |
""" if with_specs else ""
    return f"""<!-- Language: ko -->

# 🗺️ Project Blueprint: 재발 방지 테스트

## 문서 메타
- **SSOT Check**: ok
- **Project Status Link**: ok
- **Architectural Goal**: ok
- **Linear-Issue**: TEM-999

{specs}
## 📋 업무 요약 (협업용)

### 개요

테스트.

### staff·경영에서 바뀌는 점

- 없음

### 끝났을 때 확인할 것

- 없음

## 🎯 Origin Intent

- **출처**: test
- **원래 목적**: test
- **완료 관찰**: test

## ⚠️ Edge Case Trace

| 엣지 케이스 | 출처 | Task-ID / 범위 밖 | 비고 |
| :--- | :--- | :--- | :--- |
| 없음 | test | 범위 밖 | — |

## 🔍 Diagnosis & Findings

- **현상**: x

## 🏗️ Architectural Deepening

- **Seam**: x

## 📜 Conceptual Sketch

```
sketch
```

## 🛡️ Risk & Strategy

- **Risk**: x — **Strategy**: y

## 🔍 Impact Scope

| f | r |
| :--- | :--- |
| a | b |

## Agent Completion Contract

| 허용 | 금지 |
| :--- | :--- |
| plan-task-close | 직접 수정 |

## 🛠️ Step-by-Step Execution Plan

> **에이전트 스코프**: Verify → Conclusion → done → plan-lint

#### Task 1.1: Fix [Unit: Atomic]
- Task-ID: [TST-001] | Status: todo | RetryPolicy: none
- **Pre-read**: none
- **Action**: Edit
- **Target**: file.py
- **Goal**: fix the module export
- **Diagnostics**: 0
- **Verify**: `just lint`
- **Conclusion**: [판정 — 비개발자용 요약. 검증 결과]
- **Dependency**: None

#### Task 9.9: Closeout [Unit: Atomic]
- Task-ID: [TST-099] | Status: todo | RetryPolicy: none
- **Pre-read**: none
- **Action**: Edit
- **Target**: docs/plans/PLAN_test.md
- **Goal**: Roll-up 작성
- **Diagnostics**: 0
- **Verify**: `just plan-close plan=docs/plans/PLAN_test.md`
- **Conclusion**: [판정 — 비개발자용 요약. 검증 결과]
- **Dependency**: TST-001

## 🔁 Conclusion & Summary

- **Roll-up**: pending

## ✅ Definition of Done (DoD)

{dod_lines}
"""


class TestRecurrenceHelpers(unittest.TestCase):
    def test_is_plan_close_command(self):
        self.assertTrue(is_plan_close_command("just plan-close plan=docs/plans/PLAN_x.md"))
        self.assertFalse(is_plan_close_command("just plan-lint docs/plans/PLAN_x.md"))

    def test_extract_dod_commands_skips_non_list_lines(self):
        text = _body(dod_lines="- `just lint`\n\nnote `just plan-close`")
        self.assertEqual(extract_dod_backtick_commands(text), ["just lint"])


class TestJustfileRecipes(unittest.TestCase):
    def test_extract_just_recipe_name(self):
        from scripts.plan_loop.plan_lint.justfile_recipes import extract_just_recipe_name

        self.assertEqual(
            extract_just_recipe_name("just plan-lint docs/plans/PLAN_x.md"),
            "plan-lint",
        )
        self.assertIsNone(extract_just_recipe_name("uv run pytest tests/foo.py"))

    def test_load_justfile_recipe_names_includes_plan_lint(self):
        from scripts.plan_loop.plan_lint.justfile_recipes import (
            DEFAULT_JUSTFILE,
            load_justfile_recipe_names,
        )

        load_justfile_recipe_names.cache_clear()
        names = load_justfile_recipe_names(str(DEFAULT_JUSTFILE))
        self.assertIn("plan-lint", names)
        self.assertIn("docs-ssot-headers", names)


class TestRecurrenceGuards(unittest.TestCase):
    def test_dod_plan_close_fails_active_root(self):
        body = _body(
            dod_lines=(
                "- `just lint`\n"
                "- `just plan-close plan=docs/plans/PLAN_test.md`"
            ),
        )
        path = Path("docs/plans/PLAN_test_recurrence.md")
        issues = lint_active_blueprint_recurrence_guards(body, path)
        self.assertTrue(any("DoD must not include" in i for i in issues), issues)

    def test_closeout_verify_plan_close_allowed(self):
        body = _body(dod_lines="- `just lint`")
        path = Path("docs/plans/PLAN_test_recurrence.md")
        issues = lint_active_blueprint_recurrence_guards(body, path)
        self.assertFalse(any("DoD must not include" in i for i in issues), issues)

    def test_missing_specs_fails_active_root(self):
        body = _body(dod_lines="- `just lint`", with_specs=False)
        path = Path("docs/plans/PLAN_test_recurrence.md")
        issues = lint_active_blueprint_recurrence_guards(body, path)
        self.assertTrue(any("related specs" in i for i in issues), issues)

    def test_archive_path_skips_guards(self):
        body = _body(
            dod_lines="- `just plan-close plan=docs/plans/PLAN_test.md`",
            with_specs=False,
        )
        path = Path("docs/plans/archive/frontend/PLAN_test_recurrence.md")
        issues = lint_active_blueprint_recurrence_guards(body, path)
        self.assertEqual(issues, [])

    def test_lint_plan_text_integrates_recurrence(self):
        body = _body(
            dod_lines="- `just plan-close plan=docs/plans/PLAN_test.md`",
        )
        path = Path("docs/plans/PLAN_test_recurrence.md")
        issues, _ = lint_plan_text(body, file_path=path)
        self.assertTrue(any("DoD must not include" in i for i in issues), issues)

    def test_unknown_dod_just_recipe_fails(self):
        body = _body(dod_lines="- `just totally-fake-recipe-xyz123`")
        path = Path("docs/plans/PLAN_test_recurrence.md")
        issues = lint_active_blueprint_recurrence_guards(body, path)
        self.assertTrue(any("unknown Justfile recipe" in i for i in issues), issues)

    def test_valid_dod_just_recipe_passes(self):
        body = _body(dod_lines="- `just plan-lint docs/plans/PLAN_test.md`")
        path = Path("docs/plans/PLAN_test_recurrence.md")
        issues = lint_active_blueprint_recurrence_guards(body, path)
        recipe_issues = [i for i in issues if "unknown Justfile recipe" in i]
        self.assertEqual(recipe_issues, [], issues)


if __name__ == "__main__":
    unittest.main()
