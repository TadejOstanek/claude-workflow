# workflow

A reusable, resumable, multi-agent software-development workflow for Claude Code. You enter it to start any
non-trivial feature, refactor, or bug fix; it walks the work through fixed stages with minimal, well-placed human
input, hands off between stages via files, and resumes cleanly after interruptions.

The unit of work is a **change** = one PR. A small piece of work is a single change; bigger work is an **epic**
that `/workflow:arch` breaks into several changes. Every change, technical or behavioral, gets a native `spec.md`
(Why + checkbox Acceptance Criteria).

## The pipeline (per change)

| Stage | Mode | Who | Output |
|------|------|-----|--------|
| Propose | interactive | `/workflow:propose` | `spec.md` (Why + checkbox Acceptance Criteria) — one session, one phase: orient in the code, then talk it through; also seeds `references.md` |
| Architectural design | interactive *(data model & fit; default-on, skippable)* | `/workflow:arch` | `architecture.md` (data-model & structural-fit decisions; an ADR too, if warranted) |
| Code design | interactive (+ adversarial `design-critic` pass; default-on, skippable) | `/workflow:design` | `code-design.md` (interfaces + test behaviors; an ADR too, if warranted), `design-critique.md` |
| Implement ‖ Test | auto (sonnet\*) | `implementer` ‖ `test-author` | code, tests |
| Test & lint | auto (haiku\*) | `test-runner` | `test-lint.md` |
| Review | auto (opus\*) | `reviewer` | `review.md` (+ commit) |
| Pull request | auto (sonnet\*) | `pr-author` | draft PR incl. its own manual-QA section (link reported by `/workflow:build`) |

\* the `standard`-complexity default — see "Model tiers" below for how model+effort vary by change complexity.

Implement → PR runs as one background **Workflow** (launched by `/workflow:build`): isolated subagents, per-stage
models, file-based handoff, failure loops, and escalation back to you only when a decision is genuinely needed.
`/workflow:generate-openspec` is available any time after review commits — including after the PR is already
open — for teams/changes that want a durable, committed OpenSpec export; see below.

