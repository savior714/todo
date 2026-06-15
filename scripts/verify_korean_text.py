#!/usr/bin/env python3
"""Verify Korean-facing text files for encoding issues and common mojibake/hallucination markers.

Checks:
- Strict UTF-8 decoding
- U+FFFD replacement characters (often from bad conversion)
- Unicode noncharacters and (by default) private-use code points
- U+FEFF (BOM) after the first code point of the file
- C0 control characters except tab / LF / CR
- Heuristic markers of UTF-8 Korean decoded as Latin-1/Windows-1252 (classic "깨짐")

Usage:
  python3 scripts/verify_korean_text.py --dir docs
  python3 scripts/verify_korean_text.py --file .agents/memory/MEMORY.md
"""

from __future__ import annotations

import argparse
import re
import sys
from pathlib import Path

DEFAULT_EXTENSIONS = {".md", ".mdx", ".txt", ".json"}

# UTF-8 bytes for Korean (and some CJK punctuation) misinterpreted as Latin-1/CP1252
# often produce 2–3 character runs starting with í, ê, ì, ë. These rarely belong in
# legitimate Korean prose; they strongly suggest encoding corruption or copy-paste noise.
# CP1252/Latin-1 misread of UTF-8 Korean often yields í/ê/ì/ë plus bullets (U+2022),
# ligatures (œ), or bytes mapped to U+00A1–U+00FF.
MOJIBAKE_PATTERN = re.compile(
    r"(?:í|ê|ì|ë)(?:[\u00A1-\u00FF]|•|€|œ){1,3}",
    re.UNICODE,
)

SKIP_DIR_NAMES = frozenset(
    {
        ".git",
        "node_modules",
        ".next",
        "dist",
        "build",
        ".turbo",
        "__pycache__",
        ".venv",
        "venv",
    }
)


def iter_target_files(root: Path, extensions: set[str]) -> list[Path]:
    if root.is_file():
        return [root] if root.suffix.lower() in extensions else []

    out: list[Path] = []
    for path in root.rglob("*"):
        if not path.is_file():
            continue
        parts = set(path.parts)
        if parts & SKIP_DIR_NAMES:
            continue
        if path.suffix.lower() not in extensions:
            continue
        out.append(path)
    return sorted(out)


def check_text(path: Path, text: str, *, allow_pua: bool) -> list[str]:
    issues: list[str] = []

    if "\ufffd" in text:
        for i, line in enumerate(text.splitlines(), start=1):
            if "\ufffd" in line:
                issues.append(f"{path}:{i}: U+FFFD replacement character (encoding damage)")

    if not allow_pua:
        pua = re.compile(r"[\uE000-\uF8FF]")
        for i, line in enumerate(text.splitlines(), start=1):
            if pua.search(line):
                issues.append(f"{path}:{i}: private-use area character (U+E000–U+F8FF)")

    nonchar = re.compile(r"[\uFFFE\uFFFF]")
    for i, line in enumerate(text.splitlines(), start=1):
        if nonchar.search(line):
            issues.append(f"{path}:{i}: Unicode noncharacter (U+FFFE/U+FFFF)")

    # BOM only allowed as first character
    if len(text) > 1 and "\ufeff" in text[1:]:
        issues.append(f"{path}:1: U+FEFF (BOM) appears after start of file")

    ctrl = re.compile(r"[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]")
    for i, line in enumerate(text.splitlines(), start=1):
        if ctrl.search(line):
            issues.append(f"{path}:{i}: disallowed C0/C1 control character")

    for i, line in enumerate(text.splitlines(), start=1):
        m = MOJIBAKE_PATTERN.search(line)
        if m:
            issues.append(
                f"{path}:{i}: suspected UTF-8/Latin-1 mojibake "
                f"(pattern like corrupted Korean: {m.group()!r})"
            )

    return issues


def verify_file(path: Path, *, allow_pua: bool) -> list[str]:
    try:
        raw = path.read_bytes()
    except OSError as exc:
        return [f"{path}:0: read error: {exc}"]

    try:
        text = raw.decode("utf-8")
    except UnicodeDecodeError as exc:
        return [f"{path}:0: not valid UTF-8 ({exc})"]

    return check_text(path, text, allow_pua=allow_pua)


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Verify UTF-8 and Korean-text integrity for documentation files.",
    )
    parser.add_argument(
        "--dir",
        type=Path,
        metavar="PATH",
        help="Directory to scan recursively (default extensions: md, mdx, txt, json)",
    )
    parser.add_argument(
        "--file",
        type=Path,
        metavar="PATH",
        help="Single file to verify",
    )
    parser.add_argument(
        "--ext",
        action="append",
        dest="extensions",
        metavar="EXT",
        help=f"Extra extension to include, e.g. .yaml (default: {sorted(DEFAULT_EXTENSIONS)})",
    )
    parser.add_argument(
        "--allow-pua",
        action="store_true",
        help="Do not flag private-use area characters (U+E000–U+F8FF)",
    )

    args = parser.parse_args()
    if bool(args.dir) == bool(args.file):
        parser.error("Specify exactly one of --dir or --file")

    extensions = set(DEFAULT_EXTENSIONS)
    if args.extensions:
        for ext in args.extensions:
            e = ext if ext.startswith(".") else f".{ext}"
            extensions.add(e.lower())

    root = args.dir if args.dir else args.file
    assert root is not None
    files = iter_target_files(root, extensions)
    if not files:
        print("verify-korean-text: no matching files", file=sys.stderr)
        return 0

    all_issues: list[str] = []
    for f in files:
        all_issues.extend(verify_file(f, allow_pua=args.allow_pua))

    if all_issues:
        print("verify-korean-text: FAIL")
        for msg in all_issues:
            print(f"- {msg}")
        return 1

    print(f"verify-korean-text: PASS ({len(files)} file(s))")
    return 0


if __name__ == "__main__":
    sys.exit(main())
