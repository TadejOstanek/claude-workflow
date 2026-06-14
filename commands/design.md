---
description: Run the Code Design stage for the next phase — specify exact interfaces and test behaviors, create the branch. Writes <phase>/code-design.md. Last interactive stage before the autonomous loop.
argument-hint: [phase slug] — blank to use the next phase needing design
---

# /workflow:design

Apply the `workflow:code-design` skill. Read `workflow:workflow-conventions` for the file/GATE format.

1. Resolve the active workflow from `state.json`. Read `state.json`, `spec.md`, `architecture.md`. If a phase slug
   is given in `$ARGUMENTS` use it; else pick the lowest-`order` phase whose `code-design` stage is `pending`
   (respecting `depends_on`). Also read that phase's own `spec.md`/`architecture.md` if present.
2. Offer the user the option to add a phase-specific `spec.md`/`architecture.md` for this phase before designing —
   do not skip the offer, even if they'll inherit the epic docs.
3. If `<phase>/code-design.md` already exists (returning), read it + later files to learn why, then refine.
4. Run the stage interactively per the skill — exact interfaces, components, test behaviors, discovered conventions.
   If the architecture proves infeasible, stop and send the user back to `/workflow:arch`.
5. Prepare implementation: prompt for the **ticket number**; create the branch `{user}/sc-{ticket}/{desc}`; ask
   whether to use a **worktree**. Record `ticket`, `branch`, `worktree` in `state.json`.
6. Write `.workflow/<feature>/<phase>/code-design.md` (interfaces, components, tests, conventions; checkboxes + `## GATE`).
7. Update `state.json` (phase `stages["code-design"]="done"`, `currentStage="build"`, append transition) and tick `OVERVIEW.md`.
8. Get the user's explicit approval of the design. Then tell them to `/clear` and run `/workflow:build` to run the
   autonomous loop for this phase.
