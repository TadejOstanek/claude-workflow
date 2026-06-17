---
name: specification
description: Methodology for the workflow's spec stages — establish the why and what of a change with the user before any code or design. Use when running /workflow:spec (epic) or /workflow:phase-spec (per-phase OpenSpec change).
---

# Specification stage

Goal: reach shared understanding of **why** and **what** — never **how**. Build what's actually needed.

## Capture EVERYTHING — non-negotiable
Write down and define **every** requirement, acceptance criterion, constraint, and non-goal the user gives —
completely and explicitly. If their input is itself a detailed spec, **preserve all of it**: restructure it into the
four headers, but **never drop, merge away, generalize, or summarize criteria into vaguer ones**. The spec is the
exhaustive, authoritative contract every later stage and the final review are validated against — a criterion you
omit here silently never gets built or checked.

## Method
- Do **NOT** read code or implementation. You may read repo **documentation** (README, docs/) for business context.
- Ask the user clarifying questions until the goal and business context are genuinely clear. Challenge their
  assumptions — surface where their stated need and the real need may differ. Don't silently accept defaults.
- If relevant information likely lives elsewhere (another repo, a ticket, a doc, a person), **prompt the user for a
  pointer** rather than guessing.
- Push for **specific, testable conditions** over vague outcomes. Phrase acceptance criteria as
  **given** (situation) / **when** (action) / **then** (outcome) wherever it fits.
- Use the `orchestration:request-clarification` skill to structure the questioning if helpful.

## Output — same method, different home per stage

- **Epic spec** (`/workflow:spec`): write `.workflow/<feature>/spec.md` with four headers — **Goals / Why**,
  **Acceptance criteria** (testable, given/when/then, checkboxes), **Non-obvious constraints**, **Non-goals**.
  Split complex specs into sub-sections, each repeating the four headers. End with the standard `## GATE` (see
  `workflow-conventions`). This is the epic intent + the contract the phase breakdown is drawn from.
- **Phase spec** (`/workflow:phase-spec`): write the phase's behavioral spec as an **OpenSpec change** —
  `proposal.md` + capability `### Requirement:` / `#### Scenario:` deltas — exactly as that command specifies. Each
  scenario is a testable acceptance criterion; the given/when/then above maps to WHEN/THEN.

Either way: be concise per criterion but **complete in coverage** — terseness means tight wording, never fewer specs.

## Done when
The user agrees the spec captures the why/what. Epic spec → `/clear`, then `/workflow:arch`. Phase spec →
`openspec validate` passes and the user agrees → `/clear`, then `/workflow:design`.
