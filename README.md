# workflow

A reusable, resumable, multi-agent software-development workflow for Claude Code. You enter it to start any
non-trivial feature, refactor, or bug fix; it walks the work through fixed stages with minimal, well-placed human
input, hands off between stages via files, and resumes cleanly after interruptions.

The unit of work is a **change** = one OpenSpec change = one PR. A small piece of work is a single change; bigger
work is an **epic** that `/workflow:arch` breaks into several changes.

## The pipeline (per change)

| Stage | Mode | Who | Output |
|------|------|-----|--------|
| Propose | interactive | `/workflow:propose` | OpenSpec change `proposal.md` (why/what + capabilities) |
| Specify | interactive | `/workflow:specify` | OpenSpec `specs/<cap>/spec.md` (requirement/scenario deltas) |
| Code design | interactive | `/workflow:design` | `code-design.md` (interfaces + test behaviors) |
| Implement ‖ Test | auto (sonnet) | `implementer` ‖ `test-author` | code, tests |
| Test & lint | auto (haiku) | `test-runner` | `test-lint.md` |
| Review | auto (opus) | `reviewer` | `review.md` (+ commit) |
| Documentation ‖ QA | auto (sonnet) | `documenter` ‖ `qa-author` | `documentation.md`, `qa.md` |
| Pull request | auto (sonnet) | `pr-author` | draft PR (link reported by `/workflow:build`) |
| Archive | **manual** | `/workflow:archive` | canonical `openspec/specs/` updated (`openspec archive`) |

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

# single change:
/workflow:propose                           # why/what + capabilities → OpenSpec change; /clear optional
/workflow:specify                           # requirement/scenario deltas → OpenSpec change; then /clear
/workflow:design                            # interfaces + tests → code-design.md; then /clear
/workflow:build                             # autonomous loop → draft PR
/workflow:archive                           # WHEN you're sure it's done → canonical openspec/specs/

# epic (multi-change): run /workflow:arch right after start to break it into changes,
# then propose → specify → design → build → archive per change.
```

`/clear` between stages is lossless — each command re-reads `.workflow/` + the OpenSpec change. Run
`/workflow:start` with no argument any time to see status and the next command.

## Layout (created in the target repo)

```
.workflow/<feature>/                  # planning + execution state (this engine)
  state.json  OVERVIEW.md  architecture.md   # architecture.md is epic-mode only
  <NN>-<change>/  code-design.md  implementation.md  tests.md  test-lint.md
                  review.md  documentation.md  qa.md

openspec/                             # the spec layer (thin seam)
  changes/<change-id>/  proposal.md  specs/<capability>/spec.md   # one change per PR
  specs/<capability>/spec.md          # canonical living library (you grow it via /workflow:archive)
```
(The PR stage writes no file — its draft-PR link is reported by `/workflow:build`. The canonical `openspec/specs/`
is updated only by the manual `/workflow:archive`.)

`state.json` is the source of truth for resume; `OVERVIEW.md` is the human-readable mirror. See the
`workflow-conventions` skill for the full contract.

## Notes

- Plugin commands/skills are namespaced under the plugin name (`/workflow:propose`, skill `workflow:specification`);
  agents are `workflow:reviewer` etc. If your Claude Code version surfaces them un-namespaced, adjust accordingly.
- The autonomous loop is launched by absolute path (`${CLAUDE_PLUGIN_ROOT}/workflows/autonomous-loop.js`); plugin
  `workflows/` are not auto-discovered by name.
- This repo dogfoods its own process — see `.workflow/build-workflow-plugin/spec.md` for the original acceptance
  contract.
