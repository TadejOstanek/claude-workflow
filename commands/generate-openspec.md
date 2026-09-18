---
description: Optionally export a landed change to OpenSpec — author + merge an OpenSpec change from spec.md and the build docs. Standalone, runs any time after review has committed the change (even after its PR is open).
argument-hint: [change slug] — blank to use the current branch's change
---

# /workflow:generate-openspec

Apply the `workflow:generate-openspec` skill. Read `workflow:workflow-conventions` for the GATE-adjacent output
format, plus its reference file
`${CLAUDE_PLUGIN_ROOT}/skills/workflow-conventions/reference/openspec-integration.md` for every OpenSpec mechanic
(this is the **only** command that reads that file).

This is **not** part of `/workflow:build` — it never runs automatically, and running it (or not) has no effect on
any other stage's status. It exists purely because the user asked for it, right now, for this one change.

## 1. Resolve the change
Find the active workflow under `.workflow/` from `state.json`. Use the change in `$ARGUMENTS`, else resolve via the
current branch (`git rev-parse --abbrev-ref HEAD`, matched against `changes[].branch`) — mirror
`/workflow:insights`' blank-argument resolution, including its "ask the user to pick" fallback when ambiguous. The
change's `stages.review` must be `"done"` (its code must already be committed) — if not, **stop**: there's nothing
built yet to export.

## 2. Confirm
Ask the user to confirm they want to export this change to OpenSpec now. This is always opt-in, every time, even
for a repo that exports every change — never skip the ask because a prior change in this workflow was exported.

## 3. Checkout safety
Run the checkout-safety check (`workflow:workflow-conventions`' git-safety reference): clean tree, currently on
this change's `branch`. If not, stop and ask the user to resolve it — this command adds a commit to that existing
branch, whatever state its PR is in (draft, open for review, or already merged and the branch still exists locally).

## 4. Author + merge
Follow the `workflow:generate-openspec` skill: read `spec.md` + the build docs, pick/init `specRoot`, author
`proposal.md` + `specs/**` deltas translating each Acceptance Criteria checkbox into OpenSpec scenarios grounded in
what was actually built, confirm scope with the user, `openspec validate`, `openspec archive -y`, backfill any
Purpose placeholder, commit (openspec paths only).

## 5. Finalize
Write `.workflow/<feature>/<change>/openspec-export.md` per the skill's Output format — this file, not
`state.json`, is the record that this change was exported. Tell the user what the canonical library gained/
changed, and that it's committed onto the change's existing branch — if that branch already has an open PR, the
commit just landed on it; if the PR already merged, tell them this commit is only local until they push/merge it
themselves.
