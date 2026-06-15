#!/usr/bin/env python3
"""archive_plans.py — 완료된 Blueprint를 archive로 이관하고 링크 일괄 치환"""

import argparse
import json
import os
import re
import shutil
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
PLANS_DIR = REPO_ROOT / "docs" / "plans"
ARCHIVE_DIR = PLANS_DIR / "archive"

EXTENSIONS = [".md", ".mdx", ".mjs", ".js", ".ts", ".tsx", ".py", ".html", ".json", ".yml", ".yaml"]
EXCLUDE_DIRS = {".git", ".venv", "node_modules", "dist", "build"}


def find_target_files():
    """docs/plans/ 루트의 *.md 파일 목록 반환 (archive/ 제외)"""
    if not PLANS_DIR.exists():
        return []
    return [f for f in PLANS_DIR.iterdir() if f.suffix == ".md" and f.is_file()]


def find_all_referencing_files():
    """전체 저장소에서 참조되는 파일들 검색 (제외 디렉터리 제외)"""
    files = []
    for ext in EXTENSIONS:
        for root, dirs, filenames in os.walk(REPO_ROOT):
            # Exclude directories
            dirs[:] = [d for d in dirs if d not in EXCLUDE_DIRS]
            for fname in filenames:
                if fname.endswith(ext):
                    files.append(Path(root) / fname)
    return files


def find_broken_links():
    """broken links 확인: 참조는 있지만 docs/plans/ 또는 docs/plans/archive/에 없는 파일명"""
    all_plans = set()
    if PLANS_DIR.exists():
        for f in PLANS_DIR.rglob("*.md"):
            if f.is_file():
                all_plans.add(f.name)

    broken = []
    referencing_files = find_all_referencing_files()
    pattern = re.compile(r"(?:docs/plans/|/plans/)(\d{8}_[\w-]+\.md)")

    for fpath in referencing_files:
        try:
            content = fpath.read_text(encoding="utf-8", errors="ignore")
        except (OSError, IOError):
            continue

        for match in pattern.finditer(content):
            plan_name = match.group(1)
            if plan_name not in all_plans:
                broken.append((str(fpath.relative_to(REPO_ROOT)), plan_name))

    return broken


def replace_links(content, old_name, new_prefix):
    """docs/plans/X → docs/plans/archive/X 링크 치환"""
    # Various link patterns
    replacements = [
        (rf"docs/plans/{re.escape(old_name)}", f"{new_prefix}/{old_name}"),
        (rf"/plans/{re.escape(old_name)}", f"{new_prefix}/{old_name}"),
        (rf"`docs/plans/{re.escape(old_name)}`", f"`{new_prefix}/{old_name}`"),
        (rf"`/plans/{re.escape(old_name)}`", f"`{new_prefix}/{old_name}`"),
    ]
    for old, new in replacements:
        content = re.sub(old, new, content)
    return content


def do_archive(plan_name, dry_run=False):
    """Blueprint를 archive/로 이동하고 링크 치환"""
    src = PLANS_DIR / plan_name
    dst = ARCHIVE_DIR / plan_name

    if not src.exists():
        print(f"[ERROR] File not found: {src}")
        return False

    if not ARCHIVE_DIR.exists():
        if not dry_run:
            ARCHIVE_DIR.mkdir(parents=True, exist_ok=True)

    # Dry-run: only show what would be done
    if dry_run:
        print(f"[DRY-RUN] Would move: {src} → {dst}")
        referencing_files = find_all_referencing_files()
        pattern = re.compile(rf"(?:docs/plans/|/plans/){re.escape(plan_name)}")
        count = 0
        for fpath in referencing_files:
            try:
                content = fpath.read_text(encoding="utf-8", errors="ignore")
            except (OSError, IOError):
                continue
            if pattern.search(content):
                count += 1
                rel = fpath.relative_to(REPO_ROOT)
                print(f"  Would update link in: {rel}")
        print(f"[DRY-RUN] Total files to update: {count}")
        return True

    # Move file
    shutil.move(str(src), str(dst))
    print(f"[OK] Moved: {src} → {dst}")

    # Update links in all files
    referencing_files = find_all_referencing_files()
    new_prefix = "docs/plans/archive"
    pattern = re.compile(rf"(?:docs/plans/|/plans/){re.escape(plan_name)}")

    updated_count = 0
    for fpath in referencing_files:
        try:
            content = fpath.read_text(encoding="utf-8", errors="ignore")
        except (OSError, IOError):
            continue

        if not pattern.search(content):
            continue

        new_content = replace_links(content, plan_name, new_prefix)
        if new_content != content:
            fpath.write_text(new_content, encoding="utf-8")
            updated_count += 1
            print(f"  Updated link in: {fpath.relative_to(REPO_ROOT)}")

    print(f"[OK] Updated {updated_count} file(s)")
    return True


