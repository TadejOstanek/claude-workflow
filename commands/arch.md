---
description: Run the Architectural Design stage — scrutinize the data model and how the work fits the codebase before code design. For an epic, also break it into changes (PRs). Writes architecture.md.
argument-hint: [change slug] — single mode: blank uses the sole change; epic mode: ignored
---

# /workflow:arch

Apply the `workflow:architectural-design` skill. Read `workflow:workflow-conventions` for the file/GATE format.
Resolve the active workflow from `state.json`, then pick the shape by **what still needs deciding** — this stage
runs in two:

- **Epic planning** — for an `epic` whose `epic.architecture` isn't `"done"` yet: capture the epic intent and break
  the work into changes (**plus** the data-model + fit method). Runs once, first, before any change.
- **Per-change data-model & fit pass** — for a **single** change, or a **named epic change** whose
  `stages.architecture` is `"pending"`: scrutinize the data model + structural fit for that **one** change, after
  its why/what are defined (`/workflow:propose`, or the feature description for a `spec:"none"` change) and before
  `/workflow:design`. No change breakdown.

Dispatch: `mode:"epic"` **and** `epic.architecture != "done"` → **Epic planning**; otherwise (single mode, or an
epic whose planning is `done` and you named a change with `architecture:"pending"`) → **Per-change pass**.

## Per-change data-model & fit pass
Runs for a **single**-mode change, or a **named epic change** (`$ARGUMENTS`) whose `stages.architecture` is
`"pending"`. Argument: `$ARGUMENTS` (a change slug; blank in single mode = the sole change; **required** in an epic).
1. Resolve the change. For a `spec:"openspec"` change its `stages.propose` must be `"done"` — if not, stop and tell
   the user to run `/workflow:propose` first. Read its why/what: the OpenSpec change at
   `<specRoot>/openspec/changes/<change>/` (`proposal.md` + `specs/**`), or the feature description for a
   `spec:"none"` change. If `<NN>-<slug>/architecture.md` already exists (returning), read it and any later-stage
   files first to learn why, then refine.
2. **Skip check.** If the change plainly has **no data-model or structural dimension** (a pure content/copy tweak, a
   config flip), say so and offer to skip: set `stages.architecture="na"`, `currentStage="design"`, append a
   transition, and point the user at `/workflow:design`. Otherwise continue — the data-model conversation is the
   point of this stage.
3. Run the stage interactively per the skill (single shape) — scrutinize the data model, challenge assumptions,
   recommend on each fit decision, pressure-test. **No change breakdown.** "No data-model change" is a valid
   *explicit* outcome.
4. Write `.workflow/<feature>/<NN>-<slug>/architecture.md` per the skill (data-model modifications, how it fits,
   hard decisions, patterns the code design must follow; ADR path if one was written) ending with a `## GATE`.
5. Update `state.json`: set this change's `stages.architecture="done"`, `currentStage="design"`, append a transition.
6. Tell the user to `/clear`, then run `/workflow:design` for this change.

## Epic planning (`mode:"epic"`, `epic.architecture` not yet `"done"`)
This is the epic planning stage; the epic intent + the change breakdown live here, and each resulting change is
specced individually via `/workflow:propose`.
1. Resolve the active workflow from `state.json` (expects `mode:"epic"`). The epic intent is the feature
   `title`/description — there is no epic spec file.
2. If `architecture.md` already exists (returning), read it and any later-stage files first to learn why, then refine.
3. Run the stage interactively per the skill — read the code (use `orchestration:investigate`), scrutinize the data
   model, challenge assumptions, recommend on each fit decision, pressure-test, and agree the **change breakdown**
   (tidy-first → feature → tidy-after; each change = one PR). Ask the user about docs-to-write and where they live.
4. Write `.workflow/<feature>/architecture.md` per the skill — including the epic intent (why/what), since there is
   no separate epic spec — ending with a `## GATE`.
5. Update `state.json`:
   - set `epic.architecture="done"`, append a `transitions` entry, and set `currentStage` to the first change's
     next stage — `"propose"` if the lowest-`order` change is `spec:"openspec"`, `"design"` if it's `spec:"none"`;
   - populate `changes[]` from the agreed breakdown per the conventions schema (field defaults there) — each with
     the breakdown-specific `slug` (`<NN>-<name>`), `type`, `order`, `depends_on`, and a `spec` you triaged per the
     heuristic (recommend per change, **confirm with the user**). Set all stages `pending` **except**
     `architecture:"na"` (the epic-level data model is decided here; a complex change can opt back in by flipping it
     to `pending` and running `/workflow:arch <change>`), and for a `spec:"none"` change also `propose`/
     `archive` = `na`;
   - create each change folder `.workflow/<feature>/<NN>-<slug>/`.
6. Tell the user to `/clear`, then run the next stage for the first change: `/workflow:propose` for a
   `spec:"openspec"` change, or `/workflow:design` directly for a `spec:"none"` one.
