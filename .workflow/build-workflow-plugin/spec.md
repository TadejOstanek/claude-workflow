# Spec: the `workflow` plugin (dogfooded validation contract)

This repo builds its own workflow plugin by following the workflow. This is the **Specification** stage output and
the complete acceptance contract — every requirement from the original brief, captured. `[x]` = satisfied by the
authored files (static); `[ ]` = needs the end-to-end runtime dry-run or is a confirmed deviation. Design/arch live
at `~/.claude/plans/we-are-creating-a-federated-clover.md`.

## Goals / Why

- [x] One reusable workflow the user enters to start all non-trivial work (features, refactors, bugs)
- [x] Reduce high cognitive load — user need not track everything happening
- [x] Reduce excessive context usage and spend via efficient context management
- [x] Stop forgotten workflow steps (fixed pipeline)
- [x] Give visibility into prior steps; make interrupted work easy to organize and resume
- [x] Reduce manual oversight/attention on trivial tasks that don't need the human
- [x] Produce consistent, high-quality, maintainable outcomes
- [x] Delivered as Claude config + scripts; produced in the current working directory
- [x] This build itself follows the workflow's own process (spec → arch → code design → …)

## Acceptance criteria

### Specification stage — `commands/spec.md` + `skills/specification`

- [x] At the end the agent understands what the user is building and why
- [x] Understands the business context around the change
- [x] Asks clarifying questions until goal and context are fully understood
- [x] Does NOT read code/implementation details
- [x] Reads the relevant repo documentation for context
- [x] Prompts the user for pointers to other repos/sources when info may live outside its context
- [x] Stage ends with a specification `.md` file
- [x] Challenges the user's assumptions to reach genuine shared understanding
- [x] Document sections: goals/why · acceptance criteria · non-obvious constraints · non-goals
- [x] AC describe situation (given) / actions (when) / outcome (then) where possible
- [x] Complex specs split into sub-sections, each repeating the 4 headers (feature parts / non-functional specs)
- [x] Pushes the user toward specific, testable conditions over vague outcomes
- [x] **Captures and defines ALL specs — never drops/summarizes a requirement** (strengthened wording)
- [x] Non-goals: no code reading, no architecture/code-design planning, no implementation

### Architectural design — `commands/arch.md` + `skills/architectural-design`

- [x] Reads the spec doc as input
- [x] Reads code to understand how the change fits the existing codebase
- [x] Reads architecture/desired-practice docs in the codebase
- [x] Understands current business processes and the difference the change brings
- [x] Special attention to data modelling — store vs. calculate a field; new models vs. extend existing
- [x] Specifies where in the codebase the change happens and how it interacts with existing code
- [x] Respects current architecture/conventions; target conventions prioritized over other existing patterns
- [x] Challenges the user's assumptions about architecture and the change
- [x] Identifies independent/parallel/sequential feature phases
  - [x] A phase is independent if runnable in a fresh session needing only overall spec + arch + prior sequential outputs
  - [x] A feature phase differs from a work stage; each phase contains all stages (or all after this one)
  - [x] Each phase usually results in its own PR
- [x] Identifies tidy-first opportunities (Kent Beck) → initial sequential phase before feature phases
- [x] Surfaces large & small fit decisions; prompts user but also proposes a recommendation + why
- [x] Identifies tidy-after opportunities → final phase after feature phases
- [x] Pressure-tests the design against the real code when complexity warrants, to minimize future gotchas
- [x] Output specifies: how the change fits; all parts to modify (flows, views/controllers, templates, …);
      difficult decisions + why; docs to write; architectural patterns to follow; all data-model modifications
      (any stored state — memory/browser/DB/anywhere)
- [x] Docs-to-write: business-process/feature specs (core only, minimal, simpler than the input spec) and ADRs
- [x] Always asks the user whether something warrants documentation — never decides alone
- [x] Asks the user where docs should live when not obvious from the repo
- [x] Flags docs only — does not create them in this stage
- [x] Non-goals: no code design (names/classes/organization), no detail of how code is modified

### Code design — `commands/design.md` + `skills/code-design`

- [x] Reads both spec and architecture docs as input
- [x] If part of a dedicated phase, also reads the parent spec + architecture docs
- [x] Follows existing repo conventions; desired/target conventions prioritized over deprecated ones
- [x] Easy to maintain and evolve — good code is easy to change
- [x] Follows framework defaults (Django/Flask/Rails); no working around the framework unless conventions say so
- [x] Deep modules — large interface for small functionality is a big code smell
- [x] Plans tests for all public function/method behavior, not private internals — unless an internal is complex
      enough to warrant it, in which case prompt the user whether dedicated tests are worth it
- [x] Prepares implementation: prompts for the story number; creates a branch per naming conventions; prompts
      whether to work in a worktree
