#!/usr/bin/env python3
"""Manage blueprint plan file status and conclusion fields.

Usage:
  python3 scripts/plan_loop/plan_close.py close [--plan FILE]
  python3 scripts/plan_loop/plan_close.py task-close [--plan FILE]

Commands:
  close       — Set Status to done (for plan-close recipe)
  task-close  — Set Status to done + flag Conclusion placeholder (for plan-task-close recipe)

Note: If --plan is not provided, finds the most recent blueprint in docs/plans/.
"""

import argparse
import re
import sys
from pathlib import Path


def find_latest_blueprint() -> Path:
    """Find the most recently modified blueprint file in docs/plans/."""
    plans_dir = Path("docs/plans")
    if not plans_dir.exists():
        return Path("")
    blueprints = list(plans_dir.glob("*.md"))
    if not blueprints:
        return Path("")
    return max(blueprints, key=lambda p: p.stat().st_mtime)


DEFAULT_PLAN = str(find_latest_blueprint()) if find_latest_blueprint() else "docs/plans/archive/20260615_agents_conflict_resolution_blueprint.md"


def update_plan(plan_path: str, mode: str) -> None:
    plan = Path(plan_path)
    if not plan.exists():
        print(f"error: {plan} not found", file=sys.stderr)
        sys.exit(1)

    lines = plan.read_text(encoding="utf-8").split("\n")
    new_lines = []
    i = 0

    while i < len(lines):
        line = lines[i]

        # Update Status field (line-by-line to avoid collateral damage)
        if re.match(r"- \*\*Status:\*\* (todo|running|blocked)", line):
            line = re.sub(r"(\*\*Status:\*\* )(todo|running|blocked)", r"\1done", line)

        # Flag Conclusion placeholders (line-by-line)
        if mode == "task-close" and re.match(r"- \*\*Conclusion:\*\* \[완료 시 기입\]", line):
            line = "- **Conclusion**: [verification required]"

        new_lines.append(line)
        i += 1

    text = "\n".join(new_lines)
    plan.write_text(text, encoding="utf-8")
    print(f"updated {plan.name} — status→done, mode={mode}")


def main() -> None:
    parser = argparse.ArgumentParser(description="Manage blueprint plan files.")
    subparsers = parser.add_subparsers(dest="command")

    close_parser = subparsers.add_parser("close", help="Close blueprint (set status to done)")
    close_parser.add_argument("--plan", default=DEFAULT_PLAN, help="Path to blueprint file")

    task_parser = subparsers.add_parser("task-close", help="Close task in blueprint")
    task_parser.add_argument("--plan", default=DEFAULT_PLAN, help="Path to blueprint file")

    args = parser.parse_args()

    if args.command == "close":
        update_plan(args.plan, "close")
    elif args.command == "task-close":
        update_plan(args.plan, "task-close")
    else:
        parser.print_help()
        sys.exit(1)


if __name__ == "__main__":
    main()