`/workflow:arch` above is the per-change **data-model & fit** pass (after propose, before code design; runs by
default — skip it when there's genuinely no data model). For an **epic** (multi-change) the same command *also*
runs once up front — before any change — to capture the epic's intent and break the work into changes:

| Architectural design (epic) | interactive | `/workflow:arch` | `architecture.md` (epic intent + the change breakdown; an ADR too, if warranted) |

The epic has no spec of its own — its intent lives in the epic `architecture.md`; each change it spawns is specced
via `/workflow:propose` (and gets its own per-change data-model pass only if it needs one).

## Model tiers (cost vs. rigor per change)

Every subagent role (`implementer`, `test-author`, `test-runner`, `reviewer`, `pr-author`, `design-critic`, plus
`review-pr`'s and `insights`' roles) runs on a model+effort pulled from `config/model-tiers.json`, keyed by the
change's `complexity: "light" | "standard" | "deep"`. `complexity` is recommended by the workflow and confirmed by
you when a change is first scoped (`/workflow:start` for a single change, `/workflow:arch` per change for an epic)
— `light` for a one-liner, `deep` for a gnarly migration, `standard` otherwise. `deep` also forces `design-critic`
(normally `model: inherit`, riding your interactive session) onto `opus` regardless of what model you're in. Edit
`config/model-tiers.json` directly to retune any role/tier — it's a single plugin-level file, not per-repo config.
`/workflow:review-pr` and `/workflow:insights` (standalone, no `state.json`) take an explicit `--complexity <tier>`
flag instead, defaulting to `standard`.

## OpenSpec (optional export)

`spec.md` — this workflow's own native spec, produced by `propose` — is the spec of record for the whole pipeline.
**[OpenSpec](https://github.com/Fission-AI/OpenSpec)** is a separate, optional, terminal export: run
`/workflow:generate-openspec` any time after `review` has committed the change — including after its PR is already
open — to author an OpenSpec change (`proposal.md` + capability requirement deltas, translated from `spec.md` and
the build docs, grounded in what was actually shipped) and merge it into a canonical `openspec/specs/` library —
portable, tool-agnostic, living documentation, for teams/changes that want it.

**Prerequisite**, only if/when you use it — install the CLI and initialize once per repo:

```bash
npm install -g @fission-ai/openspec@latest   # Node ≥ 20.19
openspec init --tools claude                 # in the target repo — creates openspec/ (generate-openspec also does this on demand)
```

## Install (local / private)

```bash
claude plugin marketplace add /Users/tadej.ostanek/dev/claude-workflow
claude plugin install workflow@claude-workflow
```

Or add to `~/.claude/settings.json`:

```json
{
  "extraKnownMarketplaces": {
    "claude-workflow": { "source": { "source": "url", "url": "file:///Users/tadej.ostanek/dev/claude-workflow/.claude-plugin" } }
  },
  "enabledPlugins": { "workflow@claude-workflow": true }
}
```

## Use

```
/workflow:start <what you want to build>   # scaffolds .workflow/<feature>/ ; picks single-change vs epic

# single change:
/workflow:propose                           # orient in the code, then talk it through → spec.md (one session); then /clear
/workflow:arch                              # data model & structural fit → architecture.md (default; skip if none); then /clear
/workflow:design                            # interfaces + tests → code-design.md; then /clear
/workflow:build                             # full autonomous loop → review → draft PR (blank/full = resume: skip done stages)
/workflow:build light                       #   …or light: just implement + tests (skip test-run/review/PR)
/workflow:build skip review                 #   …or full minus named stages (only/skip/light = manual control, ignores done)
/workflow:generate-openspec                 #   …optional, any time after review commits (even after the PR is open)

# epic (multi-change): run /workflow:arch right after start to break it into changes,
# then propose → design → build (review → PR) per change.
```

`/clear` between stages is lossless — each command re-reads `.workflow/`. Run `/workflow:start` with no argument
any time to see status and the next command.

`/workflow:build` runs implement‖test together (when `build` is selected); `test-lint`, `review`, and `pr` are
optional. **Resume** (`full`/blank) runs everything not yet `done`. `light`/`only`/`skip` are separate manual
controls — they re-run exactly what you name even if it's already done, for ad hoc things like forcing a lone
re-run of `test-lint`. Skip `review` and the change is left uncommitted (or `pr` commits it, rewriting the PR
body).

### Iterating (going back a step)

Once a stage is `done`, its own command won't repeat it — `/workflow:propose`, `/workflow:arch`, and
`/workflow:design` each stop if asked to redo an already-`done` stage. An earlier doc can still change after that,
but only in place, by whichever later stage is actively running — e.g. a `/workflow:design` conversation that
surfaces a data-model problem edits `architecture.md` directly, but only after telling you and getting your
confirmation. There's no separate redo command and nothing else gets invalidated.

Once `review` has cleanly committed the code, treat the change as landed — a one-way street; any further fix
belongs outside this workflow. `/workflow:generate-openspec`'s merge is irreversible for the same reason, so it
only ever runs against a change whose code is already committed.

## Reviewing a PR (standalone)

Separate from the change pipeline, `/workflow:review-pr <PR link or number>` reviews **any** GitHub PR — typically a
coworker's — with special attention to whether the code actually satisfies its spec, assembled from whatever's
available: any doc/markdown files the PR changed, its PR description, and text you paste in from the story when
asked. It also runs the full general review (correctness, conventions, concurrency/data-integrity).

```
/workflow:review-pr 1234                    # terminal report
/workflow:review-pr <pr-url> --comment      # …and post the findings back to the PR
```

It checks the PR out into a throwaway git **worktree** (never touching your branch or working tree), fans out
parallel finder agents by dimension, **adversarially verifies** each finding (dropping false positives), dedups, and
prints a severity-ranked report — then removes the worktree. It's **read-only**: the only thing it ever writes is the
optional `--comment`. If nothing spec-like turns up — no docs changed, an empty PR description, and you decline to
paste anything in — the spec dimension is skipped and the rest still runs. This command keeps **no** `.workflow/`
state — it's a one-shot review.

## Working on something small (standalone)

`/workflow:side-task <description>` is for a small change you want to make in parallel with bigger work already in
progress in your current worktree. It forks a fresh worktree off the latest `origin/main`, implements the change
there, skips lint/tests entirely, and opens a PR — never touching your current checkout. It removes the worktree
once the PR is open; on failure it leaves the worktree in place so the work isn't lost. Like `/workflow:review-pr`,
it keeps no `.workflow/` state.

```
/workflow:side-task add a retry to the webhook sender
```

Opening the PR itself is `/workflow:creating-pull-requests` — a generic, repo-agnostic draft-PR workflow that
`/workflow:side-task` falls back to when the target repo doesn't define its own project-level
`creating-pull-requests` skill. It can also be run directly from any branch with commits ready to go out.

```
/workflow:creating-pull-requests
/workflow:creating-pull-requests ready   # open non-draft
```

## Getting insights on a change (standalone)

`/workflow:insights [feature[/NN-change]] [--write-memory]` analyzes the Claude Code sessions behind one change —
or, given just a feature in epic mode, the whole epic — for workflow-process quality (review efficacy, design-doc
accuracy, gate friction/rework), cost/token stats scoped to exactly those sessions (via the separate
`session-report` plugin), and explicit learnings extraction into project memory. Blank picks the change matching
your current git branch.

```
/workflow:insights                          # the change on your current branch
/workflow:insights add-foo/01-data-model    # a specific change
/workflow:insights add-foo --write-memory   # whole epic, and actually persist drafted memories
```

It never touches `.workflow/state.json` — no stage, no GATE. Learnings only **drafts** proposed memories by
default; nothing is written outside the repo until you pass `--write-memory`. It writes `insights.md` and a scoped
`session-report-<date>.html` into the change's (or epic's) own `.workflow/` folder — informational artifacts, not
pipeline stages.

## Layout (created in the target repo)

```
.workflow/<feature>/                  # planning + execution state (this engine)
  state.json  architecture.md   # top-level architecture.md is epic-only (epic intent + change breakdown)
  <NN>-<change>/  references.md  spec.md  architecture.md  code-design.md  design-critique.md  implementation.md  tests.md  test-lint.md  review.md  openspec-export.md
                  # references.md = minimal append-only pointer list of relevant files/symbols, seeded by
                  #   propose, appended to by every later stage
                  # spec.md = this workflow's native spec of record — Why + checkbox Acceptance Criteria
                  # per-change architecture.md = data-model & fit (present when the arch stage ran)
                  # design-critique.md = adversarial design-critic findings (present when that pass ran)
                  # openspec-export.md = present only if /workflow:generate-openspec ran for this change (optional)

<specRoot>/openspec/                  # OPTIONAL — only exists once /workflow:generate-openspec has run
  changes/<change-id>/  proposal.md  specs/<capability>/spec.md   # one export per exported change
  specs/<capability>/spec.md          # canonical living library (generate-openspec grows it)
```
(The PR stage writes no file — its draft-PR link is reported by `/workflow:build`.)

**Per-app / per-domain specs (OpenSpec only).** To organize OpenSpec exports by app/domain in a monorepo, give
each its own `openspec/` root (`goods/openspec/`, `packages/api/openspec/`, …); each exported change records a
**`specRoot`** (default `"."` = repo root) that `/workflow:generate-openspec` discovers and targets. Cross-cutting
changes use the repo root. The plugin never hardcodes app names — a repo opts in purely by creating `openspec/`
dirs. See the `workflow-conventions` skill for the full mechanic.

`state.json` is the source of truth for resume; run `/workflow:start` with no argument for a human-readable status
(mode, current stage, next command). See the `workflow-conventions` skill for the full contract.

## Notes

- Plugin commands/skills are namespaced under the plugin name (`/workflow:propose`, skill `workflow:specification`);
  agents are `workflow:reviewer` etc. If your Claude Code version surfaces them un-namespaced, adjust accordingly.
- The autonomous loop is launched by absolute path (`${CLAUDE_PLUGIN_ROOT}/workflows/autonomous-loop.js`); plugin
  `workflows/` are not auto-discovered by name.
- This repo dogfoods its own process — see `.workflow/build-workflow-plugin/spec.md` for the original acceptance
  contract.
- All workflow agents can invoke `Skill` (target-repo skills, plus `orchestration:lookup`/`investigate`) and
  `codegraph_explore` if a `codegraph` MCP server is configured — both degrade to a no-op where unavailable.
