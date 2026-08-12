---
description: Run the Code Design stage for a change — specify exact interfaces and test behaviors, create the branch. Writes code-design.md. Last interactive stage before the autonomous loop.
argument-hint: [change slug] — blank to use the next change needing design
---

# /workflow:design

Apply the `workflow:code-design` skill. Read `workflow:workflow-conventions` for the GATE format, plus its
reference files:
- `${CLAUDE_PLUGIN_ROOT}/skills/workflow-conventions/reference/state-and-layout.md` — file layout + `state.json` schema
- `${CLAUDE_PLUGIN_ROOT}/skills/workflow-conventions/reference/git-safety.md` — checkout safety + branch provisioning
- `${CLAUDE_PLUGIN_ROOT}/skills/workflow-conventions/reference/iterating.md` — only when re-designing a `done` change

1. Resolve the active workflow from `state.json`. Read `state.json` and the epic `architecture.md` if present.
   For a **spec-bearing** change (`spec:"openspec"`), also read **this change's behavioral spec — the OpenSpec
   change at `<specRoot>/openspec/changes/<change>/`** (`proposal.md` + `specs/**/*.md`; the `change` id and
   `specRoot` (default `"."`) are in `state.json`). For a **spec-less** change (`spec:"none"`) there is no OpenSpec
   change — its intent comes from the feature description / epic `architecture.md`. Use the change in
   `$ARGUMENTS`, else the lowest-`order`
   change whose `code-design` stage is `pending` (respect `depends_on`); in `single` mode, if none is `pending`
   (you're **refining** an already-designed change), default to the sole change — `epic` mode requires naming it.
   For a spec-bearing change, its `stages.propose` must be `done` (the OpenSpec change must exist) — if not, stop
   and tell the user to run `/workflow:propose` first. A `spec:"none"` change has no spec
   prerequisite (`propose` is `na`) — proceed. Also read the change's own `architecture.md` if present.
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
5. **Branch.** If `state.json` already has a `branch` for this change (re-designing), reuse it — keep the existing
   `ticket`/`branch`, don't re-create. Otherwise check **checkout safety** (the git-safety reference above): the
   tree must be clean and on `main`; if not, **stop and tell the user** to resolve it — never switch over foreign
   work. Once safe, prompt for the **ticket number**, create `{user}/sc-{ticket}/{desc}` off `main`
   (`git checkout -b <branch> main`), and record `ticket`, `branch` on this change in `state.json`.
6. Write `.workflow/<feature>/<change>/code-design.md` (interfaces, components, tests, conventions; checkboxes + `## GATE`).
7. **Adversarial critique — default-on, skippable.** Ask the user whether to run the `workflow:design-critic` agent
   against the drafted `code-design.md` (default: yes; skip only for a trivial/low-risk change). If run, spawn it
   with this change's `code-design.md`, `architecture.md` (if any), and OpenSpec change (if spec-bearing) — it
   writes `.workflow/<feature>/<change>/design-critique.md` and returns findings. Present any findings to the user
   next to the design. This is advisory, not a gate: if a finding reveals a real problem, revise `code-design.md`
   (re-running the critic afterward if the revision was substantial); proceeding without addressing a finding is
   the user's call, not yours.
8. Update `state.json` (change `stages["code-design"]="done"`, `currentStage="build"`, append a transition with
   `sessionId`, per the state-and-layout reference above).
9. Get the user's explicit approval. Then tell them to `/clear` and run `/workflow:build` for this change.
10. **Iterating?** If any later stage was already `done` before this re-design, its output now describes **older**
   code — leave stages as-is (the user decides what to redo, per the iterating reference above) and give the exact
   redo command, e.g. `/workflow:build <change> only build commit` (re-implement + land, no review/PR rewrite).
