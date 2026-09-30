---
description: Start a new workflow — a single change or a multi-change epic — or (no argument) show status and the next step to resume.
argument-hint: [what you want to build] — blank to show status / resume
---

# /workflow:start

First read the `workflow:workflow-conventions` skill (GATE format), plus its reference file
`${CLAUDE_PLUGIN_ROOT}/skills/workflow-conventions/reference/state-and-layout.md` (layout, `state.json` schema).

Input: `$ARGUMENTS`

## No argument → status / resume
Find every `.workflow/*/state.json` in the repo. For each active workflow report: title, `mode`, `currentStage`,
and the **exact next command** (e.g. "`/workflow:propose`"; `currentStage:"architecture"` maps to
`/workflow:arch`). Name the change if mid-pipeline. If
none exist, say so and explain that `/workflow:start <what you want to build>` begins one.

## Argument given → scaffold a new workflow
Do not read code or design anything — only scaffold:
1. Derive a short kebab-case `<feature-slug>` from the description. Get the date with `date +%Y-%m-%d`.
2. **Pick the mode.** If the work is one self-contained change (one PR), use `single`; if it clearly spans
   multiple PRs/areas, use `epic`. If it's not obvious, **ask the user** (single change vs. multi-change epic).
3. **(single mode) Seed `models`:** copy `${CLAUDE_PLUGIN_ROOT}/config/default-models.json` into the change as `models`
   (see `reference/models.md` in the conventions skill). For `epic`
   mode, skip this — `/workflow:arch` seeds each change.
4. Create `.workflow/<feature-slug>/` and write `state.json` per the conventions schema (field list + per-mode
   stage defaults live there). Mode-specific specifics:
   - **single:** `currentStage:"propose"`; one change entry `slug:"01-<feature-slug>"`, `models` from step 3,
     all stages `pending`. `architecture` stays `pending` (data modeling runs by default); if the user already
     knows this change touches no data model, offer to **pre-skip** it (`architecture:"na"`). If the user already
     knows this change is trivial enough to need no spec at all, offer to **pre-skip** `propose` too
     (`propose:"na"`, `currentStage:"design"`) — this is a manual override, not a recommendation you make.
   - **epic:** `mode:"epic"`, `epic:{architecture:"pending"}`, `currentStage:"architecture"`, `changes:[]`.
5. Tell the user the next command — **single →** `/workflow:propose` (or `/workflow:design` if `propose` was
   pre-skipped); **epic →** `/workflow:arch`.
