---
name: architectural-design
description: Methodology for the workflow's Architectural Design stage — decide how a change (or epic) fits the existing codebase and its data model, and (for an epic) how it breaks into changes (PRs). Use when running /workflow:arch.
---

# Architectural design stage

Goal: agree **how** the work fits the existing codebase — structure and, above all, the **data model** — before any
code-level design (no function/class names here; that's `/workflow:design`). Runs in two shapes:
- **Single change** (`mode:"single"`): scrutinize the data model + structural fit for this **one** change, after
  its why/what are defined (`/workflow:propose`) and before `/workflow:design`. No change breakdown.
- **Epic** (`mode:"epic"`): the epic planning stage, run first. Same data-model + fit method, **plus** it captures
  the epic intent (there is no epic spec) and breaks the work into **changes** (each = one PR).

`/workflow:arch` resolves the mode and applies the right shape.

## Method (both shapes) — data model & structural fit
- Read the **code** and any **architecture/practice docs** in the repo. Use `orchestration:investigate` for
  codebase understanding rather than grepping file-by-file.
- Understand the currently modelled business processes and the **delta** this work introduces.
- Scrutinize the **data model**: store vs. compute a field? extend an existing model vs. add a new one? Cover all
  stored state — DB, cache, in-memory, browser. "No data-model change" is a valid conclusion — but reach it
  **explicitly**, don't leave the model unexamined.
- Respect existing architecture and conventions; where **target/desired** conventions exist, prioritize them over
  existing-but-deprecated patterns.
- Challenge the user's assumptions. Surface the big and small fit decisions — for each, **recommend** an option and
  say why, then get the user's call.
- **Pressure-test** the chosen design against the real code when complexity warrants.
- Input differs by shape: a **single** change's why/what is its OpenSpec change (`proposal.md` + `specs/**`, or the
  feature description for a `spec:"none"` change); an **epic**'s intent is the workflow `title`/description (there
  is **no** epic spec file).

## Change breakdown (epic only)
See `${CLAUDE_PLUGIN_ROOT}/skills/architectural-design/reference/epic-planning.md` for the change-breakdown
approach and the full epic planning procedure.

## ADRs (if warranted)
If a decision made here is heavy enough to outlive this conversation, write the ADR directly, now, while the
reasoning is fresh (ask the user where ADRs live if the repo has no convention yet). Most changes/epics need none —
**under-write**. The ADR is the only permanent doc this workflow writes; behavioral documentation is OpenSpec's job.

## Output: `architecture.md`
Write to the epic's `.workflow/<feature>/architecture.md` (epic) or the change's
`.workflow/<feature>/<NN>-<slug>/architecture.md` (single). Include:
- **Data-model modifications** — every kind of stored state (or an explicit "none").
- How the work fits; **all parts to modify** (flows, views/controllers, templates, modules).
- Hard decisions taken and why.
- Architectural patterns the code design + implementation must follow.
- ADR path, if one was written (see above). Omit otherwise.
- **Epic only:** see `${CLAUDE_PLUGIN_ROOT}/skills/architectural-design/reference/epic-planning.md` for what to
  additionally include (epic intent + change breakdown).
Concise prose and plain bullets — no checkboxes here. End with the standard `## GATE`.

## Done when
User agrees the approach. Then `/clear`, and:
- **Single change:** run `/workflow:design` (the data model is now decided input).
- **Epic:** see `${CLAUDE_PLUGIN_ROOT}/skills/architectural-design/reference/epic-planning.md`'s "Next steps".
