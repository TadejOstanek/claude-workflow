---
name: architectural-design
description: Methodology for the workflow's Architectural Design stage — decide how a change (or epic) fits the existing codebase and its data model, and (for an epic) how it breaks into changes (PRs). Use when running /workflow:arch.
---

# Architectural design stage

Goal: agree **how** the work fits the existing codebase — structure and, above all, the **data model** — before any
code-level design (no function/class names here; that's `/workflow:design`). Runs in two shapes:
- **Single change** (`mode:"single"`): scrutinize the data model + structural fit for this **one** change, after
  its why/what are defined (`/workflow:specify`) and before `/workflow:design`. No change breakdown.
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
Split the work into **changes** (each = one PR). A change is independent if it can run in a fresh session needing
only this architecture doc (which carries the epic intent + breakdown) and prior sequential changes' outputs. Each
change runs the full pipeline from its `/workflow:propose` + `/workflow:specify` and code-design on.
- **Tidy-first**: refactors that make the work easier → initial sequential change(s).
- **Feature** changes: the work itself, marked independent / parallel / sequential.
- **Tidy-after**: cleanup enabled once the feature lands → final change(s).

For each change, also decide whether it needs a behavioral spec (`spec: "openspec"` vs `"none"`) per the "Does a
change need a spec?" heuristic in `workflow:workflow-conventions`. Tidy-first/tidy-after (and many fix) changes are
usually **spec-less** — pure refactors with no observable behavior change skip `/workflow:propose` + `/workflow:specify`
and go straight to code design; feature changes are usually **spec-bearing**. Recommend per change and confirm with
the user.

## ADRs (if warranted)
The only permanent doc this workflow writes is the **ADR** — business-process/behavioral documentation is OpenSpec's
job (the canonical spec library, grown via `/workflow:archive`), not this stage's. If a decision made *here* is
heavy enough to outlive this conversation's memory, write the ADR directly, now, while the reasoning is fresh; ask
the user where ADRs live if the repo has no convention yet. Most changes/epics need none.

## Output: `architecture.md`
Write to the epic's `.workflow/<feature>/architecture.md` (epic) or the change's
`.workflow/<feature>/<NN>-<slug>/architecture.md` (single). Include:
- **Data-model modifications** — every kind of stored state (or an explicit "none").
- How the work fits; **all parts to modify** (flows, views/controllers, templates, modules).
- Hard decisions taken and why.
- Architectural patterns the code design + implementation must follow.
- ADR path, if one was written (see above). Omit otherwise.
- **Epic only:** the epic intent (why/what — there is no separate epic spec), and the **change breakdown** (with
  type + order + dependencies + `spec` openspec/none per change).
Concise prose and plain bullets — no checkboxes here. End with the standard `## GATE`.

## Done when
User agrees the approach. Then `/clear`, and:
- **Single change:** run `/workflow:design` (the data model is now decided input).
- **Epic:** per change, run `/workflow:propose` → `/workflow:specify` → `/workflow:design` for a spec-bearing change,
  or `/workflow:design` directly for a `spec:"none"` change. A complex change within an epic can still opt into its
  own per-change architecture step (mark its `architecture` stage `pending` and run `/workflow:arch <change>`).
