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
and the **exact next command** (e.g. "`/clear`, then `/workflow:propose`"; `currentStage:"architecture"` maps to
`/workflow:arch`). Name the change if mid-pipeline. If
none exist, say so and explain that `/workflow:start <what you want to build>` begins one.

## Argument given → scaffold a new workflow
Do not read code or design anything — only scaffold:
1. Derive a short kebab-case `<feature-slug>` from the description. Get the date with `date +%Y-%m-%d`.
2. **Pick the mode.** If the work is one self-contained change (one PR), use `single`; if it clearly spans
   multiple PRs/areas, use `epic`. If it's not obvious, **ask the user** (single change vs. multi-change epic).
3. **(single mode) Triage: how much rigor does this change need?** From the description alone, apply the "How
   much rigor does a change need?" heuristic in the state-and-layout reference above → `complexity:"light"`,
   `"standard"`, or `"deep"`. State the recommendation and **ask the user to confirm** (their call). For `epic`
   mode, skip this — `/workflow:arch` triages each change.
4. Create `.workflow/<feature-slug>/` and write `state.json` per the conventions schema (field list + per-mode
   stage defaults live there). Mode-specific specifics:
   - **single:** `currentStage:"propose"`; one change entry `slug:"01-<feature-slug>"`, `complexity` from step 3,
     all stages `pending`. `architecture` stays `pending` (data modeling runs by default); if the user already
     knows this change touches no data model, offer to **pre-skip** it (`architecture:"na"`). If the user already
     knows this change is trivial enough to need no spec at all, offer to **pre-skip** `propose` too
     (`propose:"na"`, `currentStage:"design"`) — this is a manual override, not a recommendation you make.
   - **epic:** `mode:"epic"`, `epic:{architecture:"pending"}`, `currentStage:"architecture"`, `changes:[]`.
   - all: one `transitions` entry `{from:"init", to:<currentStage>, reason:"workflow created (<mode>)"}` (include
     this session's `sessionId`, per the state-and-layout reference above).
5. Tell the user the next command — **single →** `/workflow:propose` (or `/workflow:design` if `propose` was
   pre-skipped); **epic →** `/workflow:arch` (no `/clear` needed; it's the first stage).
