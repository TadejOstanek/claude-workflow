---
name: architectural-design
description: Methodology for the workflow's Architectural Design stage — decide how an epic fits the existing codebase, the data model, and how it breaks into changes (PRs). Use when running /workflow:arch.
---

# Architectural design stage (epic only)

Goal: agree **how** the epic fits the existing codebase — structure, data model, and a breakdown into **changes**
(each = one PR). Not code-level design (no function/class names). The epic has no spec of its own, so capture its
intent (why/what) here. (Single changes skip this stage and go straight to `/workflow:propose`.)

## Method
- Input is the feature intent (the workflow `title`/description — there is **no** epic spec file). Read the
  **code** and any **architecture/practice docs** in the repo. Use `orchestration:investigate` for codebase
  understanding rather than grepping file-by-file.
- Understand the currently modelled business processes and the **delta** this work introduces.
- Scrutinize the **data model**: store vs. compute a field? extend an existing model vs. add a new one? Cover all
  stored state — DB, cache, in-memory, browser.
- Respect existing architecture and conventions; where **target/desired** conventions exist, prioritize them over
  existing-but-deprecated patterns.
- Challenge the user's assumptions. Surface the big and small fit decisions — for each, **recommend** an option and
  say why, then get the user's call.
- **Pressure-test** the chosen design against the real code when complexity warrants.

## Change breakdown (important)
Split the work into **changes** (each = one PR). A change is independent if it can run in a fresh session needing
only this architecture doc (which carries the epic intent + breakdown) and prior sequential changes' outputs. Each
change runs the full pipeline from its `/workflow:propose` + `/workflow:specify` and code-design on.
- **Tidy-first**: refactors that make the work easier → initial sequential change(s).
- **Feature** changes: the work itself, marked independent / parallel / sequential.
- **Tidy-after**: cleanup enabled once the feature lands → final change(s).

## Documentation to write (flag only — do not write it here)
Ask the user whether anything warrants permanent docs; never decide alone. Two kinds:
- **Business-process specs** — only for core processes, minimal (the code is the best documentation).
- **ADRs** — record heavy decisions made here.
Ask **where** docs should live if not obvious. List the docs-to-write; the Documentation stage writes them.

## Output: `architecture.md`
- The epic intent (why/what) — since there is no separate epic spec.
- How the work fits; **all parts to modify** (flows, views/controllers, templates, modules).
- Data-model modifications (every kind of stored state).
- Hard decisions taken and why.
- Architectural patterns the code design + implementation must follow.
- Change breakdown (with type + order + dependencies).
- Docs-to-write list.
Concise prose and plain bullets — no checkboxes here. End with the standard `## GATE`.

## Done when
User agrees the approach. Then `/clear` and run `/workflow:propose` then `/workflow:specify` (per change), then
`/workflow:design`. A complex change may also get a per-change `architecture.md`.
