---
description: Start a new workflow — a single change or a multi-change epic — or (no argument) show status and the next step to resume.
argument-hint: [what you want to build] — blank to show status / resume
---

# /workflow:start

First read the `workflow:workflow-conventions` skill (layout, `state.json` schema, GATE format).

Input: `$ARGUMENTS`

## No argument → status / resume
Find every `.workflow/*/state.json` in the repo. For each active workflow report: title, `mode`, `currentStage`,
and the **exact next command** (e.g. "`/clear`, then `/workflow:specify`"; `currentStage:"architecture"` maps to
`/workflow:arch`). Name the change if mid-pipeline. If
none exist, say so and explain that `/workflow:start <what you want to build>` begins one.

## Argument given → scaffold a new workflow
Do not read code or design anything — only scaffold:
1. Derive a short kebab-case `<feature-slug>` from the description. Get the date with `date +%Y-%m-%d`.
2. **Pick the mode.** If the work is one self-contained change (one PR), use `single`; if it clearly spans
   multiple PRs/areas, use `epic`. If it's not obvious, **ask the user** (single change vs. multi-change epic).
3. **(single mode) Triage: does this change need a spec?** From the description alone (you don't read code), judge
   per the "Does a change need a spec?" heuristic in `workflow:workflow-conventions`: behavioral change (user-facing
   flow / API / data semantics / business rule) → `spec:"openspec"`; purely technical (refactor, code org, infra/CI,
   deps, perf-neutral cleanup, tooling) → `spec:"none"`. State your recommendation and **ask the user to confirm**
   (their call). For `epic` mode, skip this — `/workflow:arch` triages each change.
4. Create `.workflow/<feature-slug>/` and write `state.json` per the conventions schema:
   - **single, `spec:"openspec"`:** `mode:"single"`, `epic:{architecture:"na"}`, `currentStage:"propose"`, and
     `changes` holding one entry (`slug:"01-<feature-slug>"`, `type`, `order:1`, `depends_on:[]`, `spec:"openspec"`,
     `change:null`, `specRoot:"."`, `ticket:null`, `branch:null`, all stages `pending`). This leaves the per-change
     `architecture` stage `pending` — data modeling runs by default (after `specify`, before `design`). If the user
     already knows this change touches no data model / structural fit, offer to **pre-skip** it now
     (`architecture:"na"`); otherwise leave it `pending`. Its branch is provisioned by `/workflow:design` (see
     `workflow:workflow-conventions`), not here.
   - **single, `spec:"none"`:** same entry but `spec:"none"`, with `propose`, `specify`, `architecture`, and
     `archive` set to `na` (the rest `pending`), and `currentStage:"design"`. A pure-technical change rarely needs
     data modeling; if this one does, the user can opt in (`architecture:"pending"`). Its branch is also provisioned
     by `/workflow:design`.
   - **epic:** `mode:"epic"`, `epic:{architecture:"pending"}`, `currentStage:"architecture"`, `changes:[]`.
   - both: one `transitions` entry `{from:"init", to:<currentStage>, reason:"workflow created (<mode>)"}`.
5. **OpenSpec prerequisite** (skip for a `spec:"none"` single change — it uses no OpenSpec): if the repo has no
   `openspec/` directory anywhere, tell the user to run `openspec init --tools claude` (installing
   `@fission-ai/openspec` if needed) at the repo root before `/workflow:propose`. Per-app/domain sub-root
   `openspec/` dirs are created on demand by `/workflow:propose` (it picks the change's `specRoot`), so only the
   baseline root is needed up front.
6. Tell the user the next command — **single + `spec:"openspec"` →** `/workflow:propose`; **single +
   `spec:"none"` →** `/workflow:design` (the spec steps are skipped); **epic →** `/workflow:arch` (no `/clear`
   needed; it's the first stage).
