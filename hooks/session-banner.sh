#!/usr/bin/env bash
# SessionStart hook: if the repo has any active workflow, print a one-line resume banner.
# stdout is injected into the session context, so a freshly /clear'd or reopened session knows where to pick up.
set -euo pipefail
shopt -s nullglob
for f in .workflow/*/state.json; do
  /usr/bin/python3 - "$f" <<'PY' 2>/dev/null || true
import json,sys
try:
    d=json.load(open(sys.argv[1]))
except Exception:
    sys.exit(0)
title=d.get("title") or d.get("feature","?")
stage=d.get("currentStage","?")
nxt={"spec":"/workflow:spec","architecture":"/workflow:arch","design":"/workflow:design","build":"/workflow:build"}.get(stage,"/workflow:start")
print(f'[workflow] "{title}" — stage: {stage}. Resume with {nxt} (after /clear).')
PY
done
exit 0
