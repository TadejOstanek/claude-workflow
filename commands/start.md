---
description: Start a new workflow — a single change or a multi-change epic — or (no argument) show status and the next step to resume.
argument-hint: [what you want to build] — blank to show status / resume
---

# /workflow:start

First read the `workflow:workflow-conventions` skill (layout, `state.json` schema, GATE format).

Input: `$ARGUMENTS`

## No argument → status / resume
Find every `.workflow/*/state.json` in the repo. For each active workflow report: title, `mode`, `currentStage`,
and the **exact next command** (e.g. "`/clear`, then `/workflow:specify`"). Name the change if mid-pipeline. If
none exist, say so and explain that `/workflow:start <what you want to build>` begins one.

## Argument given → scaffold a new workflow
Do not read code or design anything — only scaffold:
1. Derive a short kebab-case `<feature-slug>` from the description. Get the date with `date +%Y-%m-%d`.
2. **Pick the mode.** If the work is one self-contained change (one PR), use `single`; if it clearly spans
   multiple PRs/areas, use `epic`. If it's not obvious, **ask the user** (single change vs. multi-change epic).
3. Create `.workflow/<feature-slug>/` and write `state.json` per the conventions schema:
   - **single:** `mode:"single"`, `epic:{architecture:"na"}`, `currentStage:"propose"`, and `changes` holding one
     entry (`slug:"01-<feature-slug>"`, `type`, `order:1`, `depends_on:[]`, `change:null`, `specRoot:"."`, all
     stages `pending`).
   - **epic:** `mode:"epic"`, `epic:{architecture:"pending"}`, `currentStage:"architecture"`, `changes:[]`.
   - both: `ticket:null`, `branch:null`, `worktree:null`, one `transitions` entry
     `{from:"init", to:<currentStage>, reason:"workflow created (<mode>)"}`.
4. **OpenSpec prerequisite:** if the repo has no `openspec/` directory anywhere, tell the user to run
   `openspec init --tools claude` (installing `@fission-ai/openspec` if needed) at the repo root before
   `/workflow:propose`. Per-app/domain sub-root `openspec/` dirs are created on demand by `/workflow:propose`
   (it picks the change's `specRoot`), so only the baseline root is needed up front.
5. Tell the user the next command — **single →** `/workflow:propose`; **epic →** `/workflow:arch` (no `/clear`
   needed; it's the first stage).
