set shell := ["zsh", "-cu"]

default:
  @just --list

# Create a lightweight WIP snapshot under .git-snapshots.
wip message:
  @mkdir -p ".git-snapshots"
  @ts="$(date +%Y%m%d_%H%M%S)"; \
  out=".git-snapshots/${ts}_{{message}}.patch"; \
  git status --short > "${out}.status"; \
  git diff > "${out}"; \
  echo "snapshot: ${out}"

# Lint all plan markdown files with the blueprint contract linter.
lint-fix:
  @if [ -f "scripts/plan_loop/plan_lint.py" ]; then \
    if ls docs/plans/*.md >/dev/null 2>&1; then \
      for file in docs/plans/*.md; do \
        python3 scripts/plan_loop/plan_lint.py "$file"; \
      done; \
    else \
      echo "no plan markdown files found under docs/plans"; \
    fi; \
  else \
    echo "missing scripts/plan_loop/plan_lint.py"; \
    exit 1; \
  fi

# Refresh a minimal active-plan index for quick status checks.
plans-index:
  @mkdir -p docs/plans
  @python3 -c 'import json, datetime, pathlib; p=pathlib.Path("docs/plans"); items=sorted([x.name for x in p.glob("*.md") if x.is_file() and x.name.lower()!="readme.md"]); out=p/"PLAN_STATUS.json"; out.write_text(json.dumps({"generated_at": datetime.datetime.now(datetime.UTC).isoformat(), "active_plans": items}, ensure_ascii=False, indent=2)+"\n", encoding="utf-8"); print(f"wrote {out}")'

# Minimal CI gate for current repository state.
ci:
  @just lint-fix
  @just plans-index
  @just memory-verify
  @echo "ci: minimal checks passed"

# Verify MEMORY.md hygiene constraints.
memory-verify:
  @python3 scripts/memory/memory_verify.py
