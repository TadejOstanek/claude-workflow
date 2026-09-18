---
name: generate-openspec
description: Methodology for the workflow's optional, terminal OpenSpec export — translate a landed change's spec.md + build docs into an OpenSpec change and merge it into the canonical library. Use when running /workflow:generate-openspec.
---

# Generate-OpenSpec stage (per change, optional, standalone)

Goal: for a change whose code has already landed — `review` has committed it, possibly with its PR already open —
author and merge an OpenSpec change from what the workflow already knows, for teams/changes that want OpenSpec's
durable, committed record. This is **not** part of the day-to-day pipeline: nothing upstream produced this, nothing
downstream requires it. It exists purely because you asked for it, right now, for this change.

This is authoring work — translating `spec.md`'s Acceptance Criteria into OpenSpec's exact WHEN/THEN scenario
format is a genuine judgment call, so it runs as a **conversation**, not a silent background agent.

## Method
- **Always ask first.** This only ever runs because the user asked for it *this time*, for *this change* — never
  assume a standing "yes" from a prior run on a different change.
- Read everything the change already produced: `spec.md` (Why + Acceptance Criteria — the source of truth for
  *what* to write), `architecture.md`, `code-design.md`, `implementation.md`, `tests.md`, `review.md`. Ground the
  OpenSpec scenarios in what was **actually built and tested**, not what was originally planned — these can differ,
  and the shipped behavior is what matters now.
- Follow `${CLAUDE_PLUGIN_ROOT}/skills/workflow-conventions/reference/openspec-integration.md` for every mechanical
  step: picking/initializing `specRoot`, the exact `proposal.md`/`specs/**` format via `openspec instructions`,
  translating each Acceptance Criteria checkbox into one or more `### Requirement:`/`#### Scenario:` blocks,
  `openspec validate` + `openspec archive -y`, the Purpose-backfill for brand-new capabilities, and what to commit.
- Derive the capability list yourself, grouping related Acceptance Criteria under a capability name that reads
  naturally in OpenSpec's domain vocabulary.
- **Never drop a requirement** — same discipline as `propose`: every Acceptance Criteria checkbox in `spec.md`
  must land in some scenario, or you've silently narrowed the exported spec versus what was actually agreed and
  built.
- Confirm the derived capability list and scope with the user before finalizing the merge.
- Run the usual checkout-safety check (`workflow:workflow-conventions`' git-safety reference) before committing —
  this adds a commit to the change's **existing** branch, whether it's still just a draft PR or already merged
  work-in-progress under review.

## Output: `openspec-export.md`
Write `.workflow/<feature>/<change>/openspec-export.md`: which capabilities the canonical library gained (new) or
changed (modified requirements) — this is what the user reviews before merging the PR (or, if the PR already
merged, just for their own record). No `## GATE` — this is not a pipeline stage with a pass/fail the loop checks;
it's a standalone action's report.

## Done when
The user agrees the exported spec is right, `openspec validate` passes, and the merge is committed.
