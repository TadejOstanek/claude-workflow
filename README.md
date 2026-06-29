# workflow

A reusable, resumable, multi-agent software-development workflow for Claude Code. You enter it to start any
non-trivial feature, refactor, or bug fix; it walks the work through fixed stages with minimal, well-placed human
input, hands off between stages via files, and resumes cleanly after interruptions.

The unit of work is a **change** = one PR. A small piece of work is a single change; bigger work is an **epic**
that `/workflow:arch` breaks into several changes. A behavioral change carries an OpenSpec spec; a **purely
technical change** (refactor, code org, infra/CI, deps) can opt out of OpenSpec — see "Spec-less changes" below.

## The pipeline (per change)

| Stage | Mode | Who | Output |
|------|------|-----|--------|
| Propose | interactive *(spec-bearing only)* | `/workflow:propose` | OpenSpec change `proposal.md` (why/what + capabilities) |
| Specify | interactive *(spec-bearing only)* | `/workflow:specify` | OpenSpec `specs/<cap>/spec.md` (requirement/scenario deltas) |
| Code design | interactive | `/workflow:design` | `code-design.md` (interfaces + test behaviors) |
| Implement ‖ Test | auto (sonnet) | `implementer` ‖ `test-author` | code, tests |
| Test & lint | auto (haiku) | `test-runner` | `test-lint.md` |
| Review | auto (opus) | `reviewer` | `review.md` (+ commit) |
| Documentation ‖ QA | auto (sonnet) | `documenter` ‖ `qa-author` | `documentation.md`, `qa.md` |
| Pull request | auto (sonnet) | `pr-author` | draft PR (link reported by `/workflow:build`) |
| Archive | **manual** *(spec-bearing only)* | `/workflow:archive` | canonical `openspec/specs/` updated (`openspec archive`) |

Implement → PR runs as one background **Workflow** (launched by `/workflow:build`): isolated subagents, per-stage
models, file-based handoff, failure loops, and escalation back to you only when a decision is genuinely needed.
**Archive is a deliberate manual step you run when the change is truly done** — never automated.

For an **epic** (multi-change), one extra interactive stage runs first:

| Architectural design | interactive | `/workflow:arch` | `architecture.md` (epic intent + the change breakdown) |

The epic has no spec of its own — its intent lives in `architecture.md`; each change it spawns is specced via
propose + specify.

## Spec layer: OpenSpec (thin seam)

The behavioral spec lives in **[OpenSpec](https://github.com/Fission-AI/OpenSpec)** as one *change per PR*
(`proposal.md` + capability requirement deltas); each change you archive accumulates into a canonical
`openspec/specs/` library — portable, tool-agnostic, living documentation. OpenSpec sits *under* this workflow as
a passive store: you author the change (`propose` + `specify`), the loop reads it, and **you** merge it into the
canonical specs with `/workflow:archive` when you're sure it's done. The engine (per-stage models, parallel
agents, review, QA, PR) is unchanged. We use OpenSpec's `proposal` + `specs` only — not its `design`/`tasks`; this
workflow's own architecture + code design + loop replace those.

### Spec-less changes (opt out of OpenSpec)

Not every change has behavior to spec. A purely technical change — refactor, code organization, build/CI/infra,
dependency bumps, performance-neutral cleanup — can skip OpenSpec entirely. When a change is first scoped
(`/workflow:start` for a single change, `/workflow:arch` per change for an epic), the workflow **recommends**
spec vs no-spec based on whether the change alters observable application behavior, and **you confirm** (it's your
call per change). A spec-less change (`spec:"none"`) skips `propose` + `specify`, goes straight to
`/workflow:design`, and runs the full autonomous loop — its `code-design.md` (a short *Why/Context* + the *Tests*
list) becomes the sole behavioral contract, and there is nothing to archive. The default is still to write a spec;
when in doubt, keep it.

**Prerequisite** — install the CLI and initialize once per repo:

```bash
npm install -g @fission-ai/openspec@latest   # Node ≥ 20.19
openspec init --tools claude                 # in the target repo — creates openspec/
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

# single change (spec-bearing):
/workflow:propose                           # why/what + capabilities → OpenSpec change; /clear optional
/workflow:specify                           # requirement/scenario deltas → OpenSpec change; then /clear
/workflow:design                            # interfaces + tests → code-design.md; then /clear
# single change (spec-less / refactor): /workflow:start triages → skip propose+specify, go straight to design:
# /workflow:design  →  /workflow:build      # code-design.md is the whole contract; nothing to archive
/workflow:build                             # full autonomous loop → draft PR (blank/full = resume: skip done stages)
/workflow:build light                       #   …or light: just implement + tests (skip test-run/review/QA/PR)
/workflow:build only build commit           #   …iterate: re-implement + push to the existing PR, no review/QA/body
/workflow:build skip review                 #   …or full minus named stages (only/skip/light = redo, ignores done)
/workflow:archive                           # WHEN you're sure it's done → canonical openspec/specs/

# epic (multi-change): run /workflow:arch right after start to break it into changes,
# then propose → specify → design → build → archive per change.
```

`/clear` between stages is lossless — each command re-reads `.workflow/` + the OpenSpec change. Run
`/workflow:start` with no argument any time to see status and the next command.

`/workflow:build` runs implement‖test together (when `build` is selected); `test-lint`, `review`, `docs`, `qa`,
and `pr` are optional. **Resume** (`full`/blank) runs everything not yet `done`; **redo** (`light`/`only`/`skip`)
re-runs exactly what you name even if it's already done — that's the knob for non-waterfall iteration. Skip
`review` and the change is left uncommitted (or `pr` commits it, rewriting the PR body); the redo-only **`commit`**
token commits + pushes without touching the PR body.

### Iterating (going back a step)

This is not a waterfall — you'll loop back. Typical flow after manual QA finds a gap (single change shown — no
change name needed; in an epic, name the change on each command):

