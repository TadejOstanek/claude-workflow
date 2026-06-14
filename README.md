# workflow

A reusable, resumable, multi-agent software-development workflow for Claude Code. You enter it to start any
non-trivial feature, refactor, or bug fix; it walks the work through fixed stages with minimal, well-placed human
input, hands off between stages via files, and resumes cleanly after interruptions.

## The pipeline

| Stage | Mode | Who | Output |
|------|------|-----|--------|
| Specification | interactive | `/workflow:spec` | `spec.md` (why/what) |
| Architectural design | interactive | `/workflow:arch` | `architecture.md` (fit, data model, phases) |
| Code design | interactive | `/workflow:design` | `code-design.md` (interfaces + test behaviors) |
| Implement ‖ Test | auto (sonnet) | `implementer` ‖ `test-author` | code, tests |
| Test & lint | auto (haiku) | `test-runner` | `test-lint.md` |
| Review | auto (opus) | `reviewer` | `review.md` (+ commit) |
| Documentation ‖ QA | auto (sonnet) | `documenter` ‖ `qa-author` | `documentation.md`, `qa.md` |
| Pull request | auto (sonnet) | `pr-author` | draft PR (link reported by `/workflow:build`) |

The three interactive stages run in your main session. Everything from implementation on runs as a background
**Workflow** (launched by `/workflow:build`): isolated subagents, per-stage models, file-based handoff, failure
loops, and escalation back to you only when a decision is genuinely needed.

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
/workflow:spec                              # then /clear
/workflow:arch                              # then /clear
/workflow:design                            # per phase, then /clear
/workflow:build                             # autonomous loop for the phase
```

`/clear` between stages is lossless — each command re-reads the `.workflow/` files. Run `/workflow:start` with no
argument any time to see status and the next command (also printed as a banner on session start).

## Layout (created in the target repo)

```
.workflow/<feature>/
  state.json  OVERVIEW.md  spec.md  architecture.md
  <NN>-<phase>/  code-design.md  implementation.md  tests.md  test-lint.md
                 review.md  documentation.md  qa.md
```
(The PR stage writes no file — its draft-PR link is reported by `/workflow:build`.)

`state.json` is the source of truth for resume; `OVERVIEW.md` is the human-readable mirror. See the
`workflow-conventions` skill for the full contract.

## Notes

- Plugin commands/skills are namespaced under the plugin name (`/workflow:spec`, skill `workflow:specification`);
  agents are `workflow:reviewer` etc. If your Claude Code version surfaces them un-namespaced, adjust accordingly.
- The autonomous loop is launched by absolute path (`${CLAUDE_PLUGIN_ROOT}/workflows/autonomous-loop.js`); plugin
  `workflows/` are not auto-discovered by name.
- This repo dogfoods its own process — see `.workflow/build-workflow-plugin/spec.md` for the acceptance contract.
