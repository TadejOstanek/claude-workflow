---
description: Start a new workflow for a feature/refactor/bug, or (no argument) show status and the next step to resume an existing one.
argument-hint: [feature description] — blank to show status / resume
---

# /workflow:start

First read the `workflow:workflow-conventions` skill (file layout, `state.json` schema, GATE format).

Input: `$ARGUMENTS`

## No argument → status / resume
Find every `.workflow/*/state.json` in the repo. For each active workflow report: title, `currentStage`, and the
**exact next command** to run (e.g. "`/clear`, then `/workflow:arch`"). If a phase is mid-pipeline, name the phase.
If none exist, say so and explain that `/workflow:start <feature description>` begins one.

## Argument given → scaffold a new workflow
Do not read code or design anything — only scaffold:
1. Derive a short kebab-case `<feature-slug>` from the description.
2. Create `.workflow/<feature-slug>/`. Get the date with `date +%Y-%m-%d`.
3. Write `state.json` (per the conventions schema): `feature`, `title`, `created`, `ticket:null`, `branch:null`,
   `currentStage:"spec"`, `epic:{spec:"pending",architecture:"pending"}`, `phases:[]`, one `transitions` entry
   `{from:"init",to:"spec",reason:"workflow created"}`.
4. Write `OVERVIEW.md`: the title, an **Epic** section listing the two interactive stages as unchecked boxes, and a
   note that phases appear after architecture.
5. Tell the user: created — run `/workflow:spec` to begin (no `/clear` needed; spec is the first stage).
