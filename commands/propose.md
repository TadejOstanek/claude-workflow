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
lowest-`order` change whose `stages.propose` is `pending` (respect `depends_on`). If the resolved change is
`spec:"none"` (a purely technical change — `propose`/`specify` are `na`), **stop**: it needs no OpenSpec change —
point the user to `/workflow:design`. (If they truly want to add a spec, they first flip the change's `spec` to
`"openspec"` and reset `propose`/`specify`/`archive` to `pending`.) For an `epic`, read
`architecture.md` for this change's scope; for a `single`, the feature description is the scope. **Do not read
code**; you may read repo documentation.

## 2. Provision the branch/worktree (if not already)
This is the change's **first committable write** (the OpenSpec change you're about to create gets staged into its
PR) — per `workflow:workflow-conventions` ("Branch/worktree provisioning"), the branch must exist before you write
anything. If this change's `ticket`/`branch` are already set, reuse them (you're re-entering propose — do not
re-prompt or re-create). Otherwise: prompt for the ticket number, create the branch
`{username}/sc-{ticket}/{description}` off `main`, ask whether to use a worktree, and record `ticket`, `branch`,
`worktree` on this change in `state.json`. Compute `baseDir` = this change's `worktree` if set, else the repo root —
every `openspec` call below runs with cwd `<baseDir>/<specRoot>`, never bare `<specRoot>`.

## 3. Pick the change's OpenSpec root (`specRoot`)
A change's spec lives wherever you run `openspec` (the CLI is cwd-bound). Choose that directory now — generically,
**never hardcoding app names**:
1. Discover existing roots: list dirs containing an `openspec/` (excluding archives), run from `baseDir`:
   ```bash
   (cd "<baseDir>" && find . -type d -name openspec -not -path '*/changes/archive/*' -not -path '*/node_modules/*' 2>/dev/null)
   ```
   The `specRoot` for each is that dir's parent (e.g. `goods/openspec` → `goods`; `./openspec` → `.`).
2. If more than the repo root is available (or the repo documents per-app/domain roots, e.g. in
   `openspec/AGENTS.md` or `CLAUDE.md`), ask the user which root this change targets: **repo root (`.`)**, an
   **existing sub-root**, or a **new path** (an app/domain/package dir). Default to `"."`. If the repo has only a
   root `openspec/` and no documented sub-roots, just use `"."` without asking.
3. If the chosen `<specRoot>` has no `openspec/` yet, create the dir if needed and initialize it. For a **sub-root**
   use `--tools none` so AI-tool wiring (`.claude/…`) isn't duplicated per app — that lives once at the repo root:
   `mkdir -p "<baseDir>/<specRoot>" && (cd "<baseDir>/<specRoot>" && openspec init --tools none)` (use
   `--tools claude` only when initializing the repo **root** itself). Run `git status` afterward and show the user
   what `init` generated before anything is committed.
4. Record `specRoot` on this change in `state.json`.

## 4. Create the OpenSpec change
Derive a kebab-case `<change-id>` from the feature + change slug (e.g. `add-foo-data-model`). Run from `baseDir/specRoot`:
```bash
(cd "<baseDir>/<specRoot>" && openspec new change "<change-id>")
```
Set this change's `change` to `<change-id>` in `state.json`.

## 5. Author the proposal — the why/what (capture EVERYTHING)
Pull the exact format and path (don't assume them) — run from `baseDir/specRoot`:
```bash
(cd "<baseDir>/<specRoot>" && openspec instructions proposal --change "<change-id>" --json)
```
Use its `template`, `instruction`, and `resolvedOutputPath` (paths are relative to `<baseDir>/<specRoot>`).
Following the specification skill — clarify, challenge assumptions, **never drop a requirement the user gave** —
write `proposal.md`: `## Why`, `## What Changes`, `## Capabilities` (list each new/modified capability in
kebab-case; each becomes a `specs/<capability>/spec.md`), `## Impact`. Keep it scope-level — the testable
requirement/scenario detail is the next step.

## 6. Finalize
Set this change's `stages.propose = "done"`, append a `transitions` entry, and tell the user to run
`/workflow:specify` next (you may `/clear` first — the two steps are independent and resumable).
