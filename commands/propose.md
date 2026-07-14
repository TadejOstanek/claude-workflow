---
description: Author a change's spec — why/what + capabilities, then the testable requirement/scenario deltas — as one OpenSpec change.
argument-hint: [change slug] — blank to use the next change needing a spec
---

# /workflow:propose

Apply the `workflow:specification` skill (the interactive method). Read `workflow:workflow-conventions` (OpenSpec
integration + state schema). This authors a change's **whole spec in one session, two phases**: first the why/what
and which capabilities change (Phase A → `proposal.md`), then the testable behavioral detail (Phase B →
`specs/<capability>/spec.md`). Requires the `openspec` CLI (`@fission-ai/openspec`).

## 1. Resolve the change
Find the active workflow under `.workflow/` from `state.json`. Use the change in `$ARGUMENTS`, else the
lowest-`order` change whose `stages.propose` is `pending` (respect `depends_on`). In `single` mode, if no change is
`pending` (you're **amending** an already-specced change), default to the sole change anyway; in `epic` mode, name
the change to revisit a `done` one. If the resolved change is `spec:"none"` (a purely technical change — `propose`
is `na`), **stop**: it needs no OpenSpec change — point the user to `/workflow:design`. (If they truly want to add a
spec, they first flip the change's `spec` to `"openspec"` and reset `propose`/`archive` to `pending`.) For an
`epic`, read `architecture.md` for this change's scope; for a `single`, the feature description is the scope. **Do
not read code**; you may read repo documentation.

## 2. Pick the change's OpenSpec root (`specRoot`)
A change's spec lives wherever you run `openspec` (cwd-bound; see `workflow:workflow-conventions`). Choose it now —
generically, **never hardcoding app names**:
1. Discover existing roots: list dirs containing an `openspec/` (excluding archives):
   ```bash
   find . -type d -name openspec -not -path '*/changes/archive/*' -not -path '*/node_modules/*' 2>/dev/null
   ```
   The `specRoot` for each is that dir's parent (e.g. `goods/openspec` → `goods`; `./openspec` → `.`).
2. If more than the repo root is available (or the repo documents per-app/domain roots, e.g. in
   `openspec/AGENTS.md` or `CLAUDE.md`), ask the user which root this change targets: **repo root (`.`)**, an
   **existing sub-root**, or a **new path** (an app/domain/package dir). Default to `"."`. If the repo has only a
   root `openspec/` and no documented sub-roots, just use `"."` without asking.
3. If the chosen `<specRoot>` has no `openspec/` yet, create the dir if needed and initialize it. For a **sub-root**
   use `--tools none` so AI-tool wiring (`.claude/…`) isn't duplicated per app — that lives once at the repo root:
   `mkdir -p "<specRoot>" && (cd "<specRoot>" && openspec init --tools none)` (use `--tools claude` only when
   initializing the repo **root** itself). Run `git status` afterward and show the user what `init` generated
   before anything is committed.
4. Record `specRoot` on this change in `state.json`.

*(Re-authoring an existing change? Its `specRoot` and `change` id are already set — skip steps 2–3, reuse them.)*

## 3. Create the OpenSpec change
Derive a kebab-case `<change-id>` from the feature + change slug (e.g. `add-foo-data-model`). Run from `specRoot`:
```bash
(cd "<specRoot>" && openspec new change "<change-id>")
```
Set this change's `change` to `<change-id>` in `state.json`. *(If it's already set — re-authoring — skip this.)*

## 4. Phase A — the why/what (record everything the user gives)
Pull the exact format and path (don't assume them) — run from `specRoot`:
```bash
(cd "<specRoot>" && openspec instructions proposal --change "<change-id>" --json)
```
Use its `template`, `instruction`, and `resolvedOutputPath` (paths are relative to `<specRoot>`). Following the
specification skill — clarify, challenge assumptions, **never drop a requirement the user gave** — write
`proposal.md`: `## Why`, `## What Changes`, `## Capabilities` (each new/modified capability in kebab-case → a
`specs/<capability>/spec.md`), `## Impact`. Keep it scope-level: don't reason at field / data-model altitude (that's
arch/design). Volunteered acceptance criteria don't need to be parked here — Phase B is the same session and will
formalize them straight into the specs.

## 5. Phase B — the testable behavior (capture EVERYTHING)
Now pin the behavior down in the **same session**. Pull the format (don't assume it) — run from `specRoot`:
```bash
(cd "<specRoot>" && openspec instructions specs --change "<change-id>" --json)
```
For each capability in the proposal, write `<specRoot>/openspec/changes/<change-id>/specs/<capability>/spec.md`
with delta sections — `## ADDED Requirements`, plus `## MODIFIED/REMOVED/RENAMED Requirements` as needed. Each
`### Requirement: <name>` uses SHALL/MUST and has at least one `#### Scenario: <name>` (**exactly four hashes** —
three fails silently) in `- **WHEN** … / - **THEN** …` form. These scenarios ARE the testable acceptance criteria
the reviewer later checks against. For a MODIFIED requirement, copy the full existing block from
`<specRoot>/openspec/specs/<capability>/spec.md` before editing.

## 6. Validate + finalize
```bash
(cd "<specRoot>" && openspec validate "<change-id>")
```
Fix any structural errors until it passes. Then set this change's `stages.propose = "done"` and append a transition.
Route by this change's `stages.architecture`:
- **`pending`** (the default for a spec-bearing change — data modeling comes next): set `currentStage="architecture"`
  and tell the user to `/clear`, then run `/workflow:arch` (the data-model & structural-fit pass) and then
  `/workflow:design`.
- **`na`** (the user pre-skipped the architecture step): set `currentStage="design"` and tell the user to `/clear`,
  then run `/workflow:design`.
- **absent** (a change created before the architecture stage existed): treat as `na` — route to `/workflow:design`.

**Iterating?** If you're amending the spec of a change whose later stages were already `done`, those outputs now
describe the **old** spec — leave them as-is (the user chooses what to redo, per `workflow:workflow-conventions`).
Point them at `/workflow:design` then `/workflow:build <change> only build commit`, or straight to `/workflow:build`
if the design still holds.
