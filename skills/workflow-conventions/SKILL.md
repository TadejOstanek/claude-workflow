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

The unit is a **change** = one PR. A *spec-bearing* change is authored in two steps —
`/workflow:propose` (why/what + capabilities) then `/workflow:specify` (requirement/scenario deltas) — then
`/workflow:design` (code design) and `/workflow:build` (the autonomous loop → draft PR), and finally
`/workflow:archive` (manual, when you're sure it's done). A *spec-less* change (`spec: "none"` — see below) skips
the two spec steps and goes straight to `/workflow:design` → `/workflow:build`; there is no OpenSpec change and
nothing to archive. When the work is too big for one PR, an **epic** groups
several changes: `/workflow:arch` plans the breakdown — the epic has **no spec of its own**, its intent lives in
the architecture doc — then each change runs the same propose → specify → design → build → archive.

`/workflow:start` picks the **mode**: `single` (one change, no epic architecture) or `epic` (architecture
breakdown + multiple changes).

## Does a change need a spec? (the triage)

Not every change has behavior to spec. Each change is classified `spec: "openspec"` or `spec: "none"` when it is
first scoped — `/workflow:start` for a single change, `/workflow:arch` per change for an epic. The workflow
**recommends** from the heuristic below and the **user always confirms** (it is their call per change):

- **Needs a spec (`"openspec"`)** — the change alters **observable application behavior**: user-facing flows, API
  contracts, data semantics, business rules — anything you'd phrase as a WHEN/THEN acceptance criterion. This is
  the default.
- **Spec-less (`"none"`)** — the change is **purely internal**, with no observable behavior change: refactors, code
  organization/renames, build/CI/infra, dependency bumps, performance-neutral cleanup, tooling. For epics, this
  usually matches `tidy-first` / `tidy-after` (and many `fix`) changes; `feature` changes are usually spec-bearing.

When in doubt, prefer `"openspec"` — a spec is cheap insurance against an unnoticed behavior change. A spec-less
change still goes through `/workflow:design` (its `code-design.md` becomes the sole behavioral contract) and the
full autonomous loop — only the two OpenSpec authoring steps and the archive merge are skipped.

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

<specRoot>/openspec/   # OpenSpec home for this change (one-time `openspec init` in <specRoot>)
  changes/<change-id>/          # the change's behavioral spec (authored by propose + specify)
    proposal.md                 # why/what + capabilities
    specs/<capability>/spec.md  # ADDED/MODIFIED/REMOVED deltas: `### Requirement:` + `#### Scenario:` (4 hashes)
  specs/<capability>/spec.md    # CANONICAL living library — you merge into it with /workflow:archive when done
  changes/archive/YYYY-MM-DD-<change-id>/   # archived changes (full history)
