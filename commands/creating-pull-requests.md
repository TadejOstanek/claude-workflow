---
description: Generic, repo-agnostic pull request workflow - draft PR with a concise description. Fallback for repos that don't define their own creating-pull-requests skill. Standalone; no workflow state.
argument-hint: [title/description hint] [ready]
---

# /workflow:creating-pull-requests

The fallback PR-creation workflow for repos that don't define their own project-level `creating-pull-requests`
skill. Not part of the change pipeline.

Input: `$ARGUMENTS` — optional title/description hint, or `ready` to open non-draft (default: draft).

## 1. Determine the base branch
Usually `main`; confirm the current branch has commits ahead of it (`git log <base>..HEAD`).

## 2. Check for a repo PR template
Look for `.github/PULL_REQUEST_TEMPLATE.md` (or `.github/PULL_REQUEST_TEMPLATE/*.md`). If found, follow its
structure; otherwise use the default sections below.

## 3. Draft the title and body
- Aim for ~10-15 lines total — the diff is one click away; the description's job is to add what the diff doesn't
  say.
- **Summary** — one or two sentences on why, only if the title doesn't already make it obvious.
- **Changes** — bulleted, action-verb ("Add X", "Drop Y", "Rename Z"). Name the subject (function/class/endpoint/
  setting), not the file path.
- **Test plan** — concrete manual QA steps if there's a user-facing surface to exercise; otherwise a short
  checklist. Skip entirely if there's nothing to manually test.

## 4. Push and create
```bash
git push -u origin HEAD    # if not already tracking a remote
gh pr create --draft --title "<title>" --body "<body>"   # omit --draft only if $ARGUMENTS said "ready"
```
Report the PR URL back.

## 5. Updating an existing PR description
Fetch the latest description from GitHub first (`gh pr view <number> --json body`) and use it as the starting
point — don't rely on what's in the session.

## 6. Generating a PR description only (no PR yet)
Output the description inside a triple-backtick `markdown` fence so it can be pasted elsewhere. Do not push or
create anything.

## Notes
- Never include a "Generated with Claude Code" footer or similar attribution.
- Don't pad the test plan with "verified locally" — CI handles that.
- If the current repo has its own `.claude/skills/creating-pull-requests/` skill, that one takes precedence over
  this fallback.
