---
description: Run the Code Design stage for a change — specify exact interfaces and test behaviors. Writes code-design.md. Last interactive stage before the autonomous loop.
argument-hint: [change slug] — blank to use the next change needing design
---

# /workflow:design

Apply the `workflow:code-design` skill. Read `workflow:workflow-conventions` for the GATE format, plus its
reference files:
- `${CLAUDE_PLUGIN_ROOT}/skills/workflow-conventions/reference/state-and-layout.md` — file layout + `state.json` schema
- `${CLAUDE_PLUGIN_ROOT}/skills/workflow-conventions/reference/model-tiers.md` — `design-critic`'s per-tier model

1. Resolve the active workflow from `state.json`. Read `state.json` and the epic `architecture.md` if present.
   For a **spec-bearing** change (`spec:"openspec"`), also read **this change's behavioral spec — the OpenSpec
   change at `<specRoot>/openspec/changes/<change>/`** (`proposal.md` + `specs/**/*.md`; the `change` id and
   `specRoot` (default `"."`) are in `state.json`). For a **spec-less** change (`spec:"none"`) there is no OpenSpec
   change — its intent comes from the feature description / epic `architecture.md`. Use the change in
   `$ARGUMENTS`, else the lowest-`order`
   change whose `code-design` stage is `pending` (respect `depends_on`). If the resolved change's `code-design`
   stage is already `"done"`, **stop**: this stage is complete and this command does not re-open it — tell the
   user any further design change now happens outside the workflow. For a spec-bearing change, its
   `stages.propose` must be `done` (the OpenSpec change must exist) — if not, stop and tell the user to run
   `/workflow:propose` first. A `spec:"none"` change has no spec prerequisite (`propose` is `na`) — proceed. Also
   read the change's own `architecture.md` if present.
2. **Data model must be decided first.** Check this change's `stages.architecture`:
   - **`pending`** — the data-model & structural-fit pass hasn't run. **Stop** and tell the user to run
     `/workflow:arch` first; that stage owns the data model, and `code-design` treats it as decided input.
   - **`done`** — you already read the change's `architecture.md` in step 1; use it as the decided data model. If
     mid-design it turns out to be wrong, don't send the user to `/workflow:arch` (it's done and won't re-run) —
     confirm the correction with the user, then edit `architecture.md` in place yourself.
   - **`na`** — skipped (no data-model dimension for this change). Proceed — but if you discover mid-design that a
     data-model or structural question actually needs deciding, **stop and send the user to `/workflow:arch
     <change>`** (its first pass, not a re-run).
3. Run the stage interactively per the skill — exact interfaces, components, test behaviors, discovered conventions
   (use `orchestration:lookup`/`orchestration:investigate` for the conventions discovery).
4. Write `.workflow/<feature>/<change>/code-design.md` (interfaces, components, tests, conventions; checkboxes + `## GATE`).
5. **Adversarial critique — default-on, skippable.** Ask the user whether to run the `workflow:design-critic` agent
   against the drafted `code-design.md` (default: yes; skip only for a trivial/low-risk change). If run, resolve
   this change's model tier (`change.complexity`) per the model-tiers reference above: for tier
   `deep`, spawn the agent with an explicit `model: "opus"` override (guaranteeing full rigor regardless of your
   own session's model); for `light`/`standard`, spawn it with no model override (it keeps `model: inherit` —
   identical to today). Spawn it with this change's `code-design.md`, `architecture.md` (if any), and OpenSpec
   change (if spec-bearing) — it writes `.workflow/<feature>/<change>/design-critique.md` and returns findings.
   Present any findings to the user next to the design. This is advisory, not a gate: if a finding reveals a real
   problem, revise `code-design.md` (re-running the critic afterward if the revision was substantial); proceeding
   without addressing a finding is the user's call, not yours.
6. Update `state.json` (change `stages["code-design"]="done"`, `currentStage="build"`, append a transition with
   `sessionId`, per the state-and-layout reference above).
7. Get the user's explicit approval. Then tell them to `/clear` and run `/workflow:build` for this change.
