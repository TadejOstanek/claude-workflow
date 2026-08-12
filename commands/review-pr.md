---
description: Review a GitHub PR — parallel, adversarially-verified dimensions (OpenSpec spec-satisfaction, correctness, conventions, concurrency). Terminal report by default; --comment posts to the PR. Standalone; no workflow state.
argument-hint: <PR link or number> [--comment]
---

# /workflow:review-pr

Review a coworker's pull request with special attention to any **OpenSpec spec** it carries (does the code actually
satisfy the scenarios?) plus full correctness / conventions / concurrency review. This is **standalone** — it does
**not** touch `.workflow/` state, and it is **read-only**: the only thing it ever writes is an optional PR comment.
It launches the Workflow tool (`workflows/pr-review.js`) synchronously — you get the report back in this turn.

Input: `$ARGUMENTS`

## 1. Parse arguments
- The PR: a number (`123`), or a URL (`https://github.com/<owner>/<repo>/pull/123` → parse owner/repo/number). If a
  URL names a different repo than the current one, pass it to `gh` with `--repo <owner>/<repo>`.
- `--comment` (boolean): when present, post the findings back to the PR. **Without it, never post anything.**
- Anything else → print usage and stop.

## 2. Resolve the PR (read-only `gh`)
```bash
gh pr view <ref> [--repo <owner/repo>] --json number,title,url,state,isDraft,baseRefName,headRefName,headRefOid,headRepositoryOwner,author
```
Capture: `prNumber`, `title`, `url`, `baseRef` (= `baseRefName` — **use this, never assume `main`**), `headSha`
(= `headRefOid` — needed for `--comment` permalinks), and `repo` (owner/repo of the base). If the PR can't be
resolved, stop with the error. A human asked for this review, so be permissive: do **not** skip drafts or
"trivial" PRs; if the PR is closed/merged, note it and proceed.

## 3. Check out the PR into an isolated worktree
This gives the review agents the PR's files as browsable local code (Read/Grep/Glob + optional tests) **without
disturbing your current branch or working tree**. Do it in the current repo:
```bash
REPO_ROOT=$(git rev-parse --show-toplevel)
WT="$REPO_ROOT/.claude/worktrees/pr-review-<prNumber>"
git worktree remove --force "$WT" 2>/dev/null || true      # clear any stale one
git worktree add --detach "$WT" "<baseRef>"
git -C "$WT" fetch origin "pull/<prNumber>/head"            # resolves on origin even for fork PRs
git -C "$WT" checkout FETCH_HEAD
```
**Cleanup is mandatory on every exit path** (success, no findings, or error) — run it in step 8. If `git worktree
add` fails (e.g. path exists), pick a `mktemp -d` path instead.

## 4. Detect the review context (inside the worktree)
- **Changed files (three-dot — the PR's changeset, matching GitHub):**
  ```bash
  git -C "$WT" diff --name-only "<baseRef>...HEAD"
  ```
- **OpenSpec spec targets — scan the changed paths for all THREE shapes** (a disciplined author may have run
  archive-before-merge, so the spec may not be a live change — don't miss those):
  - **live change** — `.../openspec/changes/<id>/proposal.md` or `.../openspec/changes/<id>/specs/**` →
    `{ changeId:<id>, specRoot:<dir containing openspec/>, specDir:<abs .../openspec/changes/<id>/> }`
  - **archived change** — `.../openspec/changes/archive/YYYY-MM-DD-<id>/**` → same shape, `specDir` = the archive dir
  - **canonical-only** — a modified `.../openspec/specs/<capability>/spec.md` (no matching change dir) →
    `{ capability:<capability>, specRoot:<dir containing openspec/>, specDir:<abs .../openspec/specs/<capability>/> }`

  Build the `specTargets` array (absolute paths). Empty ⇒ the spec dimension is simply skipped (report says N/A).
- **Test command (best-effort, optional):** detect it per the test-runner-detection heuristic
  (`${CLAUDE_PLUGIN_ROOT}/skills/workflow-conventions/reference/test-runner-detection.md`), scanning the worktree;
  if none, pass `null`. Pass it through; the finders run it
  only if they can. Don't block on it.

## 5. Launch the Workflow (synchronous)
Call the **Workflow** tool with `scriptPath: "${CLAUDE_PLUGIN_ROOT}/workflows/pr-review.js"`,
`run_in_background: false`, and `args` (keep the keys exactly — the script reads them):
```json
{
  "prNumber": <number>, "title": "<title>", "url": "<url>",
  "workdir": "<abs worktree path>", "baseRef": "<PR base branch>",
  "headSha": "<headRefOid>", "repo": "<owner/repo>",
  "specTargets": [ { "changeId": "...", "specRoot": "<abs>", "specDir": "<abs>" } ],
  "testCmd": "<detected or null>"
}
```
The script fans out finders → adversarial verify → dedup, and returns the review result (see its `return`).

## 6. Print the terminal report (always)
From the returned result, print a concise markdown report:
- A header: PR title + url; whether the **spec dimension ran** (and for which change id/capability) or was **N/A**;
  whether tests were available.
- **Verdict:** `clean` (no unresolved critical) or "N critical issue(s)".
- Findings ranked by severity (the result is already sorted). Per finding: `[severity]` `file:line` — `title`, then
  the `detail`. Prefix `possible:` for any finding flagged `possible` (a PLAUSIBLE that was demoted below critical).
  For spec findings, name the `scenario`.
- If no findings survived: say so plainly.

## 7. If `--comment`: post to the PR
Post **one** comment (mirror the house PR-review format) with `gh pr comment <prNumber> [--repo <owner/repo>] --body <body>`:
- Heading `### Code review`, then `Found N issue(s):` (or `No issues found.`).
- Each issue: `- **[severity]** <title> — <detail>` with a permalink built from the captured head SHA:
  `https://github.com/<repo>/blob/<headSha>/<file>#L<line>` (add `-L<endLine>` when it differs). Spec findings cite
  the scenario.
- Consider posting only findings at **`major` or above** to avoid nit-spam on a coworker's PR (mention in the
  terminal report if you filtered any out).
- Footer: `🤖 Generated with [Claude Code](https://claude.com/claude-code)`.
Never post without `--comment`.

## 8. Tear down the worktree (always)
```bash
git worktree remove --force "$WT" 2>/dev/null || true
```
Run this whether the review passed, found issues, or errored. It never touches your current branch or working tree.
Then confirm to the user the worktree is gone (`git worktree list` shows no `pr-review-*`).