def do_unarchive(plan_name):
    """Archive에서 복구"""
    src = ARCHIVE_DIR / plan_name
    dst = PLANS_DIR / plan_name

    if not src.exists():
        print(f"[ERROR] File not found in archive: {src}")
        return False

    # Restore links
    referencing_files = find_all_referencing_files()
    old_prefix = "docs/plans/archive"
    pattern = re.compile(rf"{re.escape(old_prefix)}/{re.escape(plan_name)}")

    updated_count = 0
    for fpath in referencing_files:
        try:
            content = fpath.read_text(encoding="utf-8", errors="ignore")
        except (OSError, IOError):
            continue

        if not pattern.search(content):
            continue

        new_content = content.replace(f"{old_prefix}/{plan_name}", f"docs/plans/{plan_name}")
        if new_content != content:
            fpath.write_text(new_content, encoding="utf-8")
            updated_count += 1
            print(f"  Restored link in: {fpath.relative_to(REPO_ROOT)}")

    print(f"[OK] Restored {updated_count} file(s)")

    # Move back
    shutil.move(str(src), str(dst))
    print(f"[OK] Moved: {src} → {dst}")
    return True


def main():
    parser = argparse.ArgumentParser(description="Archive completed plans")
    subparsers = parser.add_subparsers(dest="command")

    # check command
    check_parser = subparsers.add_parser("check", help="Check for broken links")
    check_parser.set_defaults(func=lambda args: cmd_check())

    # archive command
    archive_parser = subparsers.add_parser("archive", help="Archive plans")
    archive_parser.add_argument("--dry-run", action="store_true", help="Preview changes only")
    archive_parser.add_argument("plans", nargs="+", help="Plan files to archive")
    archive_parser.set_defaults(func=lambda args: cmd_archive(args))

    # unarchive command
    unarchive_parser = subparsers.add_parser("unarchive", help="Unarchive plans")
    unarchive_parser.add_argument("plans", nargs="+", help="Plan files to restore")
    unarchive_parser.set_defaults(func=lambda args: cmd_unarchive(args))

    args = parser.parse_args()
    if not args.command:
        parser.print_help()
        sys.exit(1)

    args.func(args)


def cmd_check():
    broken = find_broken_links()
    if broken:
        print("[WARN] Broken links found:")
        for fpath, plan_name in broken:
            print(f"  {fpath} → references missing: {plan_name}")
        sys.exit(1)
    else:
        print("No broken links found")
        sys.exit(0)


def cmd_archive(args):
    success = True
    for plan in args.plans:
        # Ensure .md extension
        if not plan.endswith(".md"):
            plan += ".md"
        if not do_archive(plan, dry_run=args.dry_run):
            success = False
    sys.exit(0 if success else 1)


def cmd_unarchive(args):
    success = True
    for plan in args.plans:
        if not plan.endswith(".md"):
            plan += ".md"
        if not do_unarchive(plan):
            success = False
    sys.exit(0 if success else 1)


if __name__ == "__main__":
    main()
