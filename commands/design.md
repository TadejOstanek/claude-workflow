---
description: Run the Code Design stage for a change — specify exact interfaces and test behaviors, create the branch. Writes code-design.md. Last interactive stage before the autonomous loop.
argument-hint: [change slug] — blank to use the next change needing design
---

# /workflow:design

Apply the `workflow:code-design` skill. Read `workflow:workflow-conventions` for the file/GATE format.

1. Resolve the active workflow from `state.json`. Read `state.json`, the epic `architecture.md` if present, and
   **this change's behavioral spec — the OpenSpec change at `openspec/changes/<change>/`** (`proposal.md` +
   `specs/**/*.md`; the `change` id is in `state.json`). Use the change in `$ARGUMENTS`, else the lowest-`order`
   change whose `code-design` stage is `pending` (respect `depends_on`). Its `stages.specify` must be `done` (the
   OpenSpec change must exist) — if not, stop and tell the user to run `/workflow:propose` + `/workflow:specify`
   first. Also read the change's own `architecture.md` if present.
2. Offer the user the option to add a per-change `architecture.md` before designing (the behavioral spec already
   lives in the OpenSpec change) — do not skip the offer.
3. If `<change>/code-design.md` already exists (returning), read it + later files to learn why, then refine.
4. Run the stage interactively per the skill — exact interfaces, components, test behaviors, discovered conventions.
   If the architecture proves infeasible, stop and send the user back (epic: `/workflow:arch`; single: revisit the spec).
5. Prepare implementation: prompt for the **ticket number**; create the branch `{user}/sc-{ticket}/{desc}`; ask
   whether to use a **worktree**. Record `ticket`, `branch`, `worktree` in `state.json`.
6. Write `.workflow/<feature>/<change>/code-design.md` (interfaces, components, tests, conventions; checkboxes + `## GATE`).
7. Update `state.json` (change `stages["code-design"]="done"`, `currentStage="build"`, append a transition).
8. Get the user's explicit approval. Then tell them to `/clear` and run `/workflow:build` for this change.
