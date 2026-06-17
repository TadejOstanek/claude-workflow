---
description: Run the Architectural Design stage of the active workflow — decide how the change fits the codebase, the data model, and the phase breakdown. Writes architecture.md.
---

# /workflow:arch

Apply the `workflow:architectural-design` skill. Read `workflow:workflow-conventions` for the file/GATE format.

1. Resolve the active workflow folder from `state.json`. Read `state.json` and `spec.md`.
2. If `architecture.md` already exists (returning), read it and any later-stage files first to learn why, then refine.
3. Run the stage interactively per the skill — read the code (use `orchestration:investigate`), scrutinize the data
   model, challenge assumptions, recommend on each fit decision, pressure-test, and agree the **phase breakdown**
   (tidy-first → feature → tidy-after). Ask the user about docs-to-write and where they live — never decide alone.
4. Write `.workflow/<feature>/architecture.md` per the skill (checkboxes + `## GATE`).
5. Update `state.json`:
   - set `epic.architecture="done"`, `currentStage="design"`, append a `transitions` entry;
   - populate `phases[]` from the agreed breakdown — each with `slug` (`<NN>-<name>`), `type`, `order`,
     `depends_on`, `change: null` (filled by `/workflow:phase-spec`), and all pipeline `stages`
     (`spec`, `code-design`, `build`, `test-lint`, `review`, `docs`, `qa`, `pr`, `archive`) set to `pending`.
     Each phase becomes one OpenSpec change = one PR;
   - create each phase folder `.workflow/<feature>/<NN>-<slug>/`.
6. Add a section per phase to `OVERVIEW.md` with the stage checklist.
7. Tell the user to `/clear`, then run `/workflow:phase-spec` (authors the first phase's behavioral spec as an
   OpenSpec change), followed by `/workflow:design`.
