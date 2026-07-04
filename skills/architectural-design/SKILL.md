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

For each change, also decide whether it needs a behavioral spec (`spec: "openspec"` vs `"none"`) per the "Does a
change need a spec?" heuristic in `workflow:workflow-conventions`. Tidy-first/tidy-after (and many fix) changes are
usually **spec-less** — pure refactors with no observable behavior change skip `/workflow:propose` + `/workflow:specify`
and go straight to code design; feature changes are usually **spec-bearing**. Recommend per change and confirm with
the user.

## ADRs (if warranted)
The only permanent doc this workflow writes is the **ADR** — business-process/behavioral documentation is OpenSpec's
job (the canonical spec library, grown via `/workflow:archive`), not this stage's. If a decision made *here* — at
epic scope, not one specific change's — is heavy enough to outlive this conversation's memory, write the ADR
directly, now, while the reasoning is fresh; ask the user where ADRs live if the repo has no convention yet. Most
epics need none. A decision scoped to a single change belongs in that change's `/workflow:design` instead.

## Output: `architecture.md`
- The epic intent (why/what) — since there is no separate epic spec.
- How the work fits; **all parts to modify** (flows, views/controllers, templates, modules).
- Data-model modifications (every kind of stored state).
- Hard decisions taken and why.
- Architectural patterns the code design + implementation must follow.
- Change breakdown (with type + order + dependencies + `spec` openspec/none per change).
- ADR path, if one was written (see above). Omit otherwise.
Concise prose and plain bullets — no checkboxes here. End with the standard `## GATE`.

## Done when
User agrees the approach. Then `/clear` and, per change, run `/workflow:propose` then `/workflow:specify` then
`/workflow:design` for a spec-bearing change — or `/workflow:design` directly for a `spec:"none"` change. A complex
change may also get a per-change `architecture.md`.
