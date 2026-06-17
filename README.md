# workflow

A reusable, resumable, multi-agent software-development workflow for Claude Code. You enter it to start any
non-trivial feature, refactor, or bug fix; it walks the work through fixed stages with minimal, well-placed human
input, hands off between stages via files, and resumes cleanly after interruptions.

## The pipeline

| Stage | Mode | Who | Output |
|------|------|-----|--------|
| Specification | interactive | `/workflow:spec` | `spec.md` (why/what) |
| Architectural design | interactive | `/workflow:arch` | `architecture.md` (fit, data model, phases) |
| Phase spec | interactive | `/workflow:phase-spec` | OpenSpec change: `proposal.md` + capability spec deltas |
| Code design | interactive | `/workflow:design` | `code-design.md` (interfaces + test behaviors) |
| Implement ‖ Test | auto (sonnet) | `implementer` ‖ `test-author` | code, tests |
| Test & lint | auto (haiku) | `test-runner` | `test-lint.md` |
| Review | auto (opus) | `reviewer` | `review.md` (+ commit) |
| Documentation ‖ QA | auto (sonnet) | `documenter` ‖ `qa-author` | `documentation.md`, `qa.md` |
| Pull request | auto (sonnet) | `pr-author` | draft PR (link reported by `/workflow:build`) |
| Archive | manual, post-merge | `/workflow:archive` | canonical `openspec/specs/` updated (`openspec archive`) |

The three interactive stages run in your main session. Everything from implementation on runs as a background
**Workflow** (launched by `/workflow:build`): isolated subagents, per-stage models, file-based handoff, failure
loops, and escalation back to you only when a decision is genuinely needed.

## Spec layer: OpenSpec (thin seam)

The behavioral spec lives in **[OpenSpec](https://github.com/Fission-AI/OpenSpec)** as one *change per phase*
(`proposal.md` + capability requirement deltas); each merged change accumulates into a canonical `openspec/specs/`
library — portable, tool-agnostic, living documentation. OpenSpec sits *under* this workflow as a passive store:
the engine authors the change (`/workflow:phase-spec`), the loop reads it for context, and `/workflow:archive`
merges it into the canonical specs after the PR lands. The engine (per-stage models, parallel agents, review, QA,
PR) is unchanged.

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
/workflow:start <what you want to build>   # scaffolds .workflow/<feature>/
/workflow:spec                              # epic why/what → spec.md; then /clear
/workflow:arch                              # phase breakdown → architecture.md; then /clear
/workflow:phase-spec                        # per phase: behavioral spec → OpenSpec change; then /clear
/workflow:design                            # per phase: interfaces + tests → code-design.md; then /clear
/workflow:build                             # per phase: autonomous loop → draft PR
/workflow:archive                           # per phase: AFTER its PR merges → canonical openspec/specs/
```

`/clear` between stages is lossless — each command re-reads the `.workflow/` files. Run `/workflow:start` with no
argument any time to see status and the next command (also printed as a banner on session start).

## Layout (created in the target repo)

```
.workflow/<feature>/                  # planning + execution state (this engine)
  state.json  OVERVIEW.md  spec.md  architecture.md
  <NN>-<phase>/  code-design.md  implementation.md  tests.md  test-lint.md
                 review.md  documentation.md  qa.md

openspec/                             # the spec layer (thin seam)
  changes/<change-id>/  proposal.md  specs/<capability>/spec.md   # one change per phase = one PR
  specs/<capability>/spec.md          # canonical living library (accumulates as PRs merge + archive)
```
(The PR stage writes no file — its draft-PR link is reported by `/workflow:build`. The canonical `openspec/specs/`
is updated by `/workflow:archive` after a phase's PR merges.)

`state.json` is the source of truth for resume; `OVERVIEW.md` is the human-readable mirror. See the
`workflow-conventions` skill for the full contract.

## Notes

- Plugin commands/skills are namespaced under the plugin name (`/workflow:spec`, skill `workflow:specification`);
  agents are `workflow:reviewer` etc. If your Claude Code version surfaces them un-namespaced, adjust accordingly.
- The autonomous loop is launched by absolute path (`${CLAUDE_PLUGIN_ROOT}/workflows/autonomous-loop.js`); plugin
  `workflows/` are not auto-discovered by name.
- This repo dogfoods its own process — see `.workflow/build-workflow-plugin/spec.md` for the acceptance contract.
