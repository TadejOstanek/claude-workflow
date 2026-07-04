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
  `"."`) — plus the epic `architecture.md` (if any) for context.
- **Spec-less change (`spec:"none"`):** there is no OpenSpec change — take the intent from the feature description
  and the epic/per-change `architecture.md`. Because there is no `proposal.md` to carry the rationale downstream,
  capture a short **Why / Context** in `code-design.md` (below); for a refactor, also note the externally-observable
  behavior that must stay unchanged.
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

## ADRs (if warranted)
If a decision made here is heavy enough to outlive this change's memory — a real tradeoff between viable
alternatives, not just "the obvious way to do it" — write an ADR directly, now, while you and the user both know
the why. Ask the user where ADRs live if the repo doesn't already have a convention; use the repo's ADR template if
one exists. **Under-write rather than over-write** — most changes need none. This is the *only* kind of permanent
doc this stage writes: business-process/behavioral documentation already lives in the OpenSpec spec (accumulated
into the canonical library via `/workflow:archive`) — there's nothing else to keep in sync here.

## Prepare for implementation
If `state.json` already has a `branch` for this change (re-designing during iteration), reuse it — do not prompt or
re-create. Otherwise prompt the user for the **story/ticket number** and create the **branch**:
`{username}/sc-{ticket}/{description}` (username from `git config user.name` / `gh api user --jq .login`). Target
branch `main` (`git checkout -b <branch> main`).

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
  (saves tokens). Name the canonical files to mirror.
- **ADR** — if you wrote one (see above), its path. Omit this line otherwise.
Use checkboxes only for the **Tests** list (each behavior to verify); the scenario coverage map and other sections
are concise prose/plain lists. End with the standard `## GATE`.

## Done when
The user approves the design. Then `/clear` and run `/workflow:build` to start the autonomous loop for this change.
