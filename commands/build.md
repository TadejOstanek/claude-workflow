---
description: Run the autonomous loop for a change — implement+test always, then optional test/lint, review, draft PR. Launches a background Workflow; reports when it finishes.
argument-hint: [change slug] [full | light | only <stages> | skip <stages>] — stages: test-lint review pr commit
---

# /workflow:build

This command **authorizes** running the Workflow tool. Read `workflow:workflow-conventions` for the GATE format,
plus its reference files:
- `${CLAUDE_PLUGIN_ROOT}/skills/workflow-conventions/reference/state-and-layout.md`
- `${CLAUDE_PLUGIN_ROOT}/skills/workflow-conventions/reference/git-safety.md`
- `${CLAUDE_PLUGIN_ROOT}/skills/workflow-conventions/reference/test-runner-detection.md`
- `${CLAUDE_PLUGIN_ROOT}/skills/workflow-conventions/reference/iterating.md` — only if this is a redo

## 1. Resolve the change + compute what's left (you have filesystem access — the loop does not)
1. Find the active workflow under `.workflow/` from `state.json`. Pick the change from `$ARGUMENTS`, else the
   lowest-`order` change whose `code-design` is `done` and whose later stages aren't all `done` (respect
   `depends_on`; an `na` stage counts as satisfied here — e.g. a spec-less change's `archive:"na"` does **not** make
   it look unbuilt, so a fully-built spec-less change isn't auto-re-picked).
   `code-design` must be `done`; for a **spec-bearing** change (`spec:"openspec"`) `stages.propose` must also be
   `done` — if not, stop and point the user to `/workflow:propose` then `/workflow:design`. A **spec-less** change
   (`spec:"none"`) has `propose` as `na`, so only `code-design` is required. Note this change's `change`
   id, `specRoot` (default `"."`), and `ticket`/`branch` (both live on the change entry — see the state-and-layout
   reference above). For a spec-bearing change, its OpenSpec change — the behavioral spec the loop's
   agents read — lives at `<workdir>/<specRoot>/openspec/changes/<change>/` (`workdir` from step 4 below); you pass
   that absolute path as `changeDir`. For a spec-less change there is no OpenSpec change — pass `changeDir: null`
   (the loop then uses `code-design.md` as the whole contract). (`$ARGUMENTS` may also carry a stage selection — see
   step 2.)
   **Resolving the change when blank:** in `single` mode default to the sole change **even when it's fully built**
   (you're iterating), so `/workflow:build only build commit` resolves with no change name. In `epic` mode a
   fully-built change won't be auto-picked (no pending later stages) — name it to rebuild.
2. **Choose which stages to run — and whether to *resume* or *redo*.** The stages, in order, are `build` (the
   parallel implementer + test-author — they always run **together**), then `test-lint`, `review`, `pr` (the PR
   stage authors its own manual-QA section — there is no separate QA stage). Two modes, picked from `$ARGUMENTS`:
   - **Resume** (`full` or blank) — *finish an interrupted forward run.* Selected = all stages, then **subtract any
     already `done`** (a stage is done if `state.json` says `done` **or** its output file has a `## GATE` of
     `status: pass`; `pr` is done if a draft PR exists via `gh pr view`).
   - **Redo** (`light` / `only <stages>` / `skip <stages>`) — *re-run an explicit subset against amended inputs*
     (the non-waterfall path). Run **exactly** the selection, **without** subtracting `done`. `light` = just
     `build`; `only <stages>` = exactly those (e.g. `only build` to re-implement, `only build commit` to
     re-implement and land it); `skip <stages>` = every stage except those. Redo trusts your selection — it runs
     what you name even if an upstream stage isn't built.

   Build `pendingStages` from the mode above and pass it to the loop; unselected stages are omitted (the loop skips
   them). **`archive` is never in the loop** — it's the manual `/workflow:archive`.
   - **Landing the code — who commits:** `review` commits when it runs; with `review` skipped, `pr` commits (and
     opens/updates the draft PR, **rewriting its body**). To land re-built code **without** touching the PR
     description, add the **`commit`** token (redo only): it commits + pushes this change's files and nothing else —
     an existing draft PR picks up the push automatically, body untouched. `commit` is inert if `pr` is also
     selected (pr does the commit). Select **none** of `review`/`pr`/`commit` (e.g. plain `light`) and the loop
     leaves your changes uncommitted for you to handle.
3. Detect the test runner per the test-runner-detection reference above — this
   must resolve to a concrete `testCmd` string (e.g. `pytest`, `npm test`, or `peel test` as a runner placeholder
   for peel — see the heuristic), never a bare flag; additionally set `isPeel:true` when the runner is peel. If no
   runner can be detected, **ask the user** for a command instead
   of passing `testCmd: null` — a null `testCmd` silently skips the whole test-lint stage. Detect a migrate command
   only if the change touches models (e.g. `peel makemigrations <app>`).
   `baseRef` = `main`; `appDir` = the change's primary directory **to test/migrate** if obvious, else `.` (this is
   independent of `specRoot`, which is only where `openspec` runs).
