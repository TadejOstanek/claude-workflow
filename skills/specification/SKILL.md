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

## Output — two steps, into one OpenSpec change

A change's spec is authored in two steps, both into the OpenSpec change at `openspec/changes/<change>/`, exactly as
each command specifies:
- **`/workflow:propose`** → `proposal.md`: the why/what + the **capabilities** that change (each becomes a
  `specs/<capability>/spec.md`). Scope-level — no behavioral detail yet.
- **`/workflow:specify`** → `specs/<capability>/spec.md`: the behavioral deltas — `### Requirement:` (SHALL/MUST) +
  `#### Scenario:` (WHEN/THEN). Each scenario is a testable acceptance criterion; the given/when/then above maps to
  WHEN/THEN. (An epic has no spec of its own — its intent lives in `architecture.md`.)

Be concise per criterion but **complete in coverage** — terseness means tight wording, never fewer specs.

## Done when
The user agrees. After `/workflow:propose` → run `/workflow:specify`. After `/workflow:specify` → `openspec
validate` passes and the user agrees → `/clear`, then `/workflow:design`.
