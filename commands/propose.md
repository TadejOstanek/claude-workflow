---
description: Author a change's spec.md — why + testable acceptance criteria — this workflow's own native spec of record.
argument-hint: [change slug] — blank to use the next change needing a spec
---

# /workflow:propose

Apply the `workflow:specification` skill in full — it owns the method (orienting, seeding `references.md`, talking
through `spec.md`, altitude, never-drop-requirement, output formats). This command only resolves the change and
routes to what's next. Also read `workflow:workflow-conventions`, plus its reference file
`${CLAUDE_PLUGIN_ROOT}/skills/workflow-conventions/reference/state-and-layout.md`.

## 1. Resolve the change
Find the active workflow under `.workflow/` from `state.json`. Use the change in `$ARGUMENTS`, else the
lowest-`order` change whose `stages.propose` is `pending` (respect `depends_on`). If the resolved change's
`stages.propose` is already `"done"`, **stop**: this stage is complete and this command does not re-open it —
tell the user any change to the spec now happens outside the workflow. For an `epic`, read `architecture.md`
for this change's scope; for a `single`, the feature description is the scope.

## 2. Run the skill's method
Follow the specification skill end to end for this change's scope: orient and seed `references.md`, then talk
through and write `spec.md`.

## 3. Finalize
Set this change's `stages.propose = "done"` and append a transition (include this session's `sessionId`, per the
state-and-layout reference above). Route by this change's `stages.architecture`:
- **`pending`** (the default — data modeling comes next): set `currentStage="architecture"` and tell the user to
  `/clear`, then run `/workflow:arch` (the data-model & structural-fit pass) and then `/workflow:design`.
- **`na`** (the user pre-skipped the architecture step): set `currentStage="design"` and tell the user to `/clear`,
  then run `/workflow:design`.
