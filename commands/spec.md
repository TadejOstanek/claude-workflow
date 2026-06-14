---
description: Run the Specification stage of the active workflow — establish the why and what with the user. Writes spec.md.
---

# /workflow:spec

Apply the `workflow:specification` skill. Read `workflow:workflow-conventions` for the file/GATE format.

1. Resolve the active workflow folder under `.workflow/` from `state.json`. If more than one is active, ask which.
   Read its `state.json`.
2. If `spec.md` already exists (you're returning to fix it), read it and any later-stage files first to learn why,
   then refine rather than restart.
3. Run the stage interactively per the skill — clarify, challenge assumptions, push for testable given/when/then
   acceptance criteria. **Do not read code.** You may read repo documentation.
4. Write `.workflow/<feature>/spec.md`: headers **Goals/Why · Acceptance criteria · Non-obvious constraints ·
   Non-goals** (sub-sections if complex), checkboxes, and a `## GATE` (status `pass` once the user agrees).
5. Update `state.json` (`epic.spec="done"`, `currentStage="architecture"`, append a `transitions` entry) and tick
   the Epic section in `OVERVIEW.md`.
6. Tell the user to `/clear`, then run `/workflow:arch`.
