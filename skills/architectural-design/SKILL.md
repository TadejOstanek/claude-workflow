---
name: architectural-design
description: Methodology for the workflow's Architectural Design stage — decide how a change fits the existing codebase, the data model, and the phase breakdown. Use when running /workflow:arch.
---

# Architectural design stage

Goal: agree **how** the change fits the existing codebase — structure, data model, and a phase plan. Not code-level
design (no function/class names).

## Method
- Read `spec.md` as input. Read the **code** and any **architecture/practice docs** in the repo. Use
  `orchestration:investigate` for codebase understanding rather than grepping file-by-file.
- Understand the currently modelled business processes and the **delta** this change introduces.
- Scrutinize the **data model**: store vs. compute a field? extend an existing model vs. add a new one? Cover all
  stored state — DB, cache, in-memory, browser.
- Respect existing architecture and conventions; where **target/desired** conventions exist, prioritize them over
  existing-but-deprecated patterns.
- Challenge the user's assumptions about the architecture. Surface the big and small fit decisions — for each,
  **recommend** an option and say why, then get the user's call.
- **Pressure-test** the chosen design against the real code when complexity warrants, to minimize downstream gotchas.

## Phase breakdown (important)
Identify whether the work splits into phases. A phase is independent if it can run in a fresh session needing only
the epic spec + architecture (+ prior sequential phases' outputs). Each phase runs the full stage pipeline from
code-design on, and usually becomes its own PR.
- **Tidy-first** (Kent Beck): refactors that make the change easier → schedule as initial sequential phase(s).
- **Feature** phases: the change itself, marked independent / parallel / sequential.
- **Tidy-after**: cleanup enabled once the feature lands → final phase(s).

## Documentation to write (flag only — do not write it here)
Ask the user whether anything warrants permanent docs; never decide alone. Two kinds:
- **Business-process specs** — only for core processes, minimal (the code is the best documentation).
- **ADRs** — record heavy decisions made here.
Ask **where** docs should live if not obvious. List the docs-to-write in the output; the Documentation stage writes them.

## Output: `architecture.md`
- How the change fits; **all parts to modify** (flows, views/controllers, templates, modules).
- Data-model modifications (every kind of stored state).
- Hard decisions taken and why.
- Architectural patterns the code design + implementation must follow.
- Phase breakdown (with type + order + dependencies).
- Docs-to-write list.
Use checkboxes. Keep terse. End with the standard `## GATE`.

## Done when
User agrees the approach. Then `/clear` and run `/workflow:design` (per phase). If a phase is complex, the user may
add a phase-specific `spec.md`/`architecture.md` first.