```
/workflow:specify                           # add the missing requirement to the spec (re-validates)
/workflow:design                            # refine code-design; reuses the existing branch/worktree
/workflow:build only build commit           # re-implement + push to the existing draft PR — no review/QA/body rewrite
```

Re-opening an upstream stage never auto-invalidates the downstream ones — they stay `done` (their outputs now
describe older code); the command warns you and you choose what to redo. Add `review`/`qa` to the `only` list the
rounds you *do* want them. Just don't `/workflow:archive` until you're truly done — that merge is irreversible.

## Layout (created in the target repo)

```
.workflow/<feature>/                  # planning + execution state (this engine)
  state.json  architecture.md   # architecture.md is epic-mode only
  <NN>-<change>/  code-design.md  implementation.md  tests.md  test-lint.md
                  review.md  documentation.md  qa.md

<specRoot>/openspec/                  # the spec layer (thin seam); <specRoot> defaults to the repo root
  changes/<change-id>/  proposal.md  specs/<capability>/spec.md   # one change per PR
  specs/<capability>/spec.md          # canonical living library (you grow it via /workflow:archive)
```
(The PR stage writes no file — its draft-PR link is reported by `/workflow:build`. The canonical
`<specRoot>/openspec/specs/` is updated only by the manual `/workflow:archive`.)

**Per-app / per-domain specs.** OpenSpec is flat (one level: `specs/<capability>/`), so to organize specs by app
or domain in a monorepo/modular monolith you give each one its own `openspec/` root (`goods/openspec/`,
`packages/api/openspec/`, …). Each change records a **`specRoot`** (default `"."` = repo root); `/workflow:propose`
discovers existing roots and lets you target one, and every `openspec` call for that change runs from there.
Cross-cutting changes use the repo root. The plugin never hardcodes app names — a repo opts in purely by creating
`openspec/` dirs. Developers not using this workflow get the same organization with plain `openspec` by running it
from the app folder (document the convention in each root's `AGENTS.md`).

`state.json` is the source of truth for resume; run `/workflow:start` with no argument for a human-readable status
(mode, current stage, next command). See the `workflow-conventions` skill for the full contract.

## Notes

- Plugin commands/skills are namespaced under the plugin name (`/workflow:propose`, skill `workflow:specification`);
  agents are `workflow:reviewer` etc. If your Claude Code version surfaces them un-namespaced, adjust accordingly.
- The autonomous loop is launched by absolute path (`${CLAUDE_PLUGIN_ROOT}/workflows/autonomous-loop.js`); plugin
  `workflows/` are not auto-discovered by name.
- This repo dogfoods its own process — see `.workflow/build-workflow-plugin/spec.md` for the original acceptance
  contract.
