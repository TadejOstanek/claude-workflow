# OpenSpec integration (workflow-conventions reference)

Read this only if you are `/workflow:generate-openspec` — the standalone, optional, terminal command that exports a
change to OpenSpec. Nothing else in the pipeline reads this file or touches the `openspec` CLI; the day-to-day spec
of record is `spec.md` (see `state-and-layout.md`).

- **`<specRoot>`** is the repo-relative directory whose `openspec/` holds this change (default `"."` = repo
  root). Chosen fresh each time you run `/workflow:generate-openspec` — nothing about it is persisted to
  `state.json`. A repo may keep one root `openspec/` *or* opt into per-app/domain sub-roots (`goods/openspec/`,
  `packages/api/openspec/`, …). Simple repos never see this: `specRoot` just stays `"."`.
- We use OpenSpec for **`proposal` + `specs` only** — never its `design` or `tasks` artifacts. This workflow's own
  `architecture.md`/`code-design.md`/autonomous loop already cover those. Stock `openspec validate`/`archive` work
  on proposal + specs alone.

## Picking `specRoot` (cwd discipline)

OpenSpec resolves its root from the **working directory**: `change`, `validate`, and `archive` operate on
`<cwd>/openspec/` (no walk-up); `status` walks up to the *nearest* ancestor `openspec/`. So a change's spec lives
wherever you run `openspec`. Run **every** `openspec` invocation for this export with `<specRoot>` as cwd —
`(cd "<specRoot>" && openspec …)`. Default `"."` (repo root). A repo organizes specs **per app/domain** simply by
creating sub-root `openspec/` dirs (`goods/openspec/`, …) and targeting one; cross-cutting changes use `"."`.
Discover existing roots — never hardcode paths or app names, so this stays repo-agnostic:
```bash
find . -type d -name openspec -not -path '*/changes/archive/*' -not -path '*/node_modules/*' 2>/dev/null
```
The `specRoot` for each is that dir's parent (e.g. `goods/openspec` → `goods`; `./openspec` → `.`). If more than
the repo root is available (or the repo documents per-app/domain roots, e.g. in `openspec/AGENTS.md` or
`CLAUDE.md`), ask the user which root this change targets: **repo root (`.`)**, an **existing sub-root**, or a
**new path**. Default to `"."`. If the chosen `<specRoot>` has no `openspec/` yet, create the dir if needed and
initialize it — for a **sub-root** use `--tools none` so AI-tool wiring isn't duplicated per app (that lives once
at the repo root): `mkdir -p "<specRoot>" && (cd "<specRoot>" && openspec init --tools none)` (use `--tools claude`
only when initializing the repo **root** itself). Run `git status` afterward and show the user what `init`
generated before anything is committed.

## Authoring, from what the workflow already built

Requires the `openspec` CLI (`@fission-ai/openspec`, Node ≥ 20.19) and a one-time `openspec init` in each
`specRoot` (run it automatically when a chosen `specRoot` has no `openspec/` yet).

1. `openspec new change <id>` (kebab-case, derived from the feature + change slug), cwd = `<specRoot>`.
2. Pull the exact format from `openspec instructions proposal --change "<id>" --json`, and write `proposal.md`
   (`## Why`, `## What Changes`, `## Capabilities`, `## Impact`) by translating `spec.md`'s `## Why` plus whatever
   `architecture.md` says about scope. Derive the capability list yourself from `spec.md` + `code-design.md`.
3. Pull the specs format from `openspec instructions specs --change "<id>" --json`, and for each capability write
   `specs/<capability>/spec.md`: `## ADDED/MODIFIED/REMOVED Requirements`, each `### Requirement: <name>`
   (SHALL/MUST) with at least one `#### Scenario: <name>` (**exactly four hashes** — three fails silently) in
   `- **WHEN** … / - **THEN** …` form. Translate each `spec.md` Acceptance Criteria checkbox into one or more
   scenarios, grounded in what `implementation.md`/`tests.md`/`review.md` say was actually built — this is more
   accurate than speculating up front, since the behavior already exists and is tested. For a MODIFIED requirement
   on an existing capability, copy the full existing block from `<specRoot>/openspec/specs/<capability>/spec.md`
   before editing it.
4. Confirm scope with the user (present the capability list) before finalizing.

## Merging

```bash
(cd "<specRoot>" && openspec validate "<change-id>")
```
Fix any structural errors until it passes. Then:
```bash
(cd "<specRoot>" && openspec archive -y "<change-id>")
```
This merges the ADDED/MODIFIED/REMOVED/RENAMED deltas into `<specRoot>/openspec/specs/<capability>/spec.md` and
moves the change to `<specRoot>/openspec/changes/archive/YYYY-MM-DD-<change-id>/`. For a tooling/doc-only change
with no spec deltas, use `--skip-specs` instead.

**Backfill Purpose for any brand-new capability.** When this export ADDs a capability that didn't exist before,
`openspec archive` creates its `spec.md` with a placeholder: `## Purpose\nTBD - created by archiving change <id>.
Update Purpose after archive.` Grep the specs this export just touched for that literal placeholder:
```bash
grep -rl "TBD - created by archiving change" "<specRoot>/openspec/specs"
```
For each match, replace the `## Purpose` line with a real 1-3 sentence purpose grounded in `spec.md`'s `## Why` and
the requirements now merged into that spec. Leave every other spec's Purpose untouched.

## Committing

Stage only `<specRoot>/openspec/specs/` and the moved `<specRoot>/openspec/changes/archive/...` dir (the old
`<specRoot>/openspec/changes/<change-id>/` is gone after the move). Never `git add -A`, never `.workflow/`, never
unrelated edits. Concise why-focused message, no Claude attribution. This lands as a commit on the change's
existing branch — whether that branch is still just open as a draft PR or already under review, this simply adds a
commit to it (run the usual checkout-safety check first: clean tree, on the right branch).