4. Determine `workdir` — the **absolute** repo root path (there is no worktree). Before launching, check **checkout
   safety** (the git-safety reference above): the working tree must be clean and currently on this change's
   `branch` — the background loop can't pause to ask. If not, **stop and ask the user** to check out the right
   branch (committing/stashing foreign work) instead of launching. Once safe, the loop's git/test/PR commands run
   there; resolve `changeDir` (step 1) under this same `workdir`.

## 2. Launch the loop (async — then end your turn)
Call the **Workflow** tool with `scriptPath: "${CLAUDE_PLUGIN_ROOT}/workflows/autonomous-loop.js"` and `args`
(keep the arg keys exactly — the loop reads them):
```json
{
  "title": "<feature + change title>", "scope": "<change title>",
  "featureDir": "<abs path to .workflow/<feature>/>",
  "phaseDir": "<abs path to the change folder .workflow/<feature>/<NN>-<change>/>",
  "changeDir": "<abs path to <workdir>/<specRoot>/openspec/changes/<change>/ , or null>",
  "workdir": "<abs repo root>",
  "baseRef": "main", "appDir": "<dir or .>",
  "testCmd": "<detected or null>", "migrateCmd": "<or null>", "isPeel": <bool>,
  "pendingStages": ["..."]
}
```
Set `state.json` stage `build` (and the rest of this change's pipeline) to `in_progress`, append a transition —
capture this session's `sessionId` once now (the `CLAUDE_CODE_SESSION_ID` env var, per the state-and-layout
reference above) and reuse the same value for every transitions entry this command appends,
including step 3 below, since it's the same session finishing the loop it launched — then tell the user the loop
is running in the background (they can watch with `/workflows`) and **end your turn**. The loop returns later via
a task notification.

## 3. When the loop finishes (you'll be notified) — verify, don't trust
Read the loop's returned result, then **confirm against disk**: for each stage that ran, read its output file
(`implementation.md`, `tests.md`, `test-lint.md`, `review.md`) and mark the stage `done` only if its `## GATE` is
`status: pass`; otherwise `failed`. The draft PR link comes from the loop result (no file). Update `state.json`
accordingly with transitions (reuse the `sessionId` captured when launching in step 2 above).
Report to the user: tests green / skipped, review committed?, draft PR url, open non-critical findings — and the
reminder to run **`/workflow:archive`** when they're sure the change is done (the canonical-spec merge is manual).
If the change was **committed** (by `review`, `pr`, or the `commit` token), say so and report the result. If
**none** of those ran (a pure light build), the loop leaves the change uncommitted — report that and remind them to
review, commit, and `/workflow:archive` it themselves. When a redo used `only build commit`, note that the existing
draft PR picked up the push (its description was left as-is).
- If the result has an **escalation** (`returnTo`), set that stage back to `pending`. If `returnTo` is `test-lint`,
  tests could not run at all — an environment/infra problem (missing/expired credentials, Docker down, image build
  failure), not a design issue. Just describe the concrete problem from `reason` and tell the user to fix their
  environment, then re-run `/workflow:build` to resume — do **not** point them at `/workflow:design` or
  `/workflow:arch` for this case. For any other `returnTo`, tell the user what decision is needed and point them to
  `/workflow:design` or `/workflow:arch`.
- If tests were **skipped** (runner unavailable), remind the user to run them before merging.
Do not edit code yourself — corrections always go back through the loop.