- [x] Output exactly specifies interfaces (methods/classes/interfaces/parameters) + core components + what each does
- [x] Output contains all tests: the functions tested + all required behaviors
- [x] Interactive — the user approves the plan before the next stage
- [x] Test spec focuses on testable behaviors, not internal implementation or simple coverage (behavior coverage)
- [x] Does not cover trivial tests
- [x] Output contains discovered repo conventions/coding patterns so downstream agents don't re-spend tokens
- [x] If the chosen architecture proves impossible during code design, flags it and prompts return to architecture

### Code implementation — `agents/implementer.md`

- [x] Reads the code design doc (main) + architecture + spec (context)
- [x] Not interactive; runs in a subagent
- [x] Runs sonnet even if the caller model is higher
- [x] Implements the code specified in the code design doc
- [x] On insurmountable issues fails and reports; otherwise succeeds but reports what was sub-optimal for the user
- [x] Looks at lint config so the code won't massively fail lint
- [x] Not allowed to touch test code (hard rule in the agent; guard hooks removed per user — trusted to comply)
- [x] Output doc states discoveries/deviations from the code design (not a description of what was implemented)

### Test implementation — `agents/test-author.md`

- [x] Reads the code design doc (main) + architecture + spec (context)
- [x] Implements tests as specified in the code design doc
- [x] On insurmountable issues fails and reports; otherwise succeeds but reports sub-optimal items
- [x] Looks at lint + test config so the tests won't massively fail
- [x] Not interactive; runs in a subagent; runs sonnet even if the caller is higher
- [x] Follows codebase test conventions (folder/file organization, test-data setup and where it lives)
- [x] Output doc states discoveries/deviations from the code design
- [x] Not allowed to touch non-test code except configuration files (hard rule in the agent)
- [x] Mocks only external dependencies; does not mock repo code; tests full code paths
- [x] No complex tests built on introspection of internals; tests publicly described behavior

### Test & lint running — `agents/test-runner.md`

- [x] Not interactive; runs in a subagent; runs haiku even if the caller is higher
- [x] Runs both lint and test
- [x] Runs tests/lint only for modules & files changed or affected
- [x] Looks at the code design file + git diff to identify what to run
- [x] Runs only relevant languages (python-only change in a python+js repo → only python)
- [x] Scans the repo to learn how to run tests: peel.yml → peel (prefer a peel skill if present); else docker
      compose via the Makefile
- [x] Tails output fully so reporting isn't truncated
- [x] Reports pass/fail per tool; on fail, full tool output for that failure
- [x] Overall stage pass/fail; passes only if all tools pass
- [x] May make very simple lint fixes (import ordering, unused imports)
- [x] May NOT fix failing tests — hands back to the implementation agents

### Code review — `agents/reviewer.md`

- [x] Not interactive; runs in a subagent
- [x] Reads all documents from previous stages for full context
- [x] Most important: no regressions or new bugs
- [x] Second: implementation satisfies all specifications
- [x] Failing either fails the stage
- [x] Critical/serious issues → automatic return to implementation (failure)
- [x] Other issues → may report success with a summary
- [x] Non-obvious / multi-approach resolution → return to code design or architecture and prompt the user (escalate)
- [x] On pass, commits the code (scoped commit — never `.workflow/` or unrelated edits)
- [x] Output is pass/fail and reports all identified issues in both cases
- [x] Never changes code itself — always back to implementation (trivial → wait)

### Documentation — `agents/documenter.md`

- [x] Not interactive; runs in a subagent; uses sonnet even if the main session is smarter
- [x] Reads all previous outputs; what to write is defined by the architecture doc; the spec feeds any spec doc
- [x] Produces the requested documentation
- [x] Updates existing docs the change made stale
- [x] Concise and to the point; uses doc templates if available
- [x] Output doc is the list of documents produced
- [x] Never includes code examples or detailed flow
- [x] Under-documents rather than over-documents; references the code
- [x] Most important part is the why; the how is not documented

### Manual QA — `agents/qa-author.md`

- [x] Not interactive; runs in a subagent; uses sonnet even if the main session is smarter
- [x] Reads all previous outputs for context
- [x] Understands the application structure to figure out how to manually test
- [x] Manual testing = running the app and testing the UI or sending HTTP requests
- [x] Running unit tests is NOT manual QA (already done earlier)
- [x] Critical: if nothing needs manual testing, says so — does not invent
- [x] Output specifies what to manually test and the steps for each test
- [x] Omits obvious steps every dev knows (running the app, navigating); only change-specific instructions
- [x] Gives helpful links such as URLs to navigate to
- [x] Specifies exactly how to set up non-standard data not covered by existing seeding
- [x] Does not run QA itself — produces instructions only

### Pull request — `agents/pr-author.md`

