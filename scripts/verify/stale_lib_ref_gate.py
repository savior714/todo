#!/usr/bin/env python3
"""Gate: detect stale lib/ path references in test files.

Scans test files for `read("lib/...")` and `from "@/lib/..."` imports,
verifies the referenced files exist, and reports broken references.

Usage:
  python3 scripts/verify/stale_lib_ref_gate.py --check
  python3 scripts/verify/stale_lib_ref_gate.py --update-baseline
"""

from __future__ import annotations

import argparse
import re
import sys
from pathlib import Path

from baseline_gate import filter_new_entries, load_baseline, write_baseline

ROOT = Path(__file__).resolve().parents[2]
_SCRIPTS_VERIFY = Path(__file__).resolve().parent
if str(_SCRIPTS_VERIFY) not in sys.path:
    sys.path.insert(0, str(_SCRIPTS_VERIFY))

TEST_DIRS = [ROOT / "tests"]
# Patterns: (regex, group_index_for_path)
REF_PATTERNS = [
    # MJS tests: read("lib/...")
    (r'read\(\s*["\']([^"\']+?)["\']\s*\)', 1),
    # TS/TSX tests: import ... from "@/lib/..."
    (r'from\s+["\']@/lib(/[^"\']+)["\']', 1),
]

BASELINE_FILE = Path(__file__).resolve().parent / "stale_lib_ref_baseline.txt"


def collect_references() -> dict[str, list[tuple[str, int]]]:
    """Scan test files and return {resolved_path: [(source_file, line_no), ...]}."""
    refs: dict[str, list[tuple[str, int]]] = {}

    for test_dir in TEST_DIRS:
        if not test_dir.is_dir():
            continue
        for fpath in sorted(test_dir.rglob("*")):
            if not fpath.is_file():
                continue
            ext = fpath.suffix.lower()
            if ext not in (".ts", ".tsx", ".js", ".mjs", ".jsx"):
                continue
            try:
                lines = fpath.read_text(encoding="utf-8").splitlines()
            except (OSError, UnicodeDecodeError):
                continue

            for line_no, line in enumerate(lines, start=1):
                for pattern, group_idx in REF_PATTERNS:
                    for m in re.finditer(pattern, line):
                        ref = m.group(group_idx)
                        # Normalize: strip leading slash
                        ref_clean = ref.lstrip("/")
                        # For @/lib/ imports, the captured group is the path after lib/
                        # so prepend lib/ to get the full relative path
                        if ref_clean and not ref_clean.startswith("lib/"):
                            # Check if this came from an @/lib/ import (second pattern)
                            if ref.startswith("/"):
                                ref_clean = "lib/" + ref_clean
                            else:
                                continue
                        if not ref_clean.startswith("lib/"):
                            continue
                        resolved = (ROOT / ref_clean).resolve()
                        # Try resolving extensionless imports (.ts, .tsx, .js, .mjs)
                        if not resolved.is_file():
                            for ext in (".ts", ".tsx", ".js", ".mjs"):
                                candidate = resolved.with_suffix(ext)
                                if candidate.is_file():
                                    resolved = candidate
                                    break
                        if resolved not in refs:
                            refs[resolved] = []
                        refs[resolved].append((str(fpath.relative_to(ROOT)), line_no))

    return refs


def scan() -> list[dict]:
    """Run the full scan. Returns list of violation dicts."""
    refs = collect_references()
    violations: list[dict] = []

    for path, sources in refs.items():
        if not path.is_file():
            violations.append({
                "path": str(path.relative_to(ROOT)),
                "sources": sources,
            })

    return violations


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Detect stale lib/ path references in test files."
    )
    parser.add_argument(
        "--check",
        action="store_true",
        help="Fail when stale references are found.",
    )
    parser.add_argument(
        "--update-baseline",
        action="store_true",
        help="Rewrite baseline snapshot with current violations.",
    )
    args = parser.parse_args()

    violations = scan()
    entries = {v["path"] for v in violations}

    if args.update_baseline:
        write_baseline(BASELINE_FILE, entries)
        print(f"[stale-lib-ref] Baseline updated ({len(entries)} entries)")
        return 0

    new_violations = filter_new_entries(entries, load_baseline(BASELINE_FILE))

    if violations:
        print(f"[stale-lib-ref] FAIL — {len(violations)} stale reference(s):")
        for v in violations:
            print(f"  {v['path']}")
            for src, line in v["sources"]:
                print(f"    → {src}:{line}")

    if new_violations:
        print(f"[stale-lib-ref] NEW — {len(new_violations)} violation(s) since baseline:")
        for p in new_violations:
            print(f"  {p}")

    if args.check and violations:
        return 1

    if not violations:
        print("[stale-lib-ref] PASS — no stale references")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
