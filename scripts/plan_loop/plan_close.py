#!/usr/bin/env python3
"""Manage blueprint plan file status and conclusion fields.

Usage:
  python3 scripts/plan_loop/plan_close.py close [--plan FILE]
  python3 scripts/plan_loop/plan_close.py task-close [--plan FILE]

Commands:
  close       — Set Status to done (for plan-close recipe)
  task-close  — Set Status to done + flag Conclusion placeholder (for plan-task-close recipe)
"""

import argparse
import re
import sys
from pathlib import Path

DEFAULT_PLAN = "docs/plans/archive/20260615_agents_conflict_resolution_blueprint.md"


def update_plan(plan_path: str, mode: str) -> None:
    plan = Path(plan_path)
    if not plan.exists():
        print(f"error: {plan} not found", file=sys.stderr)
        sys.exit(1)

    text = plan.read_text(encoding="utf-8")

    # Update Status field
    text = re.sub(
        r"(- \*\*Status:\*\* )(todo|running|blocked)",
        r"\1done",
        text,
    )

    if mode == "task-close":
        # Flag Conclusion placeholders
        text = re.sub(
            r"Conclusion: \[완료 시 기입\]",
            "Conclusion: [verification required]",
            text,
        )

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
