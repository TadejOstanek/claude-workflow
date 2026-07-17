---
description: Fork a worktree off the latest origin/main, implement a small change there, and open a PR - without touching the current working tree or running lint/tests. Standalone; no workflow state.
argument-hint: <description of the change>
---

# /workflow:side-task

For working on something small in parallel with bigger work already in progress in the current worktree. Never
touches the current checkout.

Input: `$ARGUMENTS` — free text describing the change. If missing, ask what to implement.

## 1. Fork a worktree from latest origin/main
```bash
REPO_ROOT=$(git rev-parse --show-toplevel)
USERNAME=$(git config user.name)   # fallback: gh api user --jq '.login'
git fetch origin main
SLUG=<slugified description, lowercase, hyphenated>
BRANCH="$USERNAME/$SLUG"
WT="$REPO_ROOT/.claude/worktrees/side-task-$SLUG"
git worktree add -b "$BRANCH" "$WT" origin/main
```

## 2. Implement inside the worktree
Do all edits inside `$WT` — never switch branches or touch files in the current worktree.

## 3. Skip verification
Do not run linters, type-checkers, or test suites — explicitly out of scope for this command.

## 4. Commit
One atomic commit inside the worktree; message explains why, not what.

## 5. Open the PR
- If the repo defines its own `.claude/skills/creating-pull-requests/SKILL.md`, apply that skill from inside the
  worktree.
- Otherwise, run `/workflow:creating-pull-requests` from inside the worktree.

## 6. Clean up
On success: `git worktree remove --force "$WT"`, then report the PR URL.
On failure at any step: stop, report what happened, and leave the worktree in place so the work isn't lost.
