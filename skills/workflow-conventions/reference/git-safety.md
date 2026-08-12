# Git safety (workflow-conventions reference)

Read this when your stage switches or relies on the current checkout, or provisions a change's branch — currently
`/workflow:design` (both sections) and `/workflow:build` (checkout safety only).

## Checkout safety (before any checkout switch or loop launch)

The engine never uses worktrees — every stage runs git commands against whatever is checked out in the repo root.
That means both `/workflow:design` (creating the branch) and `/workflow:build` (launching the loop) must confirm
the checkout is actually safe to use before doing anything, rather than assuming it:
- **Clean working tree.** `git status --porcelain` must be empty before switching branches — a dirty tree risks
  carrying another change's uncommitted work onto this one's branch (git carries forward uncommitted changes across
  a checkout when they don't conflict).
- **Right branch.** The checkout must currently be on `main` (before this change's branch exists) or on this
  change's own `branch` (once it does) — never a *different* branch, which usually means another in-progress
  change owns the checkout right now.
If either check fails, **stop and ask the user** — tell them what's currently checked out and what this change
needs, and let them resolve it (commit/stash their other work, switch branches) before continuing. Never route
around this by creating a worktree or silently switching over foreign work — pausing for the user's explicit call
is the only escape hatch.

## Branch provisioning (per change)

Every change gets its own branch (one change = one PR), created once at the top of `/workflow:design` — this is the
**one place** that owns creating it, regardless of whether the change is spec-bearing or spec-less. Propose
(when it runs) writes the OpenSpec change directly onto whatever checkout is currently active — nothing forces a
branch to exist before then, and there's no worktree to orphan those files in.

- **How**: if `state.json` already has a `branch` for this change (you're re-designing during iteration), reuse it
  — never re-prompt or re-create. Otherwise, run the **checkout safety** check above (the checkout must be clean and
  on `main`); once it passes, prompt for the ticket number, derive the branch name
  `{username}/sc-{ticket}/{description}` (username from `git config user.name` / `gh api user --jq .login`), and run
  `git checkout -b <branch> main` — this switches the current checkout onto the new branch, carrying forward any
  uncommitted files (e.g. a proposal/spec written before the branch existed) since it's the same working tree, not a
  fresh checkout elsewhere.

  Record `ticket`, `branch` on **this change's entry** in `state.json`.
- **Re-entry**: if `ticket`/`branch` are already set on the change (checking the back-compat fallback above too),
  reuse them — never re-prompt or re-create. This is what lets re-running `/workflow:design` land on the same
  branch, and what keeps a pre-this-change workflow from having its already-provisioned branch clobbered by a
  `git checkout -b` that would fail on a branch that already exists.
