---
description: Author a change's proposal (why/what + capabilities) as an OpenSpec change. First of the two spec steps.
argument-hint: [change slug] — blank to use the next change needing a proposal
---

# /workflow:propose

Apply the `workflow:specification` skill (the interactive method). Read `workflow:workflow-conventions` (OpenSpec
integration + state schema). This authors the **proposal** half of a change's spec — the why/what and which
capabilities change. The testable behavioral detail comes next, in `/workflow:specify`. Requires the `openspec`
CLI (`@fission-ai/openspec`).

## 1. Resolve the change
Find the active workflow under `.workflow/` from `state.json`. Use the change in `$ARGUMENTS`, else the
lowest-`order` change whose `stages.propose` is `pending` (respect `depends_on`). For an `epic`, read
`architecture.md` for this change's scope; for a `single`, the feature description is the scope. **Do not read
code**; you may read repo documentation.

## 2. Create the OpenSpec change
Derive a kebab-case `<change-id>` from the feature + change slug (e.g. `add-foo-data-model`). Then:
```bash
openspec new change "<change-id>"
```
Set this change's `change` to `<change-id>` in `state.json`.

## 3. Author the proposal — the why/what (capture EVERYTHING)
Pull the exact format and path (don't assume them):
```bash
openspec instructions proposal --change "<change-id>" --json
```
Use its `template`, `instruction`, and `resolvedOutputPath`. Following the specification skill — clarify, challenge
assumptions, **never drop a requirement the user gave** — write `proposal.md`: `## Why`, `## What Changes`,
`## Capabilities` (list each new/modified capability in kebab-case; each becomes a `specs/<capability>/spec.md`),
`## Impact`. Keep it scope-level — the testable requirement/scenario detail is the next step.

## 4. Finalize
Set this change's `stages.propose = "done"`, append a `transitions` entry, tick `OVERVIEW.md`, and tell the user
to run `/workflow:specify` next (you may `/clear` first — the two steps are independent and resumable).
