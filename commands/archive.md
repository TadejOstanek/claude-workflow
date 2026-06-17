---
description: Merge a shipped phase's spec into the canonical library — run AFTER its PR merges. Wraps `openspec archive`.
argument-hint: [phase slug or change id] — blank to pick a phase whose PR has merged
---

# /workflow:archive

Read `workflow:workflow-conventions` (the OpenSpec integration section). Run this **after a phase's PR has merged**
— it folds that phase's spec deltas into the canonical `openspec/specs/` and moves the change to
`changes/archive/`. Never run it on an open draft PR: the canonical library must reflect only merged behavior.
Requires the `openspec` CLI (`@fission-ai/openspec`).

## Steps
1. Resolve the phase from `$ARGUMENTS` (phase slug or change id); else from `state.json` pick a phase whose `pr` is
   `done` and `archive` is `pending`. Get its `change` id. If `change` is null, stop — the phase has no OpenSpec
   spec to merge.
2. Confirm the PR actually merged (e.g. `gh pr view <branch> --json state,mergedAt`). If it has not merged, warn and
   ask before proceeding.
3. Apply it:
   ```bash
   openspec archive "<change-id>"      # shows the spec diff and prompts before applying
   # or, once you're sure:
   openspec archive -y "<change-id>"
   ```
   This validates, merges the change's ADDED/MODIFIED/REMOVED/RENAMED deltas into
   `openspec/specs/<capability>/spec.md`, and moves the change to `openspec/changes/archive/YYYY-MM-DD-<change-id>/`.
   For a tooling- or doc-only change with no spec deltas, use `--skip-specs`.
4. Set this phase's `stages.archive = "done"` in `state.json`, append a `transitions` entry, tick the phase's
   archive box in `OVERVIEW.md`, and report which capabilities the canonical library gained/changed.
