# Model tiers (reference)

Read this when your command launches `workflows/autonomous-loop.js`, `workflows/pr-review.js`, or
`workflows/insights.js`, or spawns `design-critic` from `/workflow:design` — anywhere a subagent's **model** or
**reasoning effort** needs to vary by how complex/risky the change is, instead of every change getting the same
fixed rigor.

## The problem this solves

Every subagent role (`code`, `test`, `run`, `review`, `pr`, `spec`, `find`, `verify`, `synth`, `cost`,
`quality`, `learnings`, `design-critic`) used to run on one hardcoded model, forever, regardless of the change. There's no way
to spend more thinking on a gnarly migration than on a one-line tidy-first fix. This config makes both **model**
and **effort** (`low|medium|high|xhigh|max` — a real, independently-tunable subagent knob, separate from model
choice) tunable per role, tiered by a change's `complexity`.

## The three tiers

`light` | `standard` | `deep` — set per change as `complexity` in `state.json` (see `state-and-layout.md`),
recommend-then-user-confirms, at `/workflow:start` or `/workflow:arch`.

## The config file

`${CLAUDE_PLUGIN_ROOT}/config/model-tiers.json` — one file, shipped with the plugin, edited directly (no
per-repo override layer; this workflow has a single user/config). Shape: `tier → role → { model, effort? }`.
`effort` is optional per cell — omit it to let the role run at its normal (session-default) reasoning effort.

## How a launching command resolves and threads it through

The command (not the Workflow script — scripts have no filesystem access) reads `config/model-tiers.json`, picks
this invocation's tier, and passes only the roles its script needs as `args.models`:

- `/workflow:build` → tier = `change.complexity` → `args.models` = `{code, test, run, review, pr}`
- `/workflow:review-pr` → standalone (no `state.json`); tier from a `--complexity <tier>` flag, default
  `standard` → `args.models` = `{spec, find, verify, synth}`
- `/workflow:insights` → standalone; tier from `--complexity <tier>` if given, else the single change's own
  stored `complexity` if scoped to one, else `standard` → `args.models` = `{cost, quality, learnings}`

Each script (`autonomous-loop.js`, `pr-review.js`, `insights.js`) reads `A.models[role]` directly via a small
`opt(role)` helper — no hardcoded per-script default to keep in sync; `config/model-tiers.json` is the only source
of truth. Agent frontmatter in `agents/*.md` is untouched by this — the documented frontmatter/script model
duplication (defense against agentType-resolution degrading to a default agent) is a separate, pre-existing
concern.

## `design-critic` — model only, not effort

`design-critic` is spawned via the plain `Agent` tool from `/workflow:design` (interactive, no Workflow script
involved), and the `Agent` tool has no `effort` parameter — only `model` (which does override the agent's own
`model: inherit` frontmatter). So `design-critic`'s tier entry is `{model}` only, and by design it's populated
**only for `deep`** (forcing `opus`, guaranteeing rigor regardless of what model the user's interactive session
happens to be on). `light`/`standard` intentionally have no `design-critic` entry — no override is passed, so it
keeps inheriting the session's model, identical to today; there's no benefit to forcing a *cheaper* model onto a
review a human is reading live. Per-change effort tuning for this one agent isn't reachable without either a new
`Agent`-tool capability or wrapping it in a one-agent Workflow script purely to gain `effort` — deliberately not
done here, as disproportionate machinery for one human-supervised, interactive agent.

## Adding a new tunable role

If a new subagent role gets added to one of the three scripts, add its `agentType`'s `opt('<role>')` call at the
call site and add that role to every tier in `config/model-tiers.json`.