```

- **`<specRoot>`** is the repo-relative directory whose `openspec/` holds this change (default `"."` = repo
  root; stored per change in `state.json`). A repo may keep one root `openspec/` *or* opt into per-app/domain
  sub-roots (`goods/openspec/`, `packages/api/openspec/`, …) — see "OpenSpec integration". Simple repos never
  see this: `specRoot` just stays `"."`.

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
  "currentStage": "propose",
  "epic": { "architecture": "na" },
  "changes": [
    {
      "slug": "01-data-model", "type": "feature", "order": 1, "depends_on": [],
      "spec": "openspec", "change": null, "specRoot": ".",
      "ticket": null, "branch": null, "worktree": null,
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
- Stage status values: `pending` · `in_progress` · `done` · `failed` · `na`. An `na` stage is one that will
  **never** run for this change — it is neither `pending` nor blocking: resume never picks it, and "all stages
  done" treats `na` as satisfied.
- `spec` is whether this change carries an OpenSpec behavioral spec: `"openspec"` (default; absent ⇒ `"openspec"`
  for back-compat) or `"none"`. A `"none"` change is purely technical (no observable behavior change — see "Does a
  change need a spec?"): it **skips `propose` + `specify`** (both `na`), keeps `change: null`, has `archive: "na"`,
  and goes `/workflow:start` (or `/workflow:arch`) → `/workflow:design` → `/workflow:build` directly. Its
  `code-design.md` is then the sole behavioral contract (no OpenSpec change, no `proposal.md`, no scenarios).
- `change` is the OpenSpec change id (kebab-case), set by `/workflow:propose`. Null until then — and stays null for
  a `spec: "none"` change.
- `specRoot` is this change's OpenSpec root — the repo-relative dir whose `openspec/` holds it (default `"."`).
  Set by `/workflow:propose`; absent ⇒ treat as `"."` (back-compat). Every `openspec` call for this change runs
  with `<baseDir>/<specRoot>` as the working directory (see "Branch/worktree provisioning" below for `baseDir`).
- `ticket`, `branch`, `worktree` live **on each change** (not top-level — a workflow can have several changes, each
  with its own branch/PR). `null` until provisioned; see "Branch/worktree provisioning" below for when and how.
  **Back-compat**: if a change's own `ticket`/`branch`/`worktree` are absent/`null` but the now-removed top-level
  `state.json` fields of the same name are present (a workflow created before this schema moved them per-change),
  treat those top-level values as this change's — don't re-provision. This only disambiguates cleanly for a
  `single`-mode workflow (its one change unambiguously owned the top-level fields); for an in-flight `epic` the
  top-level fields only ever reflected the most-recently-designed change anyway, so applying this fallback is no
  worse than the old behavior, just not a full fix for older changes in that epic.
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

## Branch/worktree provisioning (per change)

Every change gets its own branch (one change = one PR) — this is the **one place** that owns creating it; every
stage that needs the branch/worktree reads it off the change's `state.json` entry rather than re-deriving it.

- **When**: a change writes its first **committable** file (something that ends up in the PR) at different points
  depending on `spec`. `.workflow/<feature>/**` is never committable — it's never staged into a PR (see "Consumption"
  under OpenSpec integration) — so it never triggers provisioning.
  - **Spec-bearing (`spec:"openspec"`)** — `/workflow:propose` writes the OpenSpec change (`proposal.md`, later
    `specs/**/*.md`), which the reviewer/PR-author **do** stage into the PR. So provision **at the top of
    `/workflow:propose`**, before picking `specRoot` or running `openspec new change` — only if this change's
    `ticket`/`branch` are still `null`. (In single mode this lands on the very first turn of `/workflow:propose`,
    right after `/workflow:start`, since nothing runs in between. In epic mode this provisions each change lazily,
    right when its own pipeline actually begins — not all at once during `/workflow:arch`.)
  - **Spec-less (`spec:"none"`)** — there's no OpenSpec change; nothing committable exists before
    `/workflow:design` writes `code-design.md` (`.workflow/`, not committable) and `/workflow:build` starts
    producing real code. Provision **at the top of `/workflow:design`**, as today.
- **How**: prompt for the ticket number, derive the branch name `{username}/sc-{ticket}/{description}` (username
  from `git config user.name` / `gh api user --jq .login`), then ask whether to work in a **worktree** *before*
  creating anything — the two paths create the branch differently and are mutually exclusive, not sequential steps:
  - **Worktree**: `git worktree add -b <branch> <path> main` — one command that creates the branch **and** the
    worktree together, checked out only in `<path>`. Never runs `git checkout -b` first — a branch already checked
    out in the main working tree cannot also be added as a worktree (`fatal: already checked out`).
  - **No worktree**: `git checkout -b <branch> main` — this *does* switch the main checkout onto the new branch;
    that's what makes subsequent writes (the OpenSpec change, code) land on it.

  Record `ticket`, `branch`, `worktree` on **this change's entry** in `state.json`.
- **Re-entry**: if `ticket`/`branch` are already set on the change (checking the back-compat fallback above too),
  reuse them — never re-prompt or re-create. This is what lets `/workflow:design` (re-designing) and
  `/workflow:specify` (amending) land on the same branch, and what keeps a pre-this-change workflow from having its
  already-provisioned branch clobbered by a `git checkout -b`/`worktree add` that would fail on a branch that
  already exists.
- **`baseDir` (the working-directory rule)**: once a change has a `worktree` recorded **and the directory still
  exists on disk**, every command that touches **repo content** for that change — `openspec` CLI calls, reading or
  writing code, git operations — runs with cwd `<worktree>/<subpath>`, **never** `<repoRoot>/<subpath>`. This
  matters because the interactive session's own cwd never changes (it never switches the main checkout) — a bare
  `(cd "<specRoot>" && …)` always resolves under the repo root even after a worktree exists elsewhere, silently
  writing into the wrong checkout. If there's no `worktree` (or it was already cleaned up, e.g. post-merge by the
  time `/workflow:archive` runs), `baseDir` is the repo root. `.workflow/` paths are **never** affected by
  `baseDir` — they're always repo-root-relative, worktree or not.

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

## Test-runner detection

Detect how a repo runs its tests by scanning it, in this order (used by `/workflow:build` and `/workflow:review-pr`).
Every branch below must set `testCmd` to a concrete, runnable command string — never leave it a bare flag or null
when a runner was actually found:
- `peel.yml` present → `testCmd: "peel test --target <tool>"` (the concrete scoped target, e.g. `pytest`) **and**
  `isPeel:true`.
- else a `Makefile` `test` target → `testCmd: "make test"`.
- else `pyproject.toml`/`pytest.ini` present → `testCmd: "pytest"`.
- else a `package.json` test script → `testCmd: "npm test"`.
- else no runner found → `/workflow:build` **asks the user** for a command rather than passing `testCmd: null`
  silently; `/workflow:review-pr` just skips running tests (best-effort there).

A `testCmd` of `null` skips the whole test-lint stage — pass it only when you've actually asked and the user said to
proceed without tests. Some runners (peel) exit `0` even when they never ran (Docker down, expired session) — judge
by real output, not the exit code.

## OpenSpec integration (the thin seam)

OpenSpec sits **underneath** this workflow as a passive spec store + canonical library, driven by the engine.
Grain: **one OpenSpec change = one change = one PR.**

- **Where the spec lives — `specRoot` (cwd discipline).** OpenSpec resolves its root from the **working
  directory**: `change`, `validate`, and `archive` operate on `<cwd>/openspec/` (no walk-up); `status` walks up
  to the *nearest* ancestor `openspec/`. So a change's spec lives wherever you run `openspec`. This workflow
  records that directory as the change's **`specRoot`** and runs **every** `openspec` invocation for the change
  with `<baseDir>/<specRoot>` as cwd — `(cd "<baseDir>/<specRoot>" && openspec …)` (`baseDir` per "Branch/worktree
  provisioning" above — the change's worktree if one exists, else the repo root). Default `specRoot` is `"."`
  (repo root). A repo organizes specs **per app/domain** simply by creating sub-root `openspec/` dirs
  (`goods/openspec/`, …) and pointing a change's `specRoot` at one; cross-cutting changes use `"."`. The engine
  **discovers** existing roots — it never hardcodes paths or app names, so this stays repo-agnostic.
- **Authoring** — `/workflow:propose` provisions the change's branch/worktree first (see "Branch/worktree
  provisioning"), then picks `specRoot`, runs `openspec new change <id>` and writes `proposal.md`;
  `/workflow:specify` writes the `specs/<capability>/spec.md` deltas. Both pull the exact format from
  `openspec instructions <artifact> --change <id> --json`. All of these run with cwd = `<baseDir>/<specRoot>`, so
  the OpenSpec change lands **on the change's own branch/worktree**, not the main checkout.
- **Consumption** — for a spec-bearing change, code-design and the loop's agents read the change's behavioral spec
  from `<baseDir>/<specRoot>/openspec/changes/<change>/` (passed to the loop as the absolute `changeDir`, computed
  under `workdir` — see `/workflow:build`). The reviewer commits the change's proposal + specs into its PR, but
  **never** `<specRoot>/openspec/specs/` (the canonical library). For a **spec-less** change there is no OpenSpec
  change: `changeDir` is `null`, `code-design.md` is the whole behavioral contract, and nothing OpenSpec-related is
  read or committed.
- **Archive is manual and deliberate** (`/workflow:archive`): run it yourself (with cwd = `<baseDir>/<specRoot>`,
  `baseDir` = the change's worktree if it still exists on disk, else the repo root — covers running it before or
  after the worktree/branch was cleaned up post-merge) when you are sure the change is fully done. It merges the
  change's deltas into the canonical `<specRoot>/openspec/specs/<capability>/` and moves the change to
  `<specRoot>/openspec/changes/archive/`. It is **not** automated by the loop. Run it on the change's branch
  *before* merging (so the canonical spec ships in the PR) or after — your call.
- Requires the `openspec` CLI (`@fission-ai/openspec`, Node ≥ 20.19) and a one-time `openspec init` in each
  `specRoot` (the engine runs it automatically when a chosen `specRoot` has no `openspec/` yet).

## Iterating (going back a step — the normal case)

This is **not** a waterfall. You will routinely learn something late (manual QA finds a gap, a review comment lands)
and move *backward*: amend the spec, refine the code-design, rebuild only what changed — without re-running the
stages you don't want. The workflow supports this, and stages are revisitable. The rules that keep it sane:

- **Re-open an upstream stage by naming the change.** `/workflow:specify <change>` and `/workflow:design <change>`
  re-author in place — `specify` just re-edits the OpenSpec `spec.md` (then re-validates); both reuse the change's
  existing `ticket`/`branch`/`worktree` (per "Branch/worktree provisioning" — they were already set by
  `/workflow:propose` for a spec-bearing change, or by an earlier `/workflow:design` for a spec-less one; neither
  re-creates them). Auto-resolution normally finds only *pending* stages; in `single` mode (one change) a blank
  invocation still defaults to that change so you needn't name it, but in `epic` mode you pass the change
  explicitly to revisit a `done` stage.
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
`architecture.md` if present, the change's OpenSpec change (`<baseDir>/<specRoot>/openspec/changes/<change>/` —
its behavioral spec; `specRoot` from `state.json`, `baseDir` from this change's `worktree` per "Branch/worktree
provisioning"; **absent for a `spec: "none"` change** — there is none to read), and the change's prior
`.workflow/` files. If this stage's own file already exists, also read the *next* stages' files to learn why it
was sent back, then fix accordingly.
