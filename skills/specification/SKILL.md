---
name: specification
description: Methodology for the workflow's spec stage — establish the why and what of a change with the user before any code or design. Use when running /workflow:propose.
---

# Specification stage

Goal: reach shared understanding of **why** and **what** — never **how**. Build what's actually needed. A change's
spec is authored by `/workflow:propose` in **one session, two phases** — Phase A (the why/what + scope) then Phase B
(the testable behavioral detail) — both into the OpenSpec change at `<specRoot>/openspec/changes/<change>/`
(`specRoot` is the change's OpenSpec root — repo root by default, or an app/domain sub-dir; `/workflow:propose`
picks it). The **Method** and **Never drop a requirement** sections apply to *both* phases; the two phase sections
say what changes between them.

## Method (both phases)
- Do **NOT** read code or implementation. You may read repo **documentation** (README, docs/) for business context.
- Ask the user clarifying questions until the goal and business context are genuinely clear. Challenge their
  assumptions — surface where their stated need and the real need may differ. Don't silently accept defaults.
- If relevant information likely lives elsewhere (another repo, a ticket, a doc, a person), **prompt the user for a
  pointer** rather than guessing.
- Use the `orchestration:request-clarification` skill to structure the questioning if helpful.

## Never drop a requirement (both phases) — non-negotiable
Whatever the user gives you — a constraint, an acceptance criterion, a non-goal, or a whole detailed spec — must be
**recorded** completely and explicitly in the right artifact; **never dropped, merged away, generalized, or
summarized into something vaguer.** Because both phases run in one session, testable detail the user volunteers
during Phase A doesn't have to be parked in `proposal.md` to survive — Phase B follows immediately and formalizes it
straight into the specs. Just don't lose it: if it's genuinely scope-level, it belongs in `proposal.md`; if it's a
concrete acceptance criterion, carry it into the Phase B deltas.

## Phase A — the why / what / scope
Establish the **motivation** and business context, the **scope** of the change, and the **capabilities** that change
(each becomes a `specs/<capability>/spec.md`). Stay scope-level:
- Do **not** reason at field / data-model altitude — that belongs to the architecture / design step, not the spec.
- You need not exhaustively enumerate acceptance criteria yet — Phase B pins those down. But when the user
  volunteers a criterion, note it (in `proposal.md` if scope-level, or carry it into Phase B) — never lose it.

Output → `proposal.md`: `## Why`, `## What Changes`, `## Capabilities`, `## Impact`. Scope-level — the exhaustive
behavioral detail lands in Phase B.

## Phase B — the testable what
Now pin the behavior down. **Push for specific, testable conditions** over vague outcomes; phrase acceptance criteria
as **given** (situation) / **when** (action) / **then** (outcome). Be **complete in coverage** — terseness means
tight wording, never fewer specs. These deltas are the exhaustive, authoritative contract every later stage and the
final review are validated against; a criterion you omit here silently never gets built or checked.

Output → `specs/<capability>/spec.md`: the behavioral deltas — `### Requirement:` (SHALL/MUST) + `#### Scenario:`
(WHEN/THEN); the given/when/then above maps to WHEN/THEN. (An epic has no spec of its own — its intent lives in
`architecture.md`.)

### Write at behavioral altitude — not implementation altitude

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

## Done when
The user agrees, `openspec validate` passes, and both `proposal.md` and the `specs/<capability>/spec.md` deltas
exist. Then `/clear`, and run the change's next step (its architecture step if it needs one, else `/workflow:design`).
