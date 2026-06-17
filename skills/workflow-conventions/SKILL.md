---
name: workflow-conventions
description: Shared file layout, state schema, GATE format, and naming for the multi-agent dev workflow. Read by every workflow command and agent so each follows the same handoff contract instead of re-deriving it.
---

# Workflow Conventions (shared handoff contract)

Every workflow stage reads prior stages' files and writes its own. Stages share **no conversation context** — the
files in `.workflow/` are the only handoff. Keep produced `.md` terse in *wording*, but **never drop content to be
terse**: capture every requirement, criterion, and decision the prior stage or the user provided. Losing a
requirement in a handoff silently breaks every stage after it. Prefer adding more over cutting.

## Folder layout

Two homes, one clean seam: **`.workflow/`** holds planning + execution state (this engine); **`openspec/`** holds
the behavioral spec as a per-phase *change* plus the accumulating canonical library (the thin seam — see "OpenSpec
integration" below).

```
.workflow/<feature-slug>/
  state.json          # machine state — source of truth for resume (schema below)
  OVERVIEW.md         # human-readable mirror, one section per phase, checkboxes
  spec.md             # EPIC spec — why/what + the phase breakdown (interactive; planning intent)
  architecture.md     # EPIC architectural design (interactive)
  <NN>-<phase-slug>/  # one folder per phase (always ≥1, zero-padded order: 01-, 02-) — execution state
    architecture.md   # OPTIONAL phase-specific arch (inherits epic; only if the user adds detail)
    code-design.md    # interactive
    implementation.md # code agent's discoveries/deviations
    tests.md          # test agent's discoveries/deviations
    test-lint.md      # test & lint run report
    review.md         # review verdict + findings
    documentation.md  # list of docs produced
    qa.md             # manual QA instructions

openspec/             # OpenSpec home (created once by `openspec init`)
  changes/<change-id>/          # ONE change per phase = one PR — the phase's behavioral spec
    proposal.md                 # why/what for this phase (authored by /workflow:phase-spec)
    specs/<capability>/spec.md  # ADDED/MODIFIED/REMOVED deltas: `### Requirement:` + `#### Scenario:` (4 hashes)
  specs/<capability>/spec.md    # CANONICAL living library — accumulates as each phase's PR merges + archives
  changes/archive/YYYY-MM-DD-<change-id>/   # archived changes (full history)
```

- `<feature-slug>` and `<phase-slug>`: short kebab-case. `.workflow/` stage filenames are fixed and **never**
  contain the feature/phase name (the folder already carries it).
- The per-phase **behavioral spec is the OpenSpec change**, not a `.workflow/` file. Each phase's `change` id is
  recorded in `state.json`; the epic `spec.md` stays planning intent + the phase breakdown.
- A phase `type` is `feature` or `refactor`.
- The **pull request** stage writes no file — its draft-PR link is surfaced by `/workflow:build` from the loop
  result. The **archive** (canonical-spec merge) runs post-**merge** via `/workflow:archive`, never in the loop.

## Checkboxes vs prose

Use checkboxes (`- [ ]`) only for: the spec's **acceptance criteria**, and any **list of steps to perform** or
**conditions that must be true** (QA steps, planned test behaviors, the OVERVIEW per-phase stage list). Everything
else — descriptions, decisions, discoveries, findings, rationale, the GATE block — is normal prose.

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
      "change": null,
      "stages": {
        "spec": "pending", "code-design": "pending", "build": "pending", "test-lint": "pending",
        "review": "pending", "docs": "pending", "qa": "pending", "pr": "pending", "archive": "pending"
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
- `change` is the phase's OpenSpec change id (kebab-case), set by `/workflow:phase-spec` when it runs
  `openspec new change`. Null until then.
- `spec` (per phase) is the interactive OpenSpec-change authoring (proposal + capability deltas) — the phase's
  behavioral spec. `code-design` follows it. `build` covers the parallel implement + test-author pair (both green
  = `done`). The `docs` stage writes `documentation.md`. `archive` is the post-**merge** canonical-spec merge run
  by `/workflow:archive` (`done` once `openspec archive` has folded this change's deltas into `openspec/specs/`).
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
Non-interactive stages also return this gate as structured output. Verification is layered, not blind trust: the
opus **review** stage independently re-derives correctness from the actual `git diff` (not the implementer's
report), the **test-runner** judges by real tool output (not exit code), and `/workflow:build` re-checks each
stage's on-disk GATE after the loop before marking it `done`.

## OVERVIEW.md format

One `##` section per phase (plus an epic section), each a checkbox list of stages with a one-line status. This is
the only file written for the human; keep it scannable.

## OpenSpec integration (the thin seam)

OpenSpec sits **underneath** this workflow as a passive spec store + canonical library, driven by the engine —
it does not drive the workflow. Grain: **one OpenSpec change = one phase = one PR.**

- **Authoring** (`/workflow:phase-spec`, interactive, per phase): `openspec new change <change-id>`, then write
  `proposal.md` + `specs/<capability>/spec.md` deltas using the exact format from
  `openspec instructions <artifact> --change <id> --json` (capability-scoped `### Requirement:` + `#### Scenario:`
  with **exactly four** hashes; ADDED/MODIFIED/REMOVED/RENAMED sections). Record the `change` id in `state.json`.
- **Consumption**: downstream stages (code-design, the loop's implementer/test/reviewer) read the phase's
  behavioral spec from `openspec/changes/<change>/` instead of a `.workflow/` spec file.
- **Archive** (`/workflow:archive`, after the PR **merges**): `openspec archive -y <change>` validates, merges the
  change's deltas into the canonical `openspec/specs/<capability>/`, and moves the change to `changes/archive/`.
  Never archive on the draft PR — the canonical library must reflect only merged behavior.
- Requires the `openspec` CLI (`@fission-ai/openspec`, Node ≥20.19) and a one-time `openspec init` in the repo.

## Resume

`state.json` is the sole cross-session recovery path. On entering any stage: read `state.json`, the epic `spec.md`
+ `architecture.md`, the phase's OpenSpec change (`openspec/changes/<change>/` — its behavioral spec), and the
current phase's prior `.workflow/` files. If this stage's own file already exists, also read the *next* stages'
files to learn why it was sent back, then fix accordingly.
