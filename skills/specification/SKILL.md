---
name: specification
description: Methodology for the workflow's Specification stage — establish the why and what of a change with the user before any code or design. Use when running /workflow-spec.
---

# Specification stage

Goal: reach shared understanding of **why** and **what** — never **how**. Build what's actually needed.

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
headers. Keep it terse. End with the standard `## GATE` (see `workflow-conventions`).

## Done when
The user agrees the spec captures the why/what. Then they `/clear` and run `/workflow:arch`.
