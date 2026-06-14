---
name: workflow-conventions
description: Shared file layout, state schema, GATE format, and naming for the multi-agent dev workflow. Read by every workflow command and agent so each follows the same handoff contract instead of re-deriving it.
---

# Workflow Conventions (shared handoff contract)

Every workflow stage reads prior stages' files and writes its own. Stages share **no conversation context** — the
files in `.workflow/` are the only handoff. Keep produced `.md` terse in *wording*, but **never drop content to be
terse**: capture every requirement, criterion, and decision the prior stage or the user provided. Losing a
requirement in a handoff silently breaks every stage after it. Prefer adding more over cutting.

## Folder layout (in the target repo)

```
.workflow/<feature-slug>/
  state.json          # machine state — source of truth for resume (schema below)
  OVERVIEW.md         # human-readable mirror, one section per phase, checkboxes
  spec.md             # epic specification (interactive)
  architecture.md     # epic architectural design (interactive)
  <NN>-<phase-slug>/  # one folder per phase (always ≥1, zero-padded order: 01-, 02-)
    spec.md           # OPTIONAL phase-specific spec (inherits epic; only if user adds detail)
    architecture.md   # OPTIONAL phase-specific arch (inherits epic; only if user adds detail)
    code-design.md    # interactive
    implementation.md # code agent's discoveries/deviations
    tests.md          # test agent's discoveries/deviations
    test-lint.md      # test & lint run report
    review.md         # review verdict + findings
    documentation.md  # list of docs produced
    qa.md             # manual QA instructions
    pr.md             # PR link
```

- `<feature-slug>` and `<phase-slug>`: short kebab-case. Stage filenames are fixed and **never** contain the
  feature/phase name (the folder already carries it).
- A phase `type` is `feature`, `tidy-first` (refactor before features), or `tidy-after` (cleanup after).

## state.json schema

```json
{
  "feature": "add-foo",
  "title": "Add Foo to Bar",
  "created": "2026-06-13",
  "ticket": "sc-1234",
  "branch": "tadej/sc-1234/add-foo",
  "worktree": null,
  "currentStage": "architecture",
  "epic": { "spec": "done", "architecture": "in_progress" },
  "phases": [
    {
      "slug": "01-data-model", "type": "feature", "order": 1, "depends_on": [],
      "stages": {
        "code-design": "pending", "build": "pending", "test-lint": "pending",
        "review": "pending", "documentation": "pending", "qa": "pending", "pr": "pending"
      }
    }
  ],
  "transitions": [
    { "at": "2026-06-13T10:00:00Z", "from": "spec", "to": "architecture", "reason": "spec approved by user" }
  ]
}
```

- Stage status values: `pending` · `in_progress` · `done` · `failed` · `na` (not applicable).
- `epic` holds the two interactive epic-level stages. Each phase holds the remaining stages.
- `build` covers the parallel implement + test-author pair (both green = `done`).
- A stage is marked `done` **only when its output file exists and its GATE is `pass`** — so an interrupted stage
  re-runs cleanly. Append a `transitions` entry on every status change with a one-line reason.

## GATE section (end of every stage output file)

```
## GATE
- status: pass | fail
- summary: <one line>
- next: <next stage name | escalate>
```
On `fail`, also add:
```
- return-to: <stage that must fix it>
- reason: <what's wrong>
- instructions: <what the owning stage must change>
```
Non-interactive stages also return this gate as structured output to the loop; the loop verifies the on-disk file
matches before trusting it (verify, don't trust).

## OVERVIEW.md format

One `##` section per phase (plus an epic section), each a checkbox list of stages with a one-line status. This is
the only file written for the human; keep it scannable.

## Resume

`state.json` is the sole cross-session recovery path. On entering any stage: read `state.json`, the epic `spec.md`
+ `architecture.md`, and the current phase's prior files. If this stage's own file already exists, also read the
*next* stages' files to learn why it was sent back, then fix accordingly.
