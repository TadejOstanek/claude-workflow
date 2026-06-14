#!/usr/bin/env bash
# PreToolUse guard for the test-author agent.
# Allows Write/Edit ONLY to test files or configuration; blocks application code (owned by the implementer).
# Reads the hook JSON on stdin; exit 2 = block (stderr shown to the agent), exit 0 = allow.
set -euo pipefail
input="$(cat)"
path="$(printf '%s' "$input" | /usr/bin/python3 -c 'import sys,json;print(json.load(sys.stdin).get("tool_input",{}).get("file_path",""))' 2>/dev/null || true)"
[ -z "$path" ] && exit 0
base="$(basename "$path")"
# Allow: test files
if printf '%s' "$path" | grep -Eq '(/tests?/|/spec/|__tests__|/__mocks__/|/fixtures?/|/factories/)' \
  || printf '%s' "$base" | grep -Eq '^(test_.*|conftest)\.py$|_test\.(py|go|rb)$|\.(test|spec)\.(js|jsx|ts|tsx|mjs|cjs)$|_spec\.rb$|Test\.(java|kt|php|cs)$'; then
  exit 0
fi
# Allow: common configuration files
if printf '%s' "$base" | grep -Eq '^(pyproject\.toml|setup\.cfg|setup\.py|pytest\.ini|tox\.ini|mypy\.ini|\.flake8|\.coveragerc|package\.json|jest\.config\..*|vitest\.config\..*|\.eslintrc.*|tsconfig.*\.json|Makefile|peel\.yml)$'; then
  exit 0
fi
echo "BLOCKED: the test-author agent may modify only test files or configuration ($path). Application code is owned by the implementer agent." >&2
exit 2
