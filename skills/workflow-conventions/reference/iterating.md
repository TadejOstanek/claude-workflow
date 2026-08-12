# Iterating (workflow-conventions reference)

Read this when you're re-entering an already-`done` stage rather than moving forward for the first time — relevant
to `/workflow:propose`, `/workflow:design`, and `/workflow:build`.

## Iterating (going back a step — the normal case)

This is **not** a waterfall. You will routinely learn something late (manual QA finds a gap, a review comment lands)
and move *backward*: amend the spec, refine the code-design, rebuild only what changed — without re-running the
stages you don't want. The workflow supports this, and stages are revisitable. The rules that keep it sane:

- **Re-open an upstream stage by naming the change.** `/workflow:propose <change>` and `/workflow:design <change>`
  re-author in place — `propose` re-edits the OpenSpec `proposal.md` + `spec.md` (then re-validates); `design` reuses the
  change's existing `ticket`/`branch` (per `reference/git-safety.md`'s "Branch provisioning" — set by an earlier
  `/workflow:design`; it does **not** re-create them). Auto-resolution normally finds only *pending* stages; in
  `single` mode (one change) a blank invocation still defaults to that change so you needn't name it, but in
  `epic` mode you pass the change explicitly to revisit a `done` stage.
- **Re-opening upstream does NOT auto-invalidate downstream.** Downstream stages stay `done` even though their
  outputs (`review.md`, the PR body) now describe older code. This is deliberate: **you** decide what to redo. The
  upstream command *warns* that they're stale and gives the redo command — it never forces a cascade.
- **Resume vs. redo is your keyword, not inferred state** (the engine can't tell a crashed run from a deliberate
  rebuild). `/workflow:build` blank/`full` = resume (skip done); `light`/`only`/`skip` = redo the named subset even
  if done. So the QA→fix loop is: `/workflow:propose <c>` → `/workflow:design <c>` → `/workflow:build <c> only
  build commit` (re-implement + push to the existing draft PR, no review/PR-body rewrite). Use `only build` (no
  commit) to leave it uncommitted, or add `review`/`pr` to the `only` list when you *do* want them this round (`pr`
  re-authors the manual-QA section too).
- **Archive last protects iteration.** The canonical merge (`/workflow:archive`) is irreversible, so iterate freely
  *before* it; never archive a change you might still revise.
