---
description: Run the Code Design stage for a change — specify exact interfaces and test behaviors, create the branch. Writes code-design.md. Last interactive stage before the autonomous loop.
argument-hint: [change slug] — blank to use the next change needing design
---

# /workflow:design

Apply the `workflow:code-design` skill. Read `workflow:workflow-conventions` for the file/GATE format.

1. Resolve the active workflow from `state.json`. Read `state.json` and the epic `architecture.md` if present.
   For a **spec-bearing** change (`spec:"openspec"`), also read **this change's behavioral spec — the OpenSpec
   change at `<specRoot>/openspec/changes/<change>/`** (`proposal.md` + `specs/**/*.md`; the `change` id and
   `specRoot` (default `"."`) are in `state.json`). For a **spec-less** change (`spec:"none"`) there is no OpenSpec
   change — its intent comes from the feature description / epic `architecture.md`. Use the change in
   `$ARGUMENTS`, else the lowest-`order`
   change whose `code-design` stage is `pending` (respect `depends_on`); in `single` mode, if none is `pending`
   (you're **refining** an already-designed change), default to the sole change — `epic` mode requires naming it.
   For a spec-bearing change, its `stages.specify` must be `done` (the OpenSpec change must exist) — if not, stop
   and tell the user to run `/workflow:propose` + `/workflow:specify` first. A `spec:"none"` change has no spec
   prerequisite (`propose`/`specify` are `na`) — proceed. Also read the change's own `architecture.md` if present.
2. **Data model must be decided first.** Check this change's `stages.architecture`:
   - **`pending`** — the data-model & structural-fit pass hasn't run. **Stop** and tell the user to run
     `/workflow:arch` first; that stage owns the data model, and `code-design` treats it as decided input.
   - **`done`** — you already read the change's `architecture.md` in step 1; use it as the decided data model.
   - **`na` or absent** — skipped (or a change with no data-model dimension / created before this stage). Proceed —
     but if you discover mid-design that a data-model or structural question actually needs deciding, **stop and send
     the user to `/workflow:arch <change>`** rather than modeling it inline.
3. If `<change>/code-design.md` already exists (returning), read it + later files to learn why, then refine.
4. Run the stage interactively per the skill — exact interfaces, components, test behaviors, discovered conventions
   (use `orchestration:lookup`/`orchestration:investigate` for the conventions discovery).
   If the architecture proves infeasible, stop and send the user back to `/workflow:arch` (with what you learned) —
   for an epic that's the epic arch; for a single change, `/workflow:arch <change>`.
5. **Branch.** If `state.json` already has a `branch` for this change (you're re-designing during iteration), reuse
   it — keep the existing `ticket`/`branch`, do not prompt or re-create. Otherwise, check **checkout safety** first
   (`workflow:workflow-conventions`): the working tree must be clean and currently on `main`. If it's dirty or on a
   different branch (e.g. another in-progress change owns the checkout), **stop and tell the user** what's checked
   out and what this change needs, and let them resolve it — never switch over foreign work. Once safe, prompt for
   the **ticket number**, create the branch `{user}/sc-{ticket}/{desc}` off `main` (`git checkout -b <branch> main`
   — this switches the current checkout onto it, carrying forward any uncommitted OpenSpec files written before the
   branch existed), and record `ticket`, `branch` on this change in `state.json`.
6. Write `.workflow/<feature>/<change>/code-design.md` (interfaces, components, tests, conventions; checkboxes + `## GATE`).
7. Update `state.json` (change `stages["code-design"]="done"`, `currentStage="build"`, append a transition).
8. Get the user's explicit approval. Then tell them to `/clear` and run `/workflow:build` for this change.
9. **Iterating?** If any later stage (`test-lint`/`review`/`pr`) was already `done` before this re-design, those
   outputs now describe **older** code — say so, and leave them as-is (do **not** flip them to `pending`; the user
   decides what to redo). Give the exact redo command for what they want, e.g.
   `/workflow:build <change> only build commit` (re-implement + land, no review/PR rewrite).
