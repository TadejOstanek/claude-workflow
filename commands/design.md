---
description: Run the Code Design stage for the next phase — specify exact interfaces and test behaviors, create the branch. Writes <phase>/code-design.md. Last interactive stage before the autonomous loop.
argument-hint: [phase slug] — blank to use the next phase needing design
---

# /workflow:design

Apply the `workflow:code-design` skill. Read `workflow:workflow-conventions` for the file/GATE format.

1. Resolve the active workflow from `state.json`. Read `state.json`, the epic `spec.md` + `architecture.md`, and
   **this phase's behavioral spec — the OpenSpec change at `openspec/changes/<change>/`** (`proposal.md` +
   `specs/**/*.md`; the `change` id is in `state.json`). If a phase slug is given in `$ARGUMENTS` use it; else pick
   the lowest-`order` phase whose `code-design` stage is `pending` (respect `depends_on`). The phase's `stages.spec`
   must be `done` (its OpenSpec change must exist) — if not, stop and tell the user to run `/workflow:phase-spec`
   first. Also read that phase's own `architecture.md` if present.
2. Offer the user the option to add a phase-specific `architecture.md` for this phase before designing (the
   behavioral spec already lives in the OpenSpec change) — do not skip the offer.
3. If `<phase>/code-design.md` already exists (returning), read it + later files to learn why, then refine.
4. Run the stage interactively per the skill — exact interfaces, components, test behaviors, discovered conventions.
   If the architecture proves infeasible, stop and send the user back to `/workflow:arch`.
5. Prepare implementation: prompt for the **ticket number**; create the branch `{user}/sc-{ticket}/{desc}`; ask
   whether to use a **worktree**. Record `ticket`, `branch`, `worktree` in `state.json`.
6. Write `.workflow/<feature>/<phase>/code-design.md` (interfaces, components, tests, conventions; checkboxes + `## GATE`).
7. Update `state.json` (phase `stages["code-design"]="done"`, `currentStage="build"`, append transition) and tick `OVERVIEW.md`.
8. Get the user's explicit approval of the design. Then tell them to `/clear` and run `/workflow:build` to run the
   autonomous loop for this phase.
