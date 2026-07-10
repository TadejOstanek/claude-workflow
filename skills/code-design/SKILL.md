---
name: code-design
description: Methodology for the workflow's Code Design stage — specify exact interfaces and test behaviors for a change so parallel implement/test agents can build it. Use when running /workflow:design.
---

# Code design stage (per change)

Goal: specify the **exact** code so the non-interactive implement + test agents can build it without guessing. This
is the last interactive stage — the user approves before the autonomous loop runs.

## Method
- **Spec-bearing change (`spec:"openspec"`):** read the change's behavioral spec — its **OpenSpec change**
  (`<specRoot>/openspec/changes/<change>/`: `proposal.md` + `specs/**/*.md`; `specRoot` from `state.json`, default
  `"."`) — plus the change's `architecture.md` (its own per-change one from `/workflow:arch`, and the epic's if any).
- **Spec-less change (`spec:"none"`):** there is no OpenSpec change — take the intent from the feature description
  and the epic/per-change `architecture.md`. Because there is no `proposal.md` to carry the rationale downstream,
  capture a short **Why / Context** in `code-design.md` (below); for a refactor, also note the externally-observable
  behavior that must stay unchanged.
- **Data model is decided input.** If this change has an `architecture.md` (its own per-change one, or the epic's),
  read it and treat its data-model + structural-fit decisions as **given** — `code-design` specifies interfaces and
  tests, it does **not** re-model. If a data-model question is genuinely still open, **stop and return to
  `/workflow:arch`** rather than deciding it here.
- Follow existing repo conventions; prioritize target conventions over deprecated ones. Use `orchestration:lookup`
  for quick, targeted pattern checks and `orchestration:investigate` for broader area understanding — rather than
  grepping file-by-file.
- Design for change — **good code is easy to change**. Favor **deep modules** (small interface, real functionality);
  a large interface for little behavior is a smell.
- Follow framework defaults (Django/Flask/Rails/etc.) unless repo conventions say otherwise.
- Plan tests for **public behavior**, not private internals (unless an internal is complex enough to warrant it —
  ask the user). Behavior coverage, not code coverage. No trivial tests.
- If you discover the chosen architecture isn't actually feasible in the code, **stop and flag it** — prompt the
  user to return to `/workflow:arch` with what you learned.
- **Verify structural risk facts now, not later.** If the design newly couples modules that weren't already coupled
  (e.g. a new import between two files), check for an import cycle. If it introduces new parsing/encoding of
  external input, confirm the convention against a sibling file. Record the answer under **Conventions** below —
  the fact, not just the question — so the implementer and test-author don't each re-derive it empirically.

## ADRs (if warranted)
If a decision here is heavy enough to outlive this change's memory — a real tradeoff between viable alternatives,
not "the obvious way" — write an ADR directly, now, while the why is fresh (ask the user where ADRs live if the
repo has no convention; use its template if one exists). **Under-write** — most changes need none. It's the only
permanent doc this stage writes; behavioral documentation lives in the OpenSpec spec.

## Adversarial critique (default-on, skippable)
Before the user approves, run the drafted `code-design.md` past the `workflow:design-critic` agent — an independent
pass that pressure-tests it against real repo conventions and the spec (this stage is otherwise purely generative,
with no second look). It writes `design-critique.md`. Default-on; skip only for a trivial/low-risk change. Advisory,
not a gate — the `## GATE` reflects the user's approval, not the critic's verdict. If a finding is real, revise the
design (re-running the critic if the revision was substantial) before approval.

## Prepare for implementation
Provision this change's branch per **Branch provisioning** in `workflow:workflow-conventions` (reuse an existing
`branch`, else create `{username}/sc-{ticket}/{description}` off `main`).

## Output: `code-design.md`
- **Why / Context** — **required for a `spec:"none"` change** (there is no `proposal.md`): one short paragraph on
  why the change is made and, for a refactor, the observable behavior that must stay unchanged. Omit for a
  spec-bearing change — its `proposal.md` already carries this.
- **Interfaces** — exact methods/classes/functions, parameters, return shapes, and what each does. Mark file
  ownership: which are CODE files vs TEST files.
- **Components** — core pieces and responsibilities.
- **Tests** — functions/methods under test + the behaviors each must verify (the test agent's contract). For a
  spec-less change this is the **sole** behavioral contract — cover the public behavior the refactor must preserve
  (or the new internal behavior).
- **Scenario coverage map** — **spec-bearing changes only.** One row per scenario in the OpenSpec change's
  `specs/**/*.md`: scenario title → the test behavior(s) covering it, or `not-unit-tested: <reason>` (e.g., manual
  QA, integration, pure UI). Every scenario must appear; none silently omitted. This map is the downstream agents'
  traceability contract. A `spec:"none"` change has no scenarios — omit this section entirely; the **Tests** list
  is the contract instead.
- **Conventions** — the repo patterns/conventions you discovered, so downstream agents don't re-derive them
  (saves tokens). Name the canonical files to mirror. Include verified structural facts too (import-cycle checks,
  encoding/parsing conventions) — not just style patterns.
- **ADR** — if you wrote one (see above), its path. Omit this line otherwise.
Use checkboxes only for the **Tests** list (each behavior to verify); the scenario coverage map and other sections
are concise prose/plain lists. End with the standard `## GATE`.

## Done when
The user approves the design. Then `/clear` and run `/workflow:build` to start the autonomous loop for this change.
