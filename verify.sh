#!/bin/bash

# {{PROJECT_NAME}} local verification script for macOS (Modular Version)
# Fatal Constraint: Main script must be under 500 lines.

set -euo pipefail

# Repo root: must not depend on caller cwd (e.g. ~/path/to/emr/verify.sh from ~)
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
export ROOT
cd "$ROOT"

# --- Start Information ---
echo -e "\033[0;36mStarted verification at $(date) on $(hostname)\033[0m"

# --- Load Modules ---
# shellcheck source=scripts/verify/common.sh
source "$ROOT/scripts/verify/common.sh"
# shellcheck source=scripts/verify/report.sh
source "$ROOT/scripts/verify/report.sh"
# shellcheck source=scripts/verify/infra.sh
source "$ROOT/scripts/verify/infra.sh"
# shellcheck source=scripts/verify/modes.sh
source "$ROOT/scripts/verify/modes.sh"
# shellcheck source=scripts/verify/frontend.sh
source "$ROOT/scripts/verify/frontend.sh"
# shellcheck source=scripts/verify/backend.sh
source "$ROOT/scripts/verify/backend.sh"
# shellcheck source=scripts/verify/docs.sh
source "$ROOT/scripts/verify/docs.sh"
# shellcheck source=scripts/verify/agentic_env.sh
source "$ROOT/scripts/verify/agentic_env.sh"

# --- Global Configuration ---
export VERIFY_ENV_CHECK=${VERIFY_ENV_CHECK:-auto}
export VERIFY_AGENT_LOOP=${VERIFY_AGENT_LOOP:-1}
export PYTEST_TARGET=${PYTEST_TARGET:-""}
export TDD_GATE_ENABLED=${TDD_GATE_ENABLED:-1}
export TDD_GATE_BASE_REF=${TDD_GATE_BASE_REF:-HEAD}

# --- Venv & Python Setup ---
if [ -d "$ROOT/.venv" ]; then
    VENV_BIN="$ROOT/.venv/bin"
    export PATH="$VENV_BIN:$PATH"
elif [ -d "$ROOT/venv" ]; then
    VENV_BIN="$ROOT/venv/bin"
    export PATH="$VENV_BIN:$PATH"
fi

# Ensure uv sync if needed
if command -v uv > /dev/null 2>&1; then
    export UV_CACHE_DIR="$ROOT/.uv_cache"
    # Logic moved to main for simplicity or could be in infra.sh
    # We'll keep a minimal version here or move to infra.sh
    if [ "${VERIFY_UV_SYNC:-auto}" = "1" ] || [[ "${VERIFY_UV_SYNC:-auto}" = "auto" && "${CI:-}" = "true" ]]; then
        echo -e "\033[0;90m[VENV] uv sync...\033[0m"
        uv sync --no-managed-python --python "$(which python3.14)" > /dev/null 2>&1 || true
    fi
fi

# --- Execution ---

# 1. Dependency & Mode Config
if should_run_env_check; then
    verify_dependencies || exit 1
fi

echo -e "\n\033[0;36m=== Verify Mode ===\033[0m"
configure_verify_mode
echo -e "  Mode: \033[0;32m$VERIFY_MODE\033[0m"

# [Task 2.1] Verification 전용 임시 DB 환경 — 백엔드/pytest 실행 시에만 격리 DB 생성
if [[ "$RUN_BACKEND" -eq 1 || "$RUN_PYTEST" -eq 1 ]]; then
    setup_db_isolation
fi
echo -e "  Run frontend: $RUN_FRONTEND | backend: $RUN_BACKEND | docs: $RUN_DOCS | pytest: $RUN_PYTEST"

# 2. Infrastructure Health
if [[ "$RUN_BACKEND" -eq 1 || "$RUN_PYTEST" -eq 1 ]]; then
    check_infrastructure_health || exit 1
fi

