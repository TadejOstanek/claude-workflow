---
description: Run the autonomous loop for a change — implement+test always, then optional test/lint, review, docs, QA, draft PR. Launches a background Workflow; reports when it finishes.
argument-hint: [change slug] [full | light | only <stages> | skip <stages>] — stages: test-lint review docs qa pr commit
---

# /workflow:build

This command **authorizes** running the Workflow tool. Read `workflow:workflow-conventions` first.

## 1. Resolve the change + compute what's left (you have filesystem access — the loop does not)
1. Find the active workflow under `.workflow/` from `state.json`. Pick the change from `$ARGUMENTS`, else the
   lowest-`order` change whose `code-design` is `done` and whose later stages aren't all `done` (respect `depends_on`).
   Both `stages.specify` and `code-design` must be `done` — if not, stop and point the user to `/workflow:specify`
   then `/workflow:design`. Note the change's `change` id; its OpenSpec change at `openspec/changes/<change>/` holds
   the behavioral spec the loop's agents read. (`$ARGUMENTS` may also carry a stage selection — see step 2.) When
   **iterating** (redo) you'll usually name the change explicitly: a fully-built change won't be auto-picked, since
   none of its later stages are still pending.
2. **Choose which stages to run — and whether to *resume* or *redo*.** The stages, in order, are `build` (the
   parallel implementer + test-author — they always run **together**), then `test-lint`, `review`, `docs`, `qa`,
   `pr`. Two modes, picked from `$ARGUMENTS`:
   - **Resume** (`full` or blank) — *finish an interrupted forward run.* Selected = all stages; then **subtract any
     already `done`** (a stage is done if `state.json` says `done` **or** its output file has a `## GATE` of
     `status: pass`; `pr` is done if a draft PR exists via `gh pr view`). This never redoes completed work — it
     picks up where a stopped loop left off.
   - **Redo** (`light` / `only <stages>` / `skip <stages>`) — *re-run an explicit subset against amended inputs*
     (you changed the spec or code-design and want to rebuild — the non-waterfall path). Run **exactly** the
     selection, **without** subtracting `done` — redoing finished work is the whole point. `light` = just `build`;
     `only <stages>` = exactly those (e.g. `only build` to re-implement, `only test-lint` to just re-test,
     `only build commit` to re-implement and land it); `skip <stages>` = every stage except those. Because redo
     trusts your selection, it won't second-guess you — if you name a downstream stage whose upstream isn't built,
     it just runs what you asked.

   Build `pendingStages` from the mode above and pass it to the loop; unselected stages are omitted (the loop skips
   them). **`archive` is never in the loop** — it's the manual `/workflow:archive`.
   - **Landing the code — who commits:** `review` commits when it runs; with `review` skipped, `pr` commits (and
     opens/updates the draft PR, **rewriting its body**). To land re-built code **without** touching the PR
     description, add the **`commit`** token (redo only): it commits + pushes this change's files and nothing else —
     an existing draft PR picks up the push automatically, body untouched. `commit` is inert if `pr` is also
     selected (pr does the commit). Select **none** of `review`/`pr`/`commit` (e.g. plain `light`) and the loop
     leaves your changes uncommitted for you to handle.
3. Detect the runner by scanning the repo: `peel.yml` → `peel test ...` (set `isPeel:true`); else a `Makefile`
   `test` target → `make test`; else `pyproject.toml`/`pytest.ini` → `pytest`; else `package.json` test script →
   `npm test`; else ask. Detect a migrate command only if the change touches models (e.g. `peel makemigrations <app>`).
   `baseRef` = `main`; `appDir` = the change's primary directory if obvious, else `.`.
4. Determine `workdir` — the **absolute** path the loop's git/test/PR commands must run in: `state.json.worktree`
   if a worktree was created, otherwise the repo root. The loop commits and pushes there.

## 2. Launch the loop (async — then end your turn)
Call the **Workflow** tool with `scriptPath: "${CLAUDE_PLUGIN_ROOT}/workflows/autonomous-loop.js"` and `args`
(keep the arg keys exactly — the loop reads them):
```json
{
  "title": "<feature + change title>", "scope": "<change title>",
  "featureDir": "<abs path to .workflow/<feature>/>",
  "phaseDir": "<abs path to the change folder .workflow/<feature>/<NN>-<change>/>",
  "changeDir": "<abs path to openspec/changes/<change>/ , or null>",
  "workdir": "<abs repo root or worktree path>",
  "baseRef": "main", "appDir": "<dir or .>",
  "testCmd": "<detected or null>", "migrateCmd": "<or null>", "isPeel": <bool>,
  "pendingStages": ["..."]
}
```
Set `state.json` stage `build` (and the rest of this change's pipeline) to `in_progress`, append a transition, then
tell the user the loop is running in the background (they can watch with `/workflows`) and **end your turn**. The
loop returns later via a task notification.

## 3. When the loop finishes (you'll be notified) — verify, don't trust
Read the loop's returned result, then **confirm against disk**: for each stage that ran, read its output file
(`implementation.md`, `tests.md`, `test-lint.md`, `review.md`, `documentation.md`, `qa.md`) and mark the stage
`done` only if its `## GATE` is `status: pass`; otherwise `failed`. The draft PR link comes from the loop result
(no file). Update `state.json` accordingly with transitions.
Report to the user: tests green / skipped, review committed?, draft PR url, open non-critical findings — and the
reminder to run **`/workflow:archive`** when they're sure the change is done (the canonical-spec merge is manual).
If the change was **committed** (by `review`, `pr`, or the `commit` token), say so and report the result. If
**none** of those ran (a pure light build), the loop leaves the change uncommitted — report that and remind them to
review, commit, and `/workflow:archive` it themselves. When a redo used `only build commit`, note that the existing
draft PR picked up the push (its description was left as-is).
- If the result has an **escalation** (`returnTo`), set that stage back to `pending`, tell the user what decision is
  needed, and point them to `/workflow:design` or `/workflow:arch`.
- If tests were **skipped** (runner unavailable), remind the user to run them before merging.
Do not edit code yourself — corrections always go back through the loop.
