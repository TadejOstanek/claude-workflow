---
name: workflow-conventions
description: Shared file layout, state schema, GATE format, and naming for the multi-agent dev workflow. Read by every workflow command and agent so each follows the same handoff contract instead of re-deriving it.
---

# Workflow Conventions (shared handoff contract)

Every workflow stage reads prior stages' files and writes its own. Stages share **no conversation context** — the
files (and the OpenSpec change) are the only handoff. Keep produced `.md` terse in *wording*, but **never drop
content to be terse**: capture every requirement, criterion, and decision the prior stage or the user provided.
Losing a requirement in a handoff silently breaks every stage after it. Prefer adding more over cutting.

## Unit of work: the change

The unit is a **change** = one OpenSpec change = one PR. A change is authored in two steps —
`/workflow:propose` (why/what + capabilities) then `/workflow:specify` (requirement/scenario deltas) — then
`/workflow:design` (code design) and `/workflow:build` (the autonomous loop → draft PR), and finally
`/workflow:archive` (manual, when you're sure it's done). When the work is too big for one PR, an **epic** groups
several changes: `/workflow:arch` plans the breakdown — the epic has **no spec of its own**, its intent lives in
the architecture doc — then each change runs the same propose → specify → design → build → archive.

`/workflow:start` picks the **mode**: `single` (one change, no epic architecture) or `epic` (architecture
breakdown + multiple changes).

## Folder layout

Two homes: **`.workflow/`** holds planning + execution state (this engine); **`openspec/`** holds the behavioral
spec as a per-change OpenSpec change plus the accumulating canonical library (see "OpenSpec integration").

```
.workflow/<feature-slug>/
  state.json          # machine state — source of truth for resume + status (schema below)
  architecture.md     # EPIC ONLY: intent + how the work splits into changes (absent in single mode)
  <NN>-<change-slug>/ # one folder per change (single mode = exactly one; zero-padded order) — execution state
    architecture.md   # OPTIONAL per-change architectural detail
    code-design.md    # interactive
    implementation.md # code agent's discoveries/deviations
    tests.md          # test agent's discoveries/deviations
    test-lint.md      # test & lint run report
    review.md         # review verdict + findings
    documentation.md  # list of docs produced
    qa.md             # manual QA instructions

openspec/             # OpenSpec home (one-time `openspec init`)
  changes/<change-id>/          # the change's behavioral spec (authored by propose + specify)
    proposal.md                 # why/what + capabilities
    specs/<capability>/spec.md  # ADDED/MODIFIED/REMOVED deltas: `### Requirement:` + `#### Scenario:` (4 hashes)
  specs/<capability>/spec.md    # CANONICAL living library — you merge into it with /workflow:archive when done
  changes/archive/YYYY-MM-DD-<change-id>/   # archived changes (full history)
