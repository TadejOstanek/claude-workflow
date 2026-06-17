---
description: Author a phase's behavioral spec as an OpenSpec change — proposal + capability requirement deltas. The spec-layer step before code design.
argument-hint: [phase slug] — blank to use the next phase needing a spec
---

# /workflow:phase-spec

Apply the `workflow:specification` skill (the interactive method) and read `workflow:workflow-conventions` (the
OpenSpec integration section + state schema). This stage writes the phase's behavioral spec **as an OpenSpec
change** — one change per phase = one PR. Requires the `openspec` CLI (`@fission-ai/openspec`, see README).

## 1. Resolve the phase
Find the active workflow under `.workflow/` from `state.json`. Use the phase in `$ARGUMENTS`, else the lowest-`order`
phase whose `stages.spec` is `pending` (respect `depends_on`). Read the epic `spec.md` + `architecture.md` and this
phase's scope from the architecture's phase breakdown. **Do not read code**; you may read repo documentation.

## 2. Create the OpenSpec change
Derive a kebab-case `<change-id>` from the feature + phase slug (e.g. `add-foo-data-model`). Then:
```bash
openspec new change "<change-id>"
```
Set this phase's `change` to `<change-id>` in `state.json`.

## 3. Author the spec interactively — capture EVERYTHING
Pull the exact format and output path for each artifact (do not assume them):
```bash
openspec instructions proposal --change "<change-id>" --json
openspec instructions specs    --change "<change-id>" --json
```
Use each result's `template`, `instruction`, and `resolvedOutputPath`. Following the specification skill — clarify,
challenge assumptions, push for testable conditions, **never drop a requirement the user gave** — write:

- **`proposal.md`**: `## Why`, `## What Changes`, `## Capabilities` (each new/modified capability in kebab-case;
  each maps to a `specs/<capability>/spec.md`), `## Impact`.
- **`specs/<capability>/spec.md`** per capability: delta sections (`## ADDED Requirements`, and
  `## MODIFIED/REMOVED/RENAMED Requirements` as needed). Each `### Requirement: <name>` uses SHALL/MUST and has at
  least one `#### Scenario: <name>` (**exactly four hashes** — three fails silently) in `- **WHEN** … / - **THEN** …`
  form. These scenarios ARE the testable acceptance criteria the reviewer later checks against. Scope to only what
  **this phase** delivers; the epic `spec.md` carries the rest as context. For MODIFIED requirements, copy the full
  existing requirement block from `openspec/specs/<capability>/spec.md` before editing.

## 4. Validate + finalize
```bash
openspec validate "<change-id>"
```
Fix any structural errors until it passes. Then set this phase's `stages.spec = "done"`, append a `transitions`
entry, tick the phase's spec box in `OVERVIEW.md`, and tell the user to `/clear`, then run `/workflow:design`.
