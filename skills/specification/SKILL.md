---
name: specification
description: Methodology for the workflow's spec stage — establish the why and the testable acceptance criteria of a change with the user before any code or design. Use when running /workflow:propose.
---

# Specification stage

Goal: reach shared understanding of **why** and **what** — never **how**. Build what's actually needed. A change's
spec is authored by `/workflow:propose` into `spec.md`
(`.workflow/<feature>/<change-slug>/spec.md`).

Runs for **every** change, technical or behavioral. What
changes by change type is the **altitude** of the acceptance criteria (domain language vs. technical language).

## Method
- **Orient first.** Read `references.md` if it exists; otherwise this stage seeds it. Use `codegraph_explore`
  (`mcp__codegraph`, when the repo has a `.codegraph/` directory) to find the files/symbols implementing whatever
  this change touches — fall back to `orchestration:lookup`/`investigate` or grep when it doesn't. Read repo
  **documentation** (README, docs/, specs/, *.md files in general) for business context too. Ground yourself in what actually exists before talking
  to the user — the codebase is a first-class input, not something to avoid.
- Record every file/symbol you found relevant into `references.md` (see Output) as you go — this seeds the map
  later stages (`architecture`, `design`, `build`, `review`) will keep appending to, so they don't each re-discover
  the same code from scratch.
- **Then talk with the user.** Once oriented, discuss the **Why** and the **Acceptance Criteria** together. Ask clarifying questions
  until the goal and business context are genuinely clear. Challenge the user's assumptions — surface where their
  stated need and the real need may differ. Don't silently accept defaults.
- If relevant information likely lives elsewhere (another repo, a ticket, a doc, a person), **prompt the user for a
  pointer** rather than guessing.
- Use the `orchestration:request-clarification` skill to structure the questioning if helpful.
- Reading code is for **grounding facts**, not for design: don't reason at the how-level (field names, function
  names, internals) inside `spec.md` — ALWAYS translate everything into the right altitude per below.

## Never drop a requirement — non-negotiable
Whatever the user gives you — a constraint, an acceptance criterion, a non-goal, or a whole detailed spec — must be
**recorded** completely and explicitly in `spec.md`; **never dropped, merged away, generalized, or summarized into
something vaguer.** Push for specific, testable conditions over vague outcomes. Be **complete in coverage** —
terseness means tight wording, never fewer criteria. `spec.md` is the exhaustive, authoritative contract every later
stage and the final review are validated against; a criterion you omit here silently never gets built or checked.

## ALWAYS write at the right altitude

**Behavioral change** — write acceptance criteria at domain altitude, the same discipline as always:

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

**The test:** could someone who has never read the codebase understand every criterion purely from domain knowledge?
If yes, the altitude is right. If they need to grep the repo first, rewrite it.

**Technical change** (refactor, code organization, infra/CI, deps — no observable behavior change) — write
acceptance criteria at technical altitude instead: verifiable engineering facts, not domain language, since there's
no domain actor for this change to describe behavior for. E.g. "the endpoint returns 429 after 5 requests/sec",
"the module no longer imports from `legacy_utils`", "a request under load sheds the oldest queued item first". Still
**declarative** (a fact that will be true), never a step-by-step TODO — that's `code-design.md`'s job, not this
one's. For a pure refactor, also state the externally-observable behavior that must stay **unchanged**.

**For retroactive specs** (documenting existing behavior): read the code and tests to extract the behavior, but
translate every finding into the right altitude before writing. The existing tests are excellent acceptance-criteria
anchors — mirror their intent, not their syntax.

## Output: `spec.md`
```
## Why
<context/motivation — why this exists, what's broken or missing today>

## Acceptance Criteria
- [ ] <declarative fact that will be true of the finished state>
- [ ] <...>
```
Checkboxes here per `workflow:workflow-conventions`' rule — acceptance criteria are "conditions that must be true."
No other sections; keep it terse in wording, never in coverage.

## Output: `references.md`
A minimal, append-only pointer list — not prose, not a design doc. One line per entry:
`- <path>[:<symbol>] — <one-line why it's relevant> (propose)`. Seed it with whatever you found while orienting.
Later stages append their own findings the same way, tagged with their own stage name — never rewrite or prune
another stage's lines.

## Done when
The user agrees, and `spec.md` and `references.md` both exist. Then `/clear`, and run the change's next step (its
architecture step if it needs one, else `/workflow:design`).