# 3. Step Invocation Helper (Mainly used by modules or here)
invoke_step() {
    local label="$1"
    local working_dir="$2"
    local capture_output="$3"
    shift 3

    local timeout_secs=300
    if [[ "${1:-}" =~ ^[0-9]+$ ]]; then
        timeout_secs="$1"
        shift
    fi
    local cmd_args=("$@")

    VERIFY_STEPS+=("$label:true")
    write_step "$label"
    local start_time
    start_time=$(start_timing)

    local current_pwd
    current_pwd=$(pwd)
    [ -n "$working_dir" ] && cd "$working_dir"

    local status=0
    local step_log_path
    step_log_path=$(get_step_log_path "$label")

    if [ "$capture_output" = "true" ]; then
        verify_timeout_cmd "$timeout_secs" "${cmd_args[@]}" 2>&1 | tee "$step_log_path" || status=$?
    else
        verify_timeout_cmd "$timeout_secs" "${cmd_args[@]}" || status=$?
    fi

    if [ "$status" -eq 124 ]; then
        echo -e "\033[0;31m[TIMEOUT] $label exceeded ${timeout_secs}s\033[0m"
    fi

    if [ "$status" -ne 0 ]; then
        echo -e "\033[0;31mFAILED: $label (exit $status)\033[0m"
        if [ "$capture_output" = "true" ] && [ -f "$step_log_path" ]; then
            echo "--- FULL OUTPUT FROM $label ---" > "$PYTEST_FAILURES_PATH"
            cat "$step_log_path" >> "$PYTEST_FAILURES_PATH"
        fi
        cd "$current_pwd"
        stop_timing "$label" "$start_time"
        fail_verify "$status" "$label" ""
    fi

    cd "$current_pwd"
    stop_timing "$label" "$start_time"
    serialize_state
    save_verify_result 0 "" ""
}
export -f invoke_step # Make it available to modules if they use it via subshell but they source it so it's fine

