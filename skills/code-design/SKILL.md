---
name: code-design
description: Methodology for the workflow's Code Design stage — specify exact interfaces and test behaviors for a phase so parallel implement/test agents can build it. Use when running /workflow:design.
---

# Code design stage (per phase)

Goal: specify the **exact** code so the non-interactive implement + test agents can build it without guessing. This
is the last interactive stage — the user approves before the autonomous loop runs.

## Method
- Read `spec.md` + `architecture.md` (and the parent epic's versions if this is a sub-phase).
- Follow existing repo conventions; prioritize target conventions over deprecated ones.
- Design for change — **good code is easy to change**. Favor **deep modules** (small interface, real functionality);
  a large interface for little behavior is a smell.
- Follow framework defaults (Django/Flask/Rails/etc.) unless repo conventions say otherwise.
- Plan tests for **public behavior**, not private internals (unless an internal is complex enough to warrant it —
  ask the user). Behavior coverage, not code coverage. No trivial tests.
- If you discover the chosen architecture isn't actually feasible in the code, **stop and flag it** — prompt the
  user to return to `/workflow:arch` with what you learned.

## Prepare for implementation
- Prompt the user for the **story/ticket number**.
- Create the **branch**: `{username}/sc-{ticket}/{description}` (username from `git config user.name` /
  `gh api user --jq .login`). Target branch `main`.
- Ask whether to work in a **worktree** (`git worktree add /tmp/<name> <branch>`); never switch the main checkout.

## Output: `code-design.md`
- **Interfaces** — exact methods/classes/functions, parameters, return shapes, and what each does. Mark file
  ownership: which are CODE files vs TEST files.
- **Components** — core pieces and responsibilities.
- **Tests** — functions/methods under test + the behaviors each must verify (the test agent's contract).
- **Conventions** — the repo patterns/conventions you discovered, so downstream agents don't re-derive them
  (saves tokens). Name the canonical files to mirror.
Use checkboxes. Keep terse. End with the standard `## GATE`.

## Done when
The user approves the design. Then `/clear` and run `/workflow:build` to start the autonomous loop for this phase.
