#!/usr/bin/env bash
# PreToolUse guard for the implementer agent.
# Blocks any Write/Edit whose target path looks like a TEST file — tests are owned by the test-author agent.
# Reads the hook JSON on stdin; exit 2 = block (stderr shown to the agent), exit 0 = allow.
set -euo pipefail
input="$(cat)"
path="$(printf '%s' "$input" | /usr/bin/python3 -c 'import sys,json;print(json.load(sys.stdin).get("tool_input",{}).get("file_path",""))' 2>/dev/null || true)"
[ -z "$path" ] && exit 0
base="$(basename "$path")"
if printf '%s' "$path" | grep -Eq '(/tests?/|/spec/|__tests__|/__mocks__/)' \
  || printf '%s' "$base" | grep -Eq '^(test_.*|conftest)\.py$|_test\.(py|go|rb)$|\.(test|spec)\.(js|jsx|ts|tsx|mjs|cjs)$|_spec\.rb$|Test\.(java|kt|php|cs)$'; then
  echo "BLOCKED: the implementer agent must not modify test files ($path). Tests are owned by the test-author agent." >&2
  exit 2
fi
exit 0
