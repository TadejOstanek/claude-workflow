---
description: Run the Architectural Design stage for an epic — how the work fits the codebase, the data model, and how it breaks into changes (PRs). Writes architecture.md. Epic mode only.
---

# /workflow:arch

Apply the `workflow:architectural-design` skill. Read `workflow:workflow-conventions` for the file/GATE format.
This is the **epic** planning stage — the epic has no spec of its own; its intent + the change breakdown live here,
and each resulting change is specced individually via `/workflow:propose` + `/workflow:specify`. (Single-change
workflows skip this and go straight to `/workflow:propose`.)

1. Resolve the active workflow from `state.json` (expects `mode:"epic"`). Read `state.json`; the epic intent is the
   feature `title`/description — there is no epic spec file.
2. If `architecture.md` already exists (returning), read it and any later-stage files first to learn why, then refine.
3. Run the stage interactively per the skill — read the code (use `orchestration:investigate`), scrutinize the data
   model, challenge assumptions, recommend on each fit decision, pressure-test, and agree the **change breakdown**
   (tidy-first → feature → tidy-after; each change = one PR). Ask the user about docs-to-write and where they live.
4. Write `.workflow/<feature>/architecture.md` per the skill — including the epic intent (why/what), since there is
   no separate epic spec — ending with a `## GATE`.
5. Update `state.json`:
   - set `epic.architecture="done"`, append a `transitions` entry, and set `currentStage` to the first change's
     next stage — `"propose"` if the lowest-`order` change is `spec:"openspec"`, `"design"` if it's `spec:"none"`;
   - populate `changes[]` from the agreed breakdown — each with `slug` (`<NN>-<name>`), `type`, `order`,
     `depends_on`, `spec` (`"openspec"` or `"none"` — triaged per the heuristic in `workflow:workflow-conventions`:
     behavioral → `"openspec"`, purely technical refactor/infra/tidy → `"none"`; recommend per change and **confirm
     with the user**), `change:null`, `specRoot:"."` (the change's OpenSpec root — `/workflow:propose` may retarget
     it to an app/domain sub-dir), and all stages set to `pending` — **except** for a `spec:"none"` change, set
     `propose`, `specify`, and `archive` to `na` (the rest `pending`);
   - create each change folder `.workflow/<feature>/<NN>-<slug>/`.
6. Tell the user to `/clear`, then run the next stage for the first change: `/workflow:propose` (then
   `/workflow:specify`) for a `spec:"openspec"` change, or `/workflow:design` directly for a `spec:"none"` one.