tdd_gate_check() {
    if [[ "$TDD_GATE_ENABLED" != "1" ]]; then
        echo -e "\033[0;90m[TDD Gate] skipped (TDD_GATE_ENABLED=$TDD_GATE_ENABLED)\033[0m"
        return
    fi

    echo -e "\n\033[0;36m=== TDD Gate ===\033[0m"
    local changed_files
    local test_files_changed
    local code_files_changed
    local no_assert_files
    local has_diff
    local file

    changed_files="$(git diff --name-only "$TDD_GATE_BASE_REF" || true)"
    changed_files+=$'\n'"$(git diff --name-only --cached "$TDD_GATE_BASE_REF" || true)"
    changed_files="$(printf '%s\n' "$changed_files" | sed '/^$/d' | sort -u)"

    has_diff="$(printf '%s\n' "$changed_files" | sed '/^$/d' || true)"
    if [[ -z "$has_diff" ]]; then
        echo -e "\033[0;90m[TDD Gate] no changed files detected against $TDD_GATE_BASE_REF; skipping diff-based checks\033[0m"
        return
    fi

    test_files_changed="$(printf '%s\n' "$changed_files" | rg '^(tests)/.*\.py$|/(e2e|tests)/.*\.spec\.ts$|\.(test|spec)\.(ts|tsx)$' | grep -v '^tests/mocks/' || true)"
    code_files_changed="$(printf '%s\n' "$changed_files" | rg '^(src|app|apps|packages|services)/.*\.(py|ts|tsx|js|jsx|cs)$' || true)"

    # Intelligent Filter: If changes are purely non-code (docs, config, etc.), pass immediately
    if [[ -z "$code_files_changed" && -z "$test_files_changed" ]]; then
        echo -e "\033[0;90m[TDD Gate] skipping: only documentation or non-code files changed\033[0m"
        return
    fi

    if [[ -n "$code_files_changed" && -z "$test_files_changed" ]]; then
        # 존재하지 않는 파일(삭제된 파일)은 제외하고 다시 체크
        local existing_code_changed=""
        while IFS= read -r file; do
            [[ -z "$file" ]] && continue
            if [[ -f "$file" ]]; then
                existing_code_changed+="${file}"$'\n'
            fi
        done <<< "$code_files_changed"

        if [[ -n "$existing_code_changed" ]]; then
            echo "❌ TDD Violation: 코드 변경이 감지되었지만 tests 변경이 없습니다."
            echo "$existing_code_changed"
            exit 1
        fi
    fi

    if [[ -n "$test_files_changed" ]]; then
        no_assert_files=""
        while IFS= read -r file; do
            [[ -z "$file" ]] && continue
            if [[ ! -f "$file" ]]; then
                continue
            fi
            # pytest conftest·tests/helpers 는 픽스처/유틸 전용이라 단언이 없을 수 있다.
            if [[ "$file" == tests/helpers/* || "$(basename "$file")" == "conftest.py" ]]; then
                continue
            fi
            if ! rg -q 'assert |pytest\.raises|self\.assert|expect\(|toBeVisible|toContainText|Assert\.True|Assert\.Equal' "$file"; then
                no_assert_files+="${file}"$'\n'
            fi
        done <<< "$test_files_changed"

        if [[ -n "$no_assert_files" ]]; then
            echo "❌ TDD Violation: assertion 없는 테스트 파일이 있습니다."
            printf "%s" "$no_assert_files"
            exit 1
        fi
    fi

    echo -e "\033[0;32m[TDD Gate] passed\033[0m"
}

# DDD hard gate: keep dedicated wrapper so failedStep is stable.
run_ddd_boundary_gate_step() {
    echo -e "\n\033[0;36m=== DDD Boundary Gate ===\033[0m"
    invoke_step "ddd-boundary-gate" "$ROOT" false python3 scripts/verify_ddd_boundaries.py
}

run_jsx_casing_gate_step() {
    echo -e "\n\033[0;36m=== JSX Casing Gate ===\033[0m"
    invoke_step "jsx-casing-gate" "$ROOT" false python3 scripts/casing_scan.py --path {{FRONTEND_APP_PATH}}/src --fail-on-count 0
}

run_no_gate_downgrade_step() {
    echo -e "\n\033[0;36m=== Gate Downgrade Guard ===\033[0m"
    invoke_step "no-gate-downgrade" "$ROOT" false python3 scripts/verify_no_gate_downgrade.py
}

run_root_clutter_gate_step() {
    echo -e "\n\033[0;36m=== Root Clutter Gate ===\033[0m"
    invoke_step "root-clutter-gate" "$ROOT" false python3 scripts/verify_root_clutter.py
}

# 4. Run Tiers (에이전트 환경 일관성은 프론트/백엔드 도구 전에 먼저 수행)
tdd_gate_check
run_ddd_boundary_gate_step
run_jsx_casing_gate_step
run_no_gate_downgrade_step
run_root_clutter_gate_step
run_agentic_env_steps
run_frontend_steps
run_backend_steps
run_pytest_steps
run_docs_steps

# --- Finalize ---
serialize_state

# Check Korean text warning flag (Loose Mode only)
# Strict Mode: WARNING는 docs.sh에서 이미 fail_verify로 처리됨
KOREAN_WARNING=0
if [ -f "$ROOT/.korean-text-warning" ]; then
    KOREAN_WARNING=1
    echo -e "\n\033[0;33m[WARNING] Korean text check had warnings in this session.\033[0m"
    echo -e "         Please review verify-korean-text-result.json for details."
    # Clean up warning flag
    rm -f "$ROOT/.korean-text-warning"
fi

save_verify_result 0 "" ""

# Report Korean text warning to user (if in interactive mode AND Loose Mode)
if [ "$KOREAN_WARNING" -eq 1 ] && [ "${CI:-}" != "true" ] && [ "${KOREAN_TEXT_STRICT_MODE:-1}" -eq 0 ]; then
    echo -e "\n\033[0;33m============================================================\033[0m"
    echo -e "\033[0;33m[WARNING] Korean Text Check: Warnings were detected\033[0m"
    echo -e "\033[0;33m============================================================\033[0m"
    echo -e "Please review the detailed report:"
    echo -e "  - JSON result: \033[36mverify-korean-text-result.json\033[0m"
    echo -e "  - Console output: \033[36mverify-korean-text-output.txt\033[0m"
    echo -e ""
    echo -e "If warnings indicate actual contamination, please fix the issues."
    echo -e "If warnings are false positives, you may add exceptions to"
    echo -e "  \033[36mscripts/verify_korean_text.py\033[0m (ALLOWED_HANJA_WORDS or patterns)."
    echo -e "\033[0;33m============================================================\033[0m"
fi

echo -e "\n\033[0;32mVerification complete.\033[0m"

# Timing Summary
if [ ${#TIMINGS[@]} -gt 0 ]; then
    echo -e "\033[0;36m--- Timing Summary ---\033[0m"
    total_ms=0
    for t in "${TIMINGS[@]}"; do
        ms="${t##*:}"
        total_ms=$((total_ms + ms))
    done
    
    for t in "${TIMINGS[@]}"; do
        name="${t%:*}"
        ms="${t##*:}"
        pct=$(awk "BEGIN {printf \"%.1f\", (100 * $ms / $total_ms)}")
        printf "  %-40s %6dms (%6s%%)\n" "$name" "$ms" "$pct"
    done
    printf "  %-40s %6dms\n" "TOTAL" "$total_ms"
fi

exit 0
