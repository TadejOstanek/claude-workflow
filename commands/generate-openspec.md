---
description: Optionally export a landed change to OpenSpec — author + merge an OpenSpec change from spec.md and the build docs. Standalone, runs any time after review has committed the change (even after its PR is open).
argument-hint: [change slug] — blank to use the current branch's change
---

# /workflow:generate-openspec

Apply the `workflow:openspec-export` skill in full — it owns the method (opt-in confirm, checkout safety,
authoring + merging, the `openspec-export.md` output, and the closing report). This command only resolves the
change. Also read `workflow:workflow-conventions`, plus its reference file
`${CLAUDE_PLUGIN_ROOT}/skills/workflow-conventions/reference/openspec-integration.md` for every OpenSpec mechanic
(this is the **only** command that reads that file).

This is **not** part of `/workflow:build` — it never runs automatically, and running it (or not) has no effect on
any other stage's status.

## Resolve the change
Find the active workflow under `.workflow/` from `state.json`. Use the change in `$ARGUMENTS`, else resolve via the
current branch (`git rev-parse --abbrev-ref HEAD`, matched against `changes[].branch`); if no change
matches or several do, list the active workflows/changes (mirror `/workflow:start`'s blank-argument status listing)
and ask the user to pick. The change's `stages.review` must be `"done"` (its code must already be committed) — if
not, **stop**: there's nothing built yet to export.
