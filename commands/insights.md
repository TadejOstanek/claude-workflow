---
description: Analyze one change's (or a whole epic's) Claude Code sessions — workflow-process insights, cost/token stats (via the session-report plugin), and explicit learnings extraction into project memory. Standalone; read-only for state.json.
argument-hint: [feature[/NN-change]] [--write-memory] — blank feature: match current git branch
---

# /workflow:insights

Analyze the Claude Code sessions behind one change — or, given just a feature in epic mode, the whole epic — for
workflow-process quality (review efficacy, design-doc accuracy, gate friction/rework), cost/token stats scoped to
exactly those sessions (via the separate `session-report` plugin's analyzer), and explicit learnings extraction into
project memory. This is **standalone** — it never touches `.workflow/state.json`, no stage, no GATE. It launches the
Workflow tool (`workflows/insights.js`) synchronously — you get the report back in this turn.

Input: `$ARGUMENTS`

## 1. Parse arguments

- `feature[/NN-change]` (optional) and `--write-memory` (boolean flag, may appear anywhere in `$ARGUMENTS`).
- Without `--write-memory`, the Learnings phase only **drafts** proposed memories/amendments — nothing is written
  outside the repo. Pass it to actually persist them. This mirrors `/workflow:review-pr`'s `--comment` opt-in.

## 2. Resolve scope + change(s)

1. If a `feature/NN-slug` was given, resolve that one change directly → `scope:"single-change"`.
2. Else if just a `feature` was given: read `.workflow/<feature>/state.json`. `mode:"single"` → its sole change
   (`scope:"single-change"`). `mode:"epic"` → the **whole epic**, every change in it together (`scope:"epic"`) —
   this is a first-class mode, not a fallback; you don't need to name a change to analyze an epic as a whole.
3. Else (blank): resolve via the current branch —

   ```bash
   git rev-parse --abbrev-ref HEAD
   ```

   Scan every `.workflow/*/state.json` for a `changes[].branch` (or the back-compat top-level `branch`) matching
   it.
   - Exactly one match → that change, `scope:"single-change"` (even inside an epic — a branch names one change, so
     this is a drill-down, not "the whole epic").
   - Zero matches and exactly one `.workflow/*/` exists in single mode → default to its sole change.
   - Otherwise → list every active workflow/epic/change (mirror `/workflow:start`'s blank-argument status listing)
     and ask the user to pick.
4. Read whichever of `architecture.md`, `code-design.md`, `design-critique.md`, `implementation.md`, `tests.md`,
   `test-lint.md`, `review.md` exist under each resolved change's `.workflow/<feature>/<NN-slug>/` — one dir for
   `scope:"single-change"`, every change's dir for `scope:"epic"`, plus the epic's own top-level `architecture.md`.
   Also each change's OpenSpec change dir (`<specRoot>/openspec/changes/<change>/`) when `spec:"openspec"`.

## 3. Collect session IDs

From the resolved workflow's `state.json.transitions`:

- `scope:"single-change"` in a **single-mode** workflow, or `scope:"epic"`: every transition in that workflow
  belongs to the thing being analyzed — collect all unique `sessionId`s. `mode:"exact"` when every relevant entry
  has one; if any are missing (an old workflow, from before this field existed), fall back to `mode:"approximate"`
  for the whole analysis rather than mixing exact and approximate silently.
- `scope:"single-change"` drilling into **one change inside a multi-change epic**: sibling changes' transitions
  interleave with identical stage vocabulary and can't be reliably attributed to just this change — always
  `mode:"approximate"`.
- For `mode:"approximate"`, compute `windowStart`/`windowEnd` from the earliest/latest `at` timestamp among the
  relevant transitions.

## 4. Launch the Workflow (synchronous)

Determine `repoRoot` (`git rev-parse --show-toplevel`). Call the **Workflow** tool with
`scriptPath: "${CLAUDE_PLUGIN_ROOT}/workflows/insights.js"`, `run_in_background: false`, and `args` (keep the keys
exactly — the script reads them):

```json
{
  "feature": "<feature-slug>", "scope": "single-change|epic",
  "changes": [ { "slug": "<NN-change-slug>", "title": "<change title>",
                 "phaseDir": "<abs .workflow/<feature>/<NN-change>/>",
                 "changeDir": "<abs OpenSpec change dir, or null>" } ],
  "reportDir": "<abs .workflow/<feature>/<NN-change>/ for single-change, or abs .workflow/<feature>/ for epic>",
  "repoRoot": "<abs repo root>",
  "mode": "exact|approximate",
  "sessionIds": ["..."],
  "windowStart": "<ISO or null>", "windowEnd": "<ISO or null>",
  "writeMemory": <bool>
}
```

`changes` has one entry for `scope:"single-change"`, all of the epic's for `scope:"epic"`.

## 5. Write `insights.md` and print the terminal report

From the returned result, write `<reportDir>/insights.md` — opening with "Informational only — not a pipeline
stage" so it's never mistaken for a GATE'd stage output — with a section each for Cost, Quality, and Learnings
(same content as the terminal report below). Then print the same report to the user:

- **Cost** — session/subagent counts, token totals, cache-hit %, wall-clock/active hours, and the path to the saved
  scoped HTML report. If `mode:"approximate"`, say so plainly and note the time window used, since figures may
  include unrelated work done in the same repo during that window.
- **Quality** — findings per change (area, severity, evidence), plus any epic-wide suggestions when `scope:"epic"`.
- **Learnings** — memories drafted (slug, type, one-line description) and any existing memory amended. If
  `writeMemory` was false, say so plainly and show the re-run command with `--write-memory` appended so nothing
  was silently lost.
- Mention that `insights.md` and the HTML report just landed in `reportDir` and will show as untracked in
  `git status` the first time.

Never touch `state.json` — no stage, no GATE, no transition.
