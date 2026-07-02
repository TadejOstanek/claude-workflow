---
name: review-standards
description: Shared review methodology for the workflow — severity vocabulary, judge priorities, false-positive discipline, and how to judge spec-satisfaction. Read by every reviewing agent (reviewer, spec-auditor, pr-reviewer) so each applies the same rubric instead of restating it.
---

# Review standards (shared rubric)

How this workflow reviews code — one home for the vocabulary and priorities every reviewing agent shares. Whether
you review the workflow's own change (`reviewer`) or an external PR (`spec-auditor`, `pr-reviewer`), apply this.

## Judge — in priority order

1. **No regressions / new bugs.** Be adversarial about correctness, invariants, data integrity, and migrations.
   This always outranks style and cleanup: a correctness finding matters more than a convention nit.
2. **Satisfies the specification** (see "Judging spec-satisfaction" below when the change carries a spec).

## Severity

- **`critical`** — **blocks merge.** A real bug, data-loss/corruption risk, broken migration, violated invariant, an
  **unmet spec scenario**, or a hard convention break the team would reject.
- **`major`** — a genuine problem worth fixing, but not merge-blocking on its own.
- **`minor`** — a small improvement.
- **`nit`** — trivia (naming, phrasing). Optional.

A review is **clean** when no `critical` findings remain.

## False-positive discipline

A wrong finding costs more than a missed nit — it erodes trust and wastes the author's time. Before you report
anything, rule it out against this list. **Do not flag:**

- **Pre-existing issues** — code the change didn't touch, or a problem that already existed on the base branch.
  Only review lines this change actually modified/added (plus their direct consequences).
- **Linter / type-checker / formatter territory** — unused imports, spacing, obvious type mismatches. Tooling
  catches these; a human reviewer shouldn't spend findings on them.
- **Intentional related changes** — a refactor or rename the change deliberately makes.
- **Style preferences a senior wouldn't block on** — "I'd write it differently" is not a finding.
- **Speculative** — a bug you can't tie to a concrete failing input/state. If you can't state how it fails, it's a
  question, not a finding.

Every finding must name a **concrete failure**: the input/state → the wrong outcome. If you can't, drop it.

## Judging spec-satisfaction

When the change carries a behavioral spec (an OpenSpec change: `### Requirement:` blocks with `#### Scenario:`
WHEN/THEN acceptance criteria — see `workflow:workflow-conventions` for the delta format), verify the code actually
satisfies **every** scenario. There are two ways to establish the scenario → code/test mapping:

- **(a) Via the code-design coverage map** — for a workflow-internal change that has a `code-design.md`. Its
  **scenario coverage map** is the traceability contract: for each row, verify the listed test behavior(s) exist and
  cover the scenario. Emit the map with `✓` (covered) / `✗` (gap). Any `✗` = critical.
- **(b) Derived directly from the delta + the diff** — for an external PR with **no `code-design.md`**. Build the
  mapping yourself: for each scenario in the change's `specs/**/*.md`, find the code and test in the diff that
  implement it. `ADDED` → the new behavior and a covering test are present; `MODIFIED` → the behavior actually
  changed as specified and its test was updated; `REMOVED` → the behavior/code is actually gone. A scenario with no
  corresponding code/test, or code that contradicts the scenario, = **critical** (unmet spec).

Either way: an unmet or unverifiable scenario is a `critical` finding — the spec is the authoritative contract.
