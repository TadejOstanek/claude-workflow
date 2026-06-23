---
description: Merge a finished change's spec into the canonical library — a manual step you run when you're sure the change is done. Wraps `openspec archive`.
argument-hint: [change slug or change id] — blank to pick the next change ready to archive
---

# /workflow:archive

Read `workflow:workflow-conventions` (the OpenSpec integration section). This is a **deliberate manual step** — run
it yourself when you are sure the change is fully done. It merges the change's spec deltas into the canonical
`<specRoot>/openspec/specs/` (the change's OpenSpec root, default repo root) and moves the change to
`changes/archive/`. It is **not** automated by the loop. Requires the
`openspec` CLI (`@fission-ai/openspec`).

**When to run it:** typically on the change's branch *before merging*, so the canonical spec ships in the same PR —
or after merge; your call. Just don't archive a change you might still revise (the deltas fold in irreversibly).

## Steps
1. Resolve the change from `$ARGUMENTS` (change slug or id); else from `state.json` pick a change whose `pr` is
   `done` and `archive` is `pending`. Get its `change` id and `specRoot` (default `"."`). If `change` is null, stop
   — there's no spec to merge.
2. Review, then apply — **run from `specRoot`** (the CLI merges into `<cwd>/openspec/`):
   ```bash
   (cd "<specRoot>" && openspec archive "<change-id>")      # shows the spec diff and prompts before applying
   # or, once you're sure:
   (cd "<specRoot>" && openspec archive -y "<change-id>")
   ```
   This validates, merges the change's ADDED/MODIFIED/REMOVED/RENAMED deltas into
   `<specRoot>/openspec/specs/<capability>/spec.md`, and moves the change to
   `<specRoot>/openspec/changes/archive/YYYY-MM-DD-<change-id>/`.
   For a tooling- or doc-only change with no spec deltas, use `--skip-specs`. If you ran it on the branch, commit
   the result so it lands in the PR.
3. Set this change's `stages.archive = "done"` in `state.json`, append a `transitions` entry, and report which
   capabilities the canonical library gained or changed.
