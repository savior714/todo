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

# Minimal CI gate for current repository state.
ci:
  @just lint-fix
  @just memory-verify
  @just stale-lib-ref
  @just verify
  @echo "ci: minimal checks passed"

# Verify MEMORY.md hygiene constraints.
memory-verify:
  @python3 scripts/memory/memory_verify.py

# Alias for plan-lint (AGENTS.md §7.1 reference).
plan-lint: lint-fix

# Run full verification gate: lint + typecheck + test.
verify:
  @bun install --quiet && bun run lint && bun run typecheck:strict && bun run test

# Detect stale lib/ path references in test files.
stale-lib-ref:
  @python3 scripts/verify/stale_lib_ref_gate.py --check

# Update blueprint task status to done and flag Conclusion placeholder.
# Usage: just plan-task-close (uses default blueprint path)
plan-task-close:
  @python3 scripts/plan_loop/plan_close.py task-close

# Close blueprint: update status to done.
# Usage: just plan-close (uses default blueprint path)
plan-close:
  @python3 scripts/plan_loop/plan_close.py close

# Integration tests (Server Actions + DB)
test-integration:
	bun test tests/integration/

# Run all tests (contract + unit + integration)
test-all:
	node --test tests/e2e/*.test.mjs && bun test tests/unit/ && bun test tests/integration/

# --- Bootstrap kernel recipes ---

# Turn-end gate
lint-turn-end:
	@echo "Turn-end gate"
	@just verify

# Plan preread
plan-preread plan="" *args="":
	@if [ -z "{{plan}}" ]; then echo "Usage: just plan-preread docs/plans/<file>.md --write"; exit 1; fi
	@python3 scripts/plan_loop/plan_preread_manifest.py "{{plan}}" {{args}}

# Plan lint with preread support
plan-lint-ci:
	@echo "Verifying all blueprints (no Linear ensure)..."
	@if ls docs/plans/*.md >/dev/null 2>&1; then \
		for file in docs/plans/*.md; do \
			case "$file" in README.md|ROADMAP.md) continue ;; esac; \
			python3 scripts/plan_loop/plan_lint.py --skip-linear-ensure "$file"; \
		done; \
	else \
		echo "no plan markdown files found under docs/plans"; \
	fi

# Route context loading
route *files:
	@python3 scripts/agent/route_context.py {{files}}

route-touched *args="":
	@python3 scripts/agent/route_touched.py {{args}}

route-read *paths:
	@python3 scripts/agent/route_gate.py record-read {{paths}}

route-gate-check *paths:
	@python3 scripts/agent/route_gate.py check {{paths}}

# Agent lint + verification
agent-lint:
	@echo "Verifying agent rule files..."
	@python3 scripts/agent/verify_rules.py
	@echo "Agent secret policy..."
	@python3 scripts/agent/verify_agent_secret_policy.py

# Error patterns utilities
error-patterns-sort-check:
	@python3 scripts/error_patterns/check_old_string.py --sort-check

error-patterns-add name="" symptom="" cause="" fix="":
	@if [ -z "{{name}}" ] || [ -z "{{symptom}}" ] || [ -z "{{cause}}" ] || [ -z "{{fix}}" ]; then \
		echo "Usage: just error-patterns-add name='...' symptom='...' cause='...' fix='...'"; exit 1; \
	fi
	@python3 scripts/error_patterns/add_pattern.py --name "{{name}}" --symptom "{{symptom}}" --cause "{{cause}}" --fix "{{fix}}"
