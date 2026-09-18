# State & layout (workflow-conventions reference)

Read this when your stage creates, reads, or updates `.workflow/<feature-slug>/state.json`, or needs the
`.workflow/` folder layout or how to resume cold. Core GATE/checkbox conventions live in
`workflow:workflow-conventions` itself.

## Unit of work: the change

The unit is a **change** = one PR. Every change's spec is authored by `/workflow:propose` — orient in the code,
then talk through Why + Acceptance Criteria in one session, into `spec.md` — then, by default, `/workflow:arch` (the data-model &
structural-fit pass; skippable) — then `/workflow:design` (code design) and `/workflow:build` (the autonomous loop:
implement+test → test/lint → review → draft PR). When the work is too big for one PR, an **epic** groups several
changes: `/workflow:arch` plans the breakdown — the epic has **no spec of its own**, its intent lives in the
architecture doc — then each change runs the same propose → design → build.

`/workflow:start` picks the **mode**: `single` (one change, no epic architecture) or `epic` (architecture
breakdown + multiple changes).

## How much rigor does a change need? (the complexity triage)

Classified `complexity: "light" | "standard" | "deep"` when the change is first scoped (`/workflow:start` for a
single change, per change in `/workflow:arch` for an epic) — the workflow **recommends** from breadth/blast-radius
language in the change's own description ("one function"/"quick fix" → `light`; "migration"/"new subsystem"/
"cross-cutting" → `deep`; anything else → `standard`), the **user always confirms**. `type` is a soft signal only in
epic mode (`tidy-first`/`tidy-after` skew `light`; a stated-large `feature` skews `deep`) — never a hard mapping.
This tier selects the model+effort each build/review-pr/insights/design-critic subagent runs at — see
`reference/model-tiers.md`; it has no other effect (a `light` change still gets the full stage sequence, including
`propose` — every change gets acceptance criteria, just phrased at domain or technical altitude as fits).

## Folder layout

```
.workflow/<feature-slug>/
  state.json          # machine state — source of truth for resume + status (schema below)
  architecture.md     # EPIC ONLY: intent + how the work splits into changes (absent in single mode)
  <NN>-<change-slug>/ # one folder per change (single mode = exactly one; zero-padded order) — execution state
    references.md     # minimal append-only pointer list (path/symbol + one-line why + stage tag); seeded by
                      #   `propose`, appended to by every later stage as it discovers more relevant code — never
                      #   rewritten or pruned
    spec.md            # this workflow's native spec of record — Why + checkbox Acceptance Criteria; output of
                      #   `propose`, read by every later stage
    architecture.md   # data model & structural fit — output of the `architecture` stage (/workflow:arch); present
                      #   when that stage ran (single-mode changes by default); may note an ADR path
    code-design.md    # interactive; may note an ADR path if one was written
    design-critique.md # adversarial design-critic findings — present when that pass ran
    implementation.md # code agent's discoveries/deviations
    tests.md          # test agent's discoveries/deviations
    test-lint.md      # test & lint run report
    review.md         # review verdict + findings
    openspec-export.md # OPTIONAL: present only if /workflow:generate-openspec ran for this change
```

- `<feature-slug>`/`<change-slug>`: short kebab-case. `.workflow/` stage filenames are fixed and **never** contain
  the feature/change name (the folder carries it).
- The **PR** stage writes no file — its draft-PR link is surfaced by `/workflow:build`.

## state.json schema

```json
{
  "feature": "add-foo",
  "title": "Add Foo to Bar",
  "created": "2026-06-17",
  "mode": "single",
  "currentStage": "propose",
  "epic": { "architecture": "na" },
  "changes": [
    {
      "slug": "01-data-model", "type": "feature", "order": 1, "depends_on": [],
      "complexity": "standard",
      "ticket": null, "branch": null,
      "stages": {
        "propose": "pending", "architecture": "pending", "design": "pending",
        "build": "pending", "test-lint": "pending", "review": "pending", "pr": "pending"
      }
    }
  ],
  "transitions": [
    { "at": "2026-06-17T10:00:00Z", "from": "init", "to": "propose", "reason": "workflow created (single)", "sessionId": "9493afd2-7fcf-497e-9813-355c67d2a79f" }
  ]
}
```

- `mode`: `single` or `epic`. In `single` mode `epic.architecture` is `na` and `changes` has exactly one entry; in
  `epic` mode `epic.architecture` runs first (`/workflow:arch`) and populates `changes[]`.
- Stage status values: `pending` · `in_progress` · `done` · `failed` · `na`. An `na` stage is one that will
  **never** run for this change — it is neither `pending` nor blocking: resume never picks it, and "all stages
  done" treats `na` as satisfied.
- `propose` defaults to `"pending"` for every change.
- `architecture` is the per-change data-model & structural-fit stage (`/workflow:arch` in single mode), run **after
  `propose` and before `design`**. Default status when a change is first scoped: **single mode** → `"pending"`
- `complexity` is `"light" | "standard" | "deep"` — see "How much rigor does a change need?" above. Set when the
  change is first scoped; required from then on.
- `ticket`, `branch` live **on each change** (not top-level — a workflow can have several changes, each with its
  own branch/PR). `null` until `/workflow:build` provisions them; see `reference/git-safety.md`.
- Per-change stages run: `propose` → `architecture` → `design` → `build` (the parallel implement + test-author pair,
  both green = `done`) → `test-lint` → `review` → `pr`, all inside `/workflow:build`.
- **Once a stage is `done`, its own command won't re-run it** — `/workflow:propose`, `/workflow:arch`, and
  `/workflow:design` each stop if asked to redo an already-`done` stage. An earlier doc can still change after
  that, but only in place, by whichever later stage is actively running (e.g. `/workflow:design` editing an
  already-`done` `architecture.md`), and only after confirming with the user first. This never touches other
  stages' status in `state.json`.
- `/workflow:build` has two modes. **Resume** (`full`/blank) runs all stages minus those already `done` — the
  normal case. **Manual control** (`light` / `only <stages>` / `skip <stages>`) runs exactly the named subset
  *without* subtracting `done` — for ad hoc runs like forcing a lone re-run of `test-lint`. The implement +
  test-author pair (`build`) always runs **together** when selected. The change is committed by `review` if it
  runs, else by `pr`; pick neither and the loop leaves it uncommitted. Once `review` has cleanly committed a change
  it's treated as landed — this workflow doesn't re-land already-committed code; redo it outside this workflow.
  Unselected stages keep their prior status (run them in a later build, or mark `na` if never wanted).
- A stage is marked `done` only when its output file exists and its GATE is `pass` (where it has one). Append a
  `transitions` entry on every status change with a one-line reason **and this session's `sessionId`** — the
  value of the `CLAUDE_CODE_SESSION_ID` env var (fetch it once per session and reuse the same value for every
  entry you append that session). It identifies which session transcript
  (`~/.claude/projects/<project-slug>/<sessionId>.jsonl`) performed the transition.


## Resume

`state.json` is the sole cross-session recovery path. On entering any stage: read `state.json`, the epic
`architecture.md` and the change's own `architecture.md` if present, `spec.md`, `references.md` if present, and the
change's prior `.workflow/` files. If this stage's own file already exists, also read the *next* stages' files to
learn why it was sent back, then fix accordingly.