```

- We use OpenSpec for **`proposal` + `specs` only** — never its `design` or `tasks` artifacts. This workflow's
  architecture + code design + autonomous loop replace those. (OpenSpec's `design` artifact ≠ `/workflow:design`,
  which writes `code-design.md`.) Stock `openspec validate`/`archive` work on proposal + specs alone.
- `<feature-slug>`/`<change-slug>`: short kebab-case. `.workflow/` stage filenames are fixed and **never** contain
  the feature/change name (the folder carries it).
- The **PR** stage writes no file — its draft-PR link is surfaced by `/workflow:build`. **Archive** is a manual
  step (`/workflow:archive`), not part of the loop.

## Checkboxes vs prose

Use checkboxes (`- [ ]`) only for: lists of **steps to perform** or **conditions that must be true** (QA steps,
planned test behaviors) — and OpenSpec spec scenarios use OpenSpec's own
format. Everything else — descriptions, decisions, discoveries, findings, rationale, the GATE block — is prose.

## state.json schema

```json
{
  "feature": "add-foo",
  "title": "Add Foo to Bar",
  "created": "2026-06-17",
  "mode": "single",
  "ticket": "sc-1234",
  "branch": null,
  "worktree": null,
  "currentStage": "propose",
  "epic": { "architecture": "na" },
  "changes": [
    {
      "slug": "01-data-model", "type": "feature", "order": 1, "depends_on": [],
      "change": null,
      "stages": {
        "propose": "pending", "specify": "pending", "design": "pending", "build": "pending",
        "test-lint": "pending", "review": "pending", "docs": "pending", "qa": "pending",
        "pr": "pending", "archive": "pending"
      }
    }
  ],
  "transitions": [
    { "at": "2026-06-17T10:00:00Z", "from": "init", "to": "propose", "reason": "workflow created (single)" }
  ]
}
```

- `mode`: `single` or `epic`. In `single` mode `epic.architecture` is `na` and `changes` has exactly one entry; in
  `epic` mode `epic.architecture` runs first (`/workflow:arch`) and populates `changes[]`.
- Stage status values: `pending` · `in_progress` · `done` · `failed` · `na`.
- `change` is the OpenSpec change id (kebab-case), set by `/workflow:propose`. Null until then.
- Per-change stages run: `propose` → `specify` → `design` → `build` (the parallel implement + test-author pair,
  both green = `done`) → `test-lint` → `review` → `docs` → `qa` → `pr` → `archive`. `docs` writes
  `documentation.md`. **`archive` is `done` only once you've run `/workflow:archive`** — a deliberate manual step.
- `/workflow:build` has two modes (see "Iterating" below). **Resume** (`full`/blank) runs all stages minus those
  already `done`. **Redo** (`light` / `only <stages>` / `skip <stages>`) runs exactly the named subset *without*
  subtracting `done` — for re-building against an amended spec. The implement + test-author pair (`build`) always
  runs **together** when selected. The change is committed by `review` if it runs, else by `pr`, else by the
  redo-only **`commit`** token (commit + push, no PR rewrite); pick none of the three and the loop leaves it
  uncommitted. Unselected stages keep their prior status (run them in a later build, or mark `na` if never wanted).
- A stage is marked `done` only when its output file exists and its GATE is `pass` (where it has one). Append a
  `transitions` entry on every status change with a one-line reason.

## GATE section (end of every stage output file)

```
## GATE
- status: pass | fail
- summary: <one line>
- next: <next stage name | escalate>
```
On `fail`, also add `- return-to:` / `- reason:` / `- instructions:`. Non-interactive stages also return this gate
as structured output. Verification is layered: the opus **review** stage re-derives correctness from the actual
`git diff`, the **test-runner** judges by real tool output, and `/workflow:build` re-checks each stage's on-disk
GATE after the loop.

## OpenSpec integration (the thin seam)

OpenSpec sits **underneath** this workflow as a passive spec store + canonical library, driven by the engine.
Grain: **one OpenSpec change = one change = one PR.**

- **Authoring** — `/workflow:propose` runs `openspec new change <id>` and writes `proposal.md`; `/workflow:specify`
  writes the `specs/<capability>/spec.md` deltas. Both pull the exact format from
  `openspec instructions <artifact> --change <id> --json`.
- **Consumption** — code-design and the loop's agents read the change's behavioral spec from
  `openspec/changes/<change>/`. The reviewer commits the change's proposal + specs into its PR, but **never**
  `openspec/specs/` (the canonical library).
- **Archive is manual and deliberate** (`/workflow:archive`): run it yourself when you are sure the change is fully
  done. It merges the change's deltas into the canonical `openspec/specs/<capability>/` and moves the change to
  `changes/archive/`. It is **not** automated by the loop. Run it on the change's branch *before* merging (so the
  canonical spec ships in the PR) or after — your call.
- Requires the `openspec` CLI (`@fission-ai/openspec`, Node ≥ 20.19) and a one-time `openspec init` in the repo.

## Iterating (going back a step — the normal case)

This is **not** a waterfall. You will routinely learn something late (manual QA finds a gap, a review comment lands)
and move *backward*: amend the spec, refine the code-design, rebuild only what changed — without re-running the
stages you don't want. The workflow supports this, and stages are revisitable. The rules that keep it sane:

- **Re-open an upstream stage by naming the change.** `/workflow:specify <change>` and `/workflow:design <change>`
  re-author in place — `specify` just re-edits the OpenSpec `spec.md` (then re-validates); `design` reuses the
  existing branch/worktree (it does **not** re-create them). Auto-resolution only finds *pending* stages, so when
  revisiting a done stage you pass the change explicitly.
- **Re-opening upstream does NOT auto-invalidate downstream.** Downstream stages stay `done` even though their
  outputs (`review.md`, `qa.md`, the PR body) now describe older code. This is deliberate: **you** decide what to
  redo. The upstream command *warns* that they're stale and gives the redo command — it never forces a cascade.
- **Resume vs. redo is your keyword, not inferred state** (the engine can't tell a crashed run from a deliberate
  rebuild). `/workflow:build` blank/`full` = resume (skip done); `light`/`only`/`skip` = redo the named subset even
  if done. So the QA→fix loop is: `/workflow:specify <c>` → `/workflow:design <c>` → `/workflow:build <c> only
  build commit` (re-implement + push to the existing draft PR, no review/QA/PR-body rewrite). Use `only build` (no
  commit) to leave it uncommitted, or add `review`/`qa` to the `only` list when you *do* want them this round.
- **Archive last protects iteration.** The canonical merge (`/workflow:archive`) is irreversible, so iterate freely
  *before* it; never archive a change you might still revise.

## Status (human-readable)

There is no separate human-readable file — `/workflow:start` with no argument reads `state.json` and reports each
active workflow's mode, current stage, and exact next command.

## Resume

`state.json` is the sole cross-session recovery path. On entering any stage: read `state.json`, the epic
`architecture.md` if present, the change's OpenSpec change (`openspec/changes/<change>/` — its behavioral spec),
and the change's prior `.workflow/` files. If this stage's own file already exists, also read the *next* stages'
files to learn why it was sent back, then fix accordingly.
