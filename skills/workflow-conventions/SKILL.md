---
name: workflow-conventions
description: Shared handoff contract for the multi-agent dev workflow — GATE format, checkboxes-vs-prose, and the OpenSpec delta-format shorthand every stage and agent needs. Read by every workflow command and agent. Points to reference/ files (state.json schema, folder layout, git safety, OpenSpec integration, test-runner detection, iterating) for detail only the stages that need it should load.
---

# Workflow Conventions (shared handoff contract)

Every workflow stage reads prior stages' files and writes its own. Stages share **no conversation context** — the
files (and the OpenSpec change) are the only handoff. Keep produced `.md` terse in *wording*, but **never drop
content to be terse**: capture every requirement, criterion, and decision — losing one in a handoff silently breaks
every later stage.

## Checkboxes vs prose

Use checkboxes (`- [ ]`) only for: lists of **steps to perform** or **conditions that must be true** (QA steps,
planned test behaviors) — and OpenSpec spec scenarios use OpenSpec's own
format. Everything else — descriptions, decisions, discoveries, findings, rationale, the GATE block — is prose.

## OpenSpec spec-delta format

A change's behavioral spec is delta sections against a capability: `## ADDED/MODIFIED/REMOVED/RENAMED
Requirements`, each `### Requirement: <name>` (SHALL/MUST) with at least one `#### Scenario: <name>` (**exactly
four hashes** — three fails silently) in `- **WHEN** … / - **THEN** …` form.

## GATE section (end of every stage output file)

```
## GATE
- status: pass | fail
- summary: <one line>
- next: <next stage name | escalate>
```
On `fail`, also add `- return-to:` / `- reason:` / `- instructions:`. Non-interactive stages also return this gate
as structured output. Verification is layered: the **design-critic** agent adversarially pressure-tests
`code-design.md` before the user approves it (advisory — no gate of its own), the opus **review** stage re-derives
correctness from the actual `git diff`, the **test-runner** judges by real tool output, and `/workflow:build`
re-checks each stage's on-disk GATE after the loop.

## Further detail (read only when your stage needs it)

Everything above is needed by every command and agent. Everything else lives in `reference/` — read the specific
file for your stage instead of guessing; each is self-contained on its topic:

- `${CLAUDE_PLUGIN_ROOT}/skills/workflow-conventions/reference/state-and-layout.md` — the unit-of-work model, the
  spec-triage heuristic, `.workflow/`+`openspec/` folder layout, the full `state.json` schema, and Resume/Status.
  Read by every command that touches `state.json`: `start`, `propose`, `arch`, `design`, `build`, `archive`.
- `${CLAUDE_PLUGIN_ROOT}/skills/workflow-conventions/reference/git-safety.md` — the checkout-safety check and branch
  provisioning. Read by `design` (both) and `build` (checkout safety only).
- `${CLAUDE_PLUGIN_ROOT}/skills/workflow-conventions/reference/openspec-integration.md` — the OpenSpec thin-seam
  contract: `specRoot`, authoring, consumption, archive. Read by `propose` and `archive`.
- `${CLAUDE_PLUGIN_ROOT}/skills/workflow-conventions/reference/test-runner-detection.md` — how to detect a repo's
  test/lint command. Read by `build` and `review-pr`.
- `${CLAUDE_PLUGIN_ROOT}/skills/workflow-conventions/reference/iterating.md` — going back a step without a
  waterfall cascade (resume vs. redo). Read by `propose`, `design`, `build` when re-entering a stage.
