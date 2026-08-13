# Epic planning (architectural-design reference)

Read this when you're in epic planning mode — `mode:"epic"` and `epic.architecture` isn't `"done"` yet. This is the
epic intent + change breakdown stage; skip this file entirely for a single change.

## Change breakdown approach
Split the work into **changes** (each = one PR). A change is independent if it can run in a fresh session needing
only this architecture doc (which carries the epic intent + breakdown) and prior sequential changes' outputs. Each
change runs the full pipeline from its `/workflow:propose` and code-design on.
- **Tidy-first**: refactors that make the work easier → initial sequential change(s).
- **Feature** changes: the work itself, marked independent / parallel / sequential.
- **Tidy-after**: cleanup enabled once the feature lands → final change(s).

For each change, also triage whether it needs a behavioral spec (`spec: "openspec"` vs `"none"`) per the "Does a
change need a spec?" heuristic in `workflow:workflow-conventions` — tidy-first/tidy-after (and many fix) changes are
usually spec-less, feature changes usually spec-bearing. Recommend per change and confirm with the user.

## Epic planning procedure
1. Resolve the active workflow from `state.json` (expects `mode:"epic"`). The epic intent is the feature
   `title`/description — there is no epic spec file.
2. If `architecture.md` already exists (returning), read it and any later-stage files first to learn why, then refine.
3. Run the stage interactively per the skill — read the code (use `orchestration:investigate`), scrutinize the data
   model, challenge assumptions, recommend on each fit decision, pressure-test, and agree the **change breakdown**
   (tidy-first → feature → tidy-after; each change = one PR). Ask the user about docs-to-write and where they live.
4. Write `.workflow/<feature>/architecture.md` per the skill — including the epic intent (why/what), since there is
   no separate epic spec — ending with a `## GATE`.
5. Update `state.json`:
   - set `epic.architecture="done"`, append a `transitions` entry (with `sessionId`, per the state-and-layout
     reference), and set `currentStage` to the first change's next stage — `"propose"` if the lowest-`order` change
     is `spec:"openspec"`, `"design"` if it's `spec:"none"`;
   - populate `changes[]` from the agreed breakdown per the conventions schema (field defaults there) — each with
     the breakdown-specific `slug` (`<NN>-<name>`), `type`, `order`, `depends_on`, and a `spec` you triaged per the
     heuristic (recommend per change, **confirm with the user**). Set all stages `pending` **except**
     `architecture:"na"` (the epic-level data model is decided here; a complex change can opt back in by flipping it
     to `pending` and running `/workflow:arch <change>`), and for a `spec:"none"` change also `propose`/
     `archive` = `na`;
   - create each change folder `.workflow/<feature>/<NN>-<slug>/`.
6. Tell the user to `/clear`, then run the next stage for the first change: `/workflow:propose` for a
   `spec:"openspec"` change, or `/workflow:design` directly for a `spec:"none"` one.

## Output: `architecture.md` (epic)
On top of the shared output requirements (data-model modifications, how the work fits, hard decisions, patterns,
ADR path), an epic's `architecture.md` must also include the epic intent (why/what — there is no separate epic
spec) and the change breakdown (with type + order + dependencies + `spec` openspec/none per change).

## Next steps
Per change, run `/workflow:propose` → `/workflow:design` for a spec-bearing change, or `/workflow:design` directly
for a `spec:"none"` change. A complex change within an epic can still opt into its own per-change architecture step
(mark its `architecture` stage `pending` and run `/workflow:arch <change>`).
