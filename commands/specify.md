---
description: Author a change's behavioral specs (requirement/scenario deltas) into its OpenSpec change. Second of the two spec steps.
argument-hint: [change slug] — blank to use the next change needing specs
---

# /workflow:specify

Apply the `workflow:specification` skill. Read `workflow:workflow-conventions`. This authors the **specs** half —
the testable requirement/scenario deltas — into the OpenSpec change created by `/workflow:propose`. Requires the
`openspec` CLI.

## 1. Resolve the change
From `state.json`, use `$ARGUMENTS`, else the lowest-`order` change whose `stages.specify` is `pending` and whose
`stages.propose` is `done`. Read its `proposal.md` (the `## Capabilities` list is your contract) and its `change`
id. If `propose` isn't done, stop and tell the user to run `/workflow:propose` first.

## 2. Author the specs — testable behavior, capture EVERYTHING
Pull the format (don't assume it):
```bash
openspec instructions specs --change "<change-id>" --json
```
For each capability in the proposal, write `openspec/changes/<change-id>/specs/<capability>/spec.md` with delta
sections — `## ADDED Requirements`, plus `## MODIFIED/REMOVED/RENAMED Requirements` as needed. Each
`### Requirement: <name>` uses SHALL/MUST and has at least one `#### Scenario: <name>` (**exactly four hashes** —
three fails silently) in `- **WHEN** … / - **THEN** …` form. These scenarios ARE the testable acceptance criteria
the reviewer later checks against. For a MODIFIED requirement, copy the full existing block from
`openspec/specs/<capability>/spec.md` before editing.

## 3. Validate + finalize
```bash
openspec validate "<change-id>"
```
Fix any structural errors until it passes. Then set this change's `stages.specify = "done"`, append a transition,
and tell the user to `/clear`, then run `/workflow:design`.

**Iterating?** If you're amending the spec of a change whose `design`/`build`/later stages were already `done`
(e.g. manual QA surfaced a gap), say so: those downstream outputs now describe the **old** spec. Don't flip them to
`pending` — the user chooses what to redo. Point them at `/workflow:design` (to refine the code-design) then
`/workflow:build <change> only build commit`, or straight to `/workflow:build` if the design still holds.
