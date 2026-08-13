---
description: Run the Architectural Design stage — scrutinize the data model and how the work fits the codebase before code design. For an epic, also break it into changes (PRs). Writes architecture.md.
argument-hint: [change slug] — single mode: blank uses the sole change; epic mode: ignored
---

# /workflow:arch

Apply the `workflow:architectural-design` skill. Read `workflow:workflow-conventions` for the GATE format, plus
`${CLAUDE_PLUGIN_ROOT}/skills/workflow-conventions/reference/state-and-layout.md` for the file layout + `state.json`
schema.

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
   transition (with `sessionId`, per the state-and-layout reference above), and point the user at
   `/workflow:design`.
   Otherwise continue — the data-model conversation is the point of this stage.
3. Run the stage interactively per the skill (single shape) — scrutinize the data model, challenge assumptions,
   recommend on each fit decision, pressure-test. **No change breakdown.** "No data-model change" is a valid
   *explicit* outcome.
4. Write `.workflow/<feature>/<NN>-<slug>/architecture.md` per the skill (data-model modifications, how it fits,
   hard decisions, patterns the code design must follow; ADR path if one was written) ending with a `## GATE`.
5. Update `state.json`: set this change's `stages.architecture="done"`, `currentStage="design"`, append a
   transition (with `sessionId`, per the state-and-layout reference above).
6. Tell the user to `/clear`, then run `/workflow:design` for this change.

## Epic planning (`mode:"epic"`, `epic.architecture` not yet `"done"`)
This is the epic planning stage; the epic intent + the change breakdown live here, and each resulting change is
specced individually via `/workflow:propose`. Read
`${CLAUDE_PLUGIN_ROOT}/skills/architectural-design/reference/epic-planning.md` for the change-breakdown approach
and the full step-by-step procedure (resolve workflow → run stage → write `architecture.md` → update `state.json`
→ hand off to the first change).
