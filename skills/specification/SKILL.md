---
name: specification
description: Methodology for the workflow's Specification stage — establish the why and what of a change with the user before any code or design. Use when running /workflow-spec.
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

## Output: `spec.md`
Four headers:
- **Goals / Why** — the problem and intended outcome.
- **Acceptance criteria** — testable, given/when/then where possible. Checkboxes.
- **Non-obvious constraints** — things that aren't apparent from the request.
- **Non-goals** — explicitly out of scope.

If the change is complex, split into sub-sections (feature parts, or non-functional specs), each repeating the four
headers. Be concise per criterion, but **complete in coverage** — terseness means tight wording, never fewer specs.
End with the standard `## GATE` (see `workflow-conventions`).

## Done when
The user agrees the spec captures the why/what. Then they `/clear` and run `/workflow:arch`.
