---
description: Run the Code Design stage for a change — specify exact interfaces and test behaviors, provision the branch for a spec-less change. Writes code-design.md. Last interactive stage before the autonomous loop.
argument-hint: [change slug] — blank to use the next change needing design
---

# /workflow:design

Apply the `workflow:code-design` skill. Read `workflow:workflow-conventions` for the file/GATE format.

1. Resolve the active workflow from `state.json`. Read `state.json` and the epic `architecture.md` if present. Use
   the change in `$ARGUMENTS`, else the lowest-`order` change whose `code-design` stage is `pending` (respect
   `depends_on`); in `single` mode, if none is `pending` (you're **refining** an already-designed change), default
   to the sole change — `epic` mode requires naming it. For a **spec-bearing** change (`spec:"openspec"`), its
   `stages.specify` must be `done` (the OpenSpec change must exist) — if not, stop and tell the user to run
   `/workflow:propose` + `/workflow:specify` first. Its branch/worktree were already provisioned by
   `/workflow:propose` (per `workflow:workflow-conventions` — "Branch/worktree provisioning"); compute `baseDir` =
   this change's `worktree` if set, else the repo root, then read **this change's behavioral spec — the OpenSpec
   change at `<baseDir>/<specRoot>/openspec/changes/<change>/`** (`proposal.md` + `specs/**/*.md`). A **spec-less**
   change (`spec:"none"`) has no spec prerequisite (`propose`/`specify` are `na`) and no OpenSpec change to read —
   proceed; its intent comes from the feature description / epic `architecture.md`, and its branch/worktree aren't
   provisioned yet (that happens in step 5 below). Also read the change's own `architecture.md` if present.
2. Offer the user the option to add a per-change `architecture.md` before designing (the behavioral spec already
   lives in the OpenSpec change) — do not skip the offer.
3. If `<change>/code-design.md` already exists (returning), read it + later files to learn why, then refine.
4. Run the stage interactively per the skill — exact interfaces, components, test behaviors, discovered conventions.
   If the architecture proves infeasible, stop and send the user back (epic: `/workflow:arch`; single: revisit the spec).
5. **Branch/worktree.** Spec-bearing change → already provisioned (step 1's `baseDir`); just confirm you're reusing
   the existing `ticket`/`branch`/`worktree` — never re-prompt or re-create. Spec-less change → this is its first
   committable stage, so provision now per `workflow:workflow-conventions`: prompt for the **ticket number**, create
   the branch `{user}/sc-{ticket}/{desc}`, ask whether to use a **worktree**, and record `ticket`, `branch`,
   `worktree` on this change in `state.json` — unless `state.json` already has them for this change (re-designing
   during iteration), in which case reuse without re-prompting.
6. Write `.workflow/<feature>/<change>/code-design.md` (interfaces, components, tests, conventions; checkboxes + `## GATE`).
7. Update `state.json` (change `stages["code-design"]="done"`, `currentStage="build"`, append a transition).
8. Get the user's explicit approval. Then tell them to `/clear` and run `/workflow:build` for this change.
9. **Iterating?** If any later stage (`test-lint`/`review`/`docs`/`qa`/`pr`) was already `done` before this
   re-design, those outputs now describe **older** code — say so, and leave them as-is (do **not** flip them to
   `pending`; the user decides what to redo). Give the exact redo command for what they want, e.g.
   `/workflow:build <change> only build commit` (re-implement + land, no review/QA/PR rewrite).
