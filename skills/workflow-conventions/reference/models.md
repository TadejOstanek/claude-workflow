# Models (reference)

Read this when your command launches `workflows/autonomous-loop.js` or spawns `design-critic` from `/workflow:design`.

Each subagent role (`code`, `test`, `run`, `review`, `pr`, `design-critic`) has a **model** and an optional **effort** (`low|medium|high|xhigh|max`; omit for the
session default).

- **Defaults:** `${CLAUDE_PLUGIN_ROOT}/config/default-models.json`, shape `role → { model, effort? }`.
- **Per change:** when a change is first scoped (`/workflow:start`, or `/workflow:arch` per change for an epic), the
  defaults are copied into its `state.json` as `models`. That copy is what the change runs on — edit it by hand to
  override a role (e.g. no Opus access → `review` to `sonnet` + `xhigh`).
- **`design-critic`:** no default, so it inherits the session's model. Add an entry to `models` to force one; effort
  can't be set for it (the `Agent` tool takes no `effort`).

## Who reads what

`/workflow:review-pr` has no roles: its agents inherit the session's model, or take `--model <name>` for all of them.

Commands (not the Workflow scripts, which have no filesystem access) pass the roles a script needs as `args.models`;
scripts read `A.models[role]` via `opt(role)`.

- `/workflow:build` → `change.models` → `{code, test, run, review, pr}`
- `/workflow:design` → `change.models["design-critic"].model` if present, else no override

A new role needs an `opt('<role>')` call at its call site and an entry in `config/default-models.json`.
