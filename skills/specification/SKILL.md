---
name: specification
description: Methodology for the workflow's spec stages — establish the why and what of a change with the user before any code or design. Use when running /workflow:propose (the proposal) or /workflow:specify (the requirement specs).
---

# Specification stage

Goal: reach shared understanding of **why** and **what** — never **how**. Build what's actually needed.

## Capture EVERYTHING — non-negotiable
Write down and define **every** requirement, acceptance criterion, constraint, and non-goal the user gives —
completely and explicitly. If their input is itself a detailed spec, **preserve all of it**: restructure it into the
proposal and the requirement/scenario deltas, but **never drop, merge away, generalize, or summarize criteria into
vaguer ones**. The spec is the exhaustive, authoritative contract every later stage and the final review are
validated against — a criterion you omit here silently never gets built or checked.

## Method
- Do **NOT** read code or implementation. You may read repo **documentation** (README, docs/) for business context.
- Ask the user clarifying questions until the goal and business context are genuinely clear. Challenge their
  assumptions — surface where their stated need and the real need may differ. Don't silently accept defaults.
- If relevant information likely lives elsewhere (another repo, a ticket, a doc, a person), **prompt the user for a
  pointer** rather than guessing.
- Push for **specific, testable conditions** over vague outcomes. Phrase acceptance criteria as
  **given** (situation) / **when** (action) / **then** (outcome) wherever it fits.
- Use the `orchestration:request-clarification` skill to structure the questioning if helpful.

## Write at behavioral altitude — not implementation altitude

Specs describe **what** the system does for actors, not **how** the code achieves it. A spec that survives a full
data-model refactor is at the right level; one that needs updating every time a field is renamed is too low.

**Keep** — domain vocabulary, the language of the problem:
- Entity names that actors use: *print job*, *blank variant*, *order line*, *hub*
- Status names when they are domain concepts: *queued*, *done*, *cancelled*
- Actor actions: *"an operator records units printed"*, *"a manager sets priority"*
- Observable outcomes: *"the job completes"*, *"blank stock is released"*, *"the queue refreshes"*

**Remove** — implementation vocabulary, the language of the solution:
- Field names: `printed_qty`, `target_qty`, `base_variant`, `order_variant`
- Method / function names: `produce()`, `commit_custom_inventory()`, `cancel_queued_for_variant()`
- Error class names: `PrintJobNotQueuedError`, `InsufficientBlankAvailabilityError`
- Internal constants / reason codes: `ADJ-PRINT-JOB`, `HX-Trigger: print-recorded`
- ORM / HTTP internals: `select_for_update`, query parameter names, response header names

**The test:** could someone who has never read the codebase understand every scenario purely from domain knowledge?
If yes, the altitude is right. If they need to grep the repo first, rewrite it.

**For retroactive specs** (documenting existing behavior): read the code and tests to extract the behavior, but
translate every finding into domain language before writing. The existing tests are excellent acceptance-criteria
anchors — mirror their intent, not their syntax.

## Output — two steps, into one OpenSpec change

A change's spec is authored in two steps, both into the OpenSpec change at `<specRoot>/openspec/changes/<change>/`
(`specRoot` is the change's OpenSpec root — repo root by default, or an app/domain sub-dir; `/workflow:propose`
picks it), exactly as each command specifies:
- **`/workflow:propose`** → `proposal.md`: the why/what + the **capabilities** that change (each becomes a
  `specs/<capability>/spec.md`). Scope-level — no behavioral detail yet.
- **`/workflow:specify`** → `specs/<capability>/spec.md`: the behavioral deltas — `### Requirement:` (SHALL/MUST) +
  `#### Scenario:` (WHEN/THEN). Each scenario is a testable acceptance criterion; the given/when/then above maps to
  WHEN/THEN. (An epic has no spec of its own — its intent lives in `architecture.md`.)

Be concise per criterion but **complete in coverage** — terseness means tight wording, never fewer specs.

## Done when
The user agrees. After `/workflow:propose` → run `/workflow:specify`. After `/workflow:specify` → `openspec
validate` passes and the user agrees → `/clear`, then `/workflow:design`.
