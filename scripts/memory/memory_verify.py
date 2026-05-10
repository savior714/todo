#!/usr/bin/env python3
"""Verify MEMORY.md hygiene constraints."""

from __future__ import annotations

import re
import sys
from collections import Counter
from pathlib import Path

MEMORY_PATH = Path("docs/memory/MEMORY.md")
MAX_LINES = 200
LINK_PATTERN = re.compile(r"\[[^\]]+\]\(([^)]+)\)")


def main() -> int:
    if not MEMORY_PATH.exists():
        print(f"memory-verify: FAIL")
        print(f"- missing file: {MEMORY_PATH}")
        return 1

    content = MEMORY_PATH.read_text(encoding="utf-8")
    lines = content.splitlines()
    line_count = len(lines)

    urls = LINK_PATTERN.findall(content)
    duplicate_links = {url: count for url, count in Counter(urls).items() if count > 1}

    failures: list[str] = []
    if line_count > MAX_LINES:
        failures.append(f"line count exceeds limit: {line_count} > {MAX_LINES}")

    if duplicate_links:
        duplicates_summary = ", ".join(
            f"{url} (x{count})" for url, count in sorted(duplicate_links.items())
        )
        failures.append(f"duplicate markdown links found: {duplicates_summary}")

    if failures:
        print("memory-verify: FAIL")
        for failure in failures:
            print(f"- {failure}")
        return 1

    print(f"memory-verify: PASS (lines={line_count}, duplicate_links=0)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
