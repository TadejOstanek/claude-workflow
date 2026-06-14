# Spec: the `workflow` plugin (dogfooded validation contract)

This repo builds its own workflow plugin by following the workflow. This is the **Specification** stage output and
the acceptance contract. `[x]` = satisfied by the authored files (static); `[ ]` = needs the end-to-end runtime
dry-run (install the plugin, run a toy feature) or is a confirmed deviation. The plan's design/arch lives at
`~/.claude/plans/we-are-creating-a-federated-clover.md`.

## Goals / Why
- [x] One reusable workflow to start all non-trivial work
- [x] Reduce cognitive load, context/spend, forgotten steps; give resume visibility; cut trivial-task oversight; consistent outputs
- [x] Delivered as Claude config + scripts in this repo; this build follows the workflow's own stages

## Acceptance criteria

### Specification stage — `commands/spec.md` + `skills/specification`
- [x] Establishes why/what; clarifies with user; challenges assumptions; pushes given/when/then testable AC
- [x] Does not read code; may read repo docs; prompts for external pointers
- [x] Writes `spec.md` with the four headers; sub-sections when complex

### Architectural design — `commands/arch.md` + `skills/architectural-design`
- [x] Reads spec; reads code (via `orchestration:investigate`) + arch docs; scrutinizes data model; respects/prioritizes target conventions
- [x] Identifies phases (independent/parallel/sequential) + tidy-first/tidy-after; recommends on decisions; pressure-tests
- [x] Flags docs-to-write (ADRs + minimal business-process specs), asks user before/where; does not write docs here
- [x] Output names parts to modify, data-model changes, decisions+why, patterns, phase breakdown

### Code design — `commands/design.md` + `skills/code-design`
- [x] Reads spec+arch (+parent); deep modules; framework defaults; behavior-coverage tests of public surface; no trivial tests
- [x] Prompts ticket #, creates branch, asks worktree; outputs exact interfaces + components + test behaviors + discovered conventions
- [x] Interactive approval before the loop; flags back to arch if design infeasible

### Implementation ‖ Tests — `agents/implementer.md` ‖ `agents/test-author.md`
- [x] Both sonnet; read code-design (+arch+spec); non-interactive
- [x] Implementer: code only, **tool-guarded** off test files; checks lint config; reports deviations in `implementation.md`
- [x] Test-author: tests only (config allowed), **tool-guarded** off app code; mocks only external deps; full code paths; reports in `tests.md`
- [x] Run in parallel; never the same agent (loop `parallel()` + separate agent types)

### Test & lint — `agents/test-runner.md` (haiku)
- [x] Runs lint+test scoped to changed languages/modules; peel.yml→peel else docker/Makefile else native; tails output; judges by output not exit code
- [x] Per-tool pass/fail report in `test-lint.md`; overall gate; trivial lint fixes only; never fixes failing tests (returns to build)

### Review — `agents/reviewer.md` (opus)
- [x] Reads all prior docs; priority 1 no regressions, priority 2 spec satisfaction; severity discipline
- [x] Critical → return to build; design-level/multi-approach → escalate to user; commits on pass; never edits code; outputs pass/fail + findings

### Documentation — `agents/documenter.md` (sonnet)
- [x] Writes only arch-flagged docs; updates stale docs; why-only, no code/flow; under-documents; outputs list in `documentation.md`

### Manual QA — `agents/qa-author.md` (sonnet)
- [x] Change-specific steps only; says "none needed" when true; URLs/endpoints; non-standard data setup; instructions only; output `qa.md`

### Pull request — `agents/pr-author.md` (sonnet)
- [x] Uses repo PR template; why-first; changes in plain English (no paths); QA verbatim from `qa.md`; **DRAFT**; outputs PR link; refetches description before edits

### Orchestration — `workflows/autonomous-loop.js` + `commands/build.md`
- [x] Uses Claude Workflows; interactive ≤ code design; everything after is non-interactive, escalating only on the unresolvable
- [x] Failure loop returns to the owning stage (bounded); stages hand off only via files
- [x] Multi-phase: epic spec/arch + per-phase folders running the pipeline; phases inherit parent docs; user prompted for phase-specific detail
- [x] Restartable after lost session via `state.json` + on-disk GATE checks (idempotent skip in `build.md`); transitions recorded
- [x] Each output has a GATE; docs ‖ QA parallel; verify-don't-trust (reviewer = semantic; `build.md` re-checks GATEs on disk)
- [x] Non-interactive orchestration runs in the Workflow, not the main session; orchestrator never writes code
- [x] Output files use task lists
- [ ] **Runtime-verify**: a real end-to-end run confirms the loop, escalation, and resume behave as designed

### File structure — `skills/workflow-conventions`
- [x] `.workflow/` folder; per-feature + per-phase subfolders; per-stage files; consistent names without the feature name; dedicated state file
- [x] Agent-optimized stage outputs; single human `OVERVIEW.md` (one section per phase); task-list checkboxes

### Claude mechanics
- [x] Interactive stages = commands; non-interactive stages = model-specified agent files *(D2: chosen over inline)*

## Non-obvious constraints
- [x] No Workflow-script filesystem access → the `build` command does all `.workflow` I/O and passes state via `args`
- [x] No hook can force `/compact` → resolved by lossless `/clear` + SessionStart banner *(D1)*
- [x] `agentType` namespacing risk mitigated — every loop call sets `model:` inline too, so per-stage models hold even if `workflow:<name>` resolution degrades; [ ] still confirm resolution (for tool guards) at runtime
- [x] Background git/test/PR commands run in `workdir` (worktree or repo root), threaded through args; [ ] confirm on first worktree run
- [x] Produced `.md` files kept terse

## Deviations (confirmed with user)
- **D1** "force compaction via hook" → **lossless `/clear`** (no hook can trigger `/compact`).
- **D2** "use agents to specify models" → **real `agents/*.md` files** with restricted tools + guard hooks (tool-level enforcement).

## Non-goals
- [x] Orchestrator never writes code

## GATE
- status: pass (static authoring complete)
- summary: All stages/orchestration/file-structure authored and statically validated. Two items need a runtime dry-run: full end-to-end loop behavior and `agentType` namespace resolution.
- next: install the plugin and run a toy feature end-to-end
