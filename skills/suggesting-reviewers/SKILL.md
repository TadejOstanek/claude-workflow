---
name: suggesting-reviewers
description: Finds which teammates to tag on a branch's PR by blaming the code the branch removed or rewrote, grouping it into the branch's structural changes, and naming the original author of each. Analysis only — never posts, requests reviews, or edits code.
when_to_use: User asks who to tag or flag for review, who wrote the code they changed, or who should see how their work was changed — for the current branch or a given base.
---

# Suggesting reviewers

Goal: tag the people who wrote the *previous* version of the code, so they can (1) catch a change that
shouldn't be there and (2) see how their work was changed. This is about original authors of what was
removed or replaced, not about who touched the files most.

Analysis only. Report in the terminal; the user tags people themselves. Don't post PR comments or request
reviews.

## Steps

### 1. Gather the data

Run from the root of the repo being reviewed (the script reads that repo's git state):

```bash
python3 ${CLAUDE_PLUGIN_ROOT}/skills/suggesting-reviewers/scripts/blame_removed_lines.py
```

Options: `--base <ref>` (default `main`), `--include-tests` (per-file output for tests/docs too),
`--max-symbols N`. It diffs the working tree against the merge-base, so committed, staged and unstaged
changes are all included; untracked files are not (they have no previous author anyway).

It prints per-author totals, a per-file author/commit breakdown, and, for each removed `def` / `class` /
model field / constraint name, the commit that introduced it. It skips migrations, fixtures and JSON.

### 2. Read the diff for the *why*, not just the numbers

Line counts say who wrote the most replaced lines, not which change matters. Skim the diff of the
production files (`git diff $(git merge-base HEAD main)`) and name the branch's **important changes**:
structural, data-model, and pattern changes (a field/enum replaced, a relation inverted, a state machine
collapsed, logic moved to a new module, a locking or query strategy changed). Ignore renames and
mechanical call-site updates.

### 3. Map each change to its original authors

For each important change, use the removed-symbol origins and per-file commits to find who introduced the
*specific* thing that was replaced. Prefer symbol origin over file-level totals: a person with 10 replaced
lines who wrote the removed FK matters more for that change than one who wrote 40 lines of call sites.
Where a symbol was later reworked by someone else, name both and say which part each wrote.

Exclude the current user (`git config user.email`) from recommendations — the script marks them `← you`.
Their own earlier work still appears in the output as context.

### 4. Report

- **Tag these** — the few people whose work was changed structurally, each with a one-line reason per
  change and the PR/commit that introduced it, e.g. "wrote the original model (#3422); this branch replaces
  its `status` enum and constraints with `location`".
- **Lighter-touch tags (optional)** — authors of smaller replaced pieces (a view, a template, one method).
- **Skip** — the current user, bots, and one-line hits.
- **Not covered** — anything you didn't trace (tests, migrations, new files with no previous author), and
  which reviewer you'd suggest for those, labelled as your suggestion rather than something history shows.

Use GitHub handles from the script output when it has them; otherwise just the name. Don't guess handles.

## Notes

- Blame uses `-w -M -C`, so whitespace changes and moved/copied lines are followed. Squash-merged PRs
  show as the PR author, which is who to tag.
- Don't check whether people are still active unless asked — assume the listed authors are reachable.
- New migrations and new files have no previous version; say so instead of inventing an owner.