- [x] Not interactive; runs in a subagent; uses sonnet even if the main session is smarter
- [x] Reads all previous outputs for context
- [x] Uses repo PR skills/conventions to produce the description and open the PR
- [x] When modifying a PR description, fetches the current one first — never relies on memory
- [x] Uses the repo's `pull_request_template.md`
- [x] QA section uses the QA stage output verbatim — generates nothing extra
- [x] Most important part is the why
- [x] The why also covers why the specific design was chosen and the core decisions made
- [x] Changes section describes major changes and their meaning
- [x] Changes section never references file paths — plain simple English
- [x] PR opened in DRAFT
- [x] Output is the draft-PR link, surfaced by `/workflow:build` from the loop result — **no `pr.md` file** (user change)

### Orchestration — `workflows/autonomous-loop.js` + `commands/build.md`

- [x] Makes use of Claude agent workflows
- [x] Interactive steps are all steps up to and including code design
- [x] All steps after code design are non-interactive; return to the main session only on an unresolvable failure
- [x] Non-interactive flow is a loop: a failing stage returns to the previous stage that corrects it
- [x] All stages communicate only via output files; no shared context
- [x] During interactive stages the user is at least prompted to compact/clear between phases
- [ ] A hook forces compaction after each interactive phase *(D1 — not possible; replaced by lossless `/clear`)*
- [x] Multi-phase: spec+arch = epic; code design and later = stories; tidy-first/after = dedicated phases
- [x] Each phase gets a subfolder and runs its own full workflow
- [x] Phase spec/arch may be simple and inherit the parent, but the user is still prompted for extra detail —
      those stages are not skipped
- [x] All sub-phase stages read the parent specification + architecture files
- [x] Restartable after a lost session; tracks location within the phase so the user can pick up; the stage reads
      the necessary files; supports running multiple workflows at once
- [x] Workflow state, all transitions, and transition reasons tracked in a dedicated file
- [x] On stage start: read prior outputs + parent-phase docs; if this stage's doc already exists, also read the
      next stages' outputs to learn why it failed and contextualize the rework
- [x] Each stage output has a dedicated GATE section indicating pass (except PR — its result is the loop's PR link)
- [x] Manual QA and documentation stages run in parallel
- [x] Implementation always runs two parallel agents (code + tests); never modified by the same agent
- [x] Non-interactive orchestration verifies each stage's output (doc + code) against requirements — doesn't trust
      self-reported success; on mismatch marks failed and returns with instructions
- [x] Non-interactive orchestration runs in the workflow, not the main session; the main session reactivates only
      when the autonomous loop hits a problem requiring user input
- [x] Output files extensively use task lists (checkboxes)
- [x] Non-goal: the orchestrator never writes code — changes go to subagents (or tiny edits by the user)

### File structure — `skills/workflow-conventions`

- [x] All workflow files in a `.workflow` folder in the repo
- [x] Each workflow/feature gets a dedicated, meaningfully-named subfolder
- [x] Each sub-phase gets a subfolder within the main workflow folder
- [x] Each stage outputs its own file (exception: the PR stage writes no file — its output is the build-step link)
- [x] Stage filenames are consistent and do not contain the workflow name
- [x] State tracking + transitions stored in a dedicated file
- [x] Stage outputs are for agents and may be optimized for Claude
- [x] A single human-readable file with one section per phase (`OVERVIEW.md`)
- [x] Output files extensively use task lists

### Claude mechanics

- [x] Non-interactive stages use agents so models can be specified *(D2: real agent files; tool-restricted, guard hooks removed)*
- [x] Interactive stages use commands

## Non-obvious constraints

- [x] Produced `.md` files are not verbose — but terse means tight wording, never fewer specs (add more over cutting)
- [x] No Workflow-script filesystem access → the build command does `.workflow` I/O and passes state via `args`
- [x] No hook can force `/compact` → resolved by lossless `/clear` + a SessionStart banner *(D1)*
- [x] `agentType` namespacing risk mitigated — every loop call sets `model:` inline too, so per-stage models hold
      even if `workflow:<name>` resolution degrades; [ ] still confirm resolution (for tool guards) at runtime
- [x] Background git/test/PR commands run in `workdir` (worktree or repo root), threaded through args;
      [ ] confirm on the first worktree run

## Deviations (confirmed with user)

- **D1** "force compaction via hook" → **lossless `/clear`** (no hook can trigger `/compact`).
- **D2** "use agents to specify models" → **real `agents/*.md` files** with restricted tools; guard hooks removed
  (the agents are trusted to follow their hard rules).

## Non-goals

- [x] Orchestrator never writes code

## GATE

- status: pass (static authoring complete; all original criteria captured)
- summary: Every acceptance criterion from the brief is recorded here and implemented in the authored files. Open
  items need a runtime dry-run only: full loop behavior, `agentType` namespace resolution, worktree cwd.
- next: install the plugin and run a toy feature end-to-end
