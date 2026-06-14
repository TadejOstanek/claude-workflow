---
description: Run the autonomous loop for a phase — implement+test → test/lint → review (commit) → docs+QA → draft PR. Launches a background Workflow; reports when it finishes.
argument-hint: [phase slug] — blank to use the next phase ready to build
---

# /workflow:build

This command **authorizes** running the Workflow tool. Read `workflow:workflow-conventions` first.

## 1. Resolve the phase + compute what's left (you have filesystem access — the loop does not)
1. Find the active workflow under `.workflow/` from `state.json`. Pick the phase from `$ARGUMENTS`, else the
   lowest-`order` phase whose `code-design` is `done` and whose later stages aren't all `done` (respect `depends_on`).
   Its `code-design` must be `done` — if not, stop and tell the user to run `/workflow:design` first.
2. Build `pendingStages` for `[build, test-lint, review, docs, qa, pr]`: a stage is **done** (omit it) if `state.json`
   says `done` **or** its output file exists in the phase folder with a `## GATE` of `status: pass`. Read those files
   to check — this makes a re-run after a lost session resume mid-loop instead of redoing work. Everything else is
   pending. (`pr` writes no file — treat it done if `state.json` says so or a draft PR already exists for the branch
   via `gh pr view`.)
3. Detect the runner by scanning the repo: `peel.yml` → `peel test ...` (set `isPeel:true`); else a `Makefile`
   `test` target → `make test`; else `pyproject.toml`/`pytest.ini` → `pytest`; else `package.json` test script →
   `npm test`; else ask. Detect a migrate command only if the phase touches models (e.g. `peel makemigrations <app>`).
   `baseRef` = `main`; `appDir` = the phase's primary directory if obvious, else `.`.
4. Determine `workdir` — the **absolute** path the loop's git/test/PR commands must run in: `state.json.worktree`
   if a worktree was created, otherwise the repo root. The loop commits and pushes there.

## 2. Launch the loop (async — then end your turn)
Call the **Workflow** tool with `scriptPath: "${CLAUDE_PLUGIN_ROOT}/workflows/autonomous-loop.js"` and `args`:
```json
{
  "title": "<feature + phase title>", "scope": "<phase title>",
  "featureDir": "<abs path to .workflow/<feature>/>",
  "phaseDir": "<abs path to the phase folder>",
  "workdir": "<abs repo root or worktree path>",
  "baseRef": "main", "appDir": "<dir or .>",
  "testCmd": "<detected or null>", "migrateCmd": "<or null>", "isPeel": <bool>,
  "pendingStages": ["..."]
}
```
Set `state.json` stage `build` (and the rest of this phase's pipeline) to `in_progress`, append a transition, then
tell the user the loop is running in the background (they can watch with `/workflows`) and **end your turn**. The
loop returns later via a task notification.

## 3. When the loop finishes (you'll be notified) — verify, don't trust
Read the loop's returned result, then **confirm against disk**: for each stage that ran, read its output file
(`implementation.md`, `tests.md`, `test-lint.md`, `review.md`, `documentation.md`, `qa.md`) and mark the stage
`done` only if its `## GATE` is `status: pass`; otherwise `failed`. The draft PR link comes from the loop result
(no file). Update `state.json` + `OVERVIEW.md` accordingly with transitions.
Report to the user: tests green / skipped, review committed?, draft PR url, and any open non-critical findings.
- If the result has an **escalation** (`returnTo`), set that stage back to `pending`, tell the user what decision is
  needed, and point them to `/workflow:design` or `/workflow:arch`.
- If tests were **skipped** (runner unavailable), remind the user to run them before merging.
Do not edit code yourself — corrections always go back through the loop.
