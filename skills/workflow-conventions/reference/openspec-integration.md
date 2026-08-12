# OpenSpec integration (workflow-conventions reference)

Read this when your stage authors, consumes, or archives a change's OpenSpec spec — currently `/workflow:propose`
and `/workflow:archive` (`/workflow:design` only needs the one-line consumption note below).

- **`<specRoot>`** is the repo-relative directory whose `openspec/` holds this change (default `"."` = repo
  root; stored per change in `state.json`). A repo may keep one root `openspec/` *or* opt into per-app/domain
  sub-roots (`goods/openspec/`, `packages/api/openspec/`, …). Simple repos never see this: `specRoot` just stays
  `"."`.
- We use OpenSpec for **`proposal` + `specs` only** — never its `design` or `tasks` artifacts. This workflow's
  architecture + code design + autonomous loop replace those. (OpenSpec's `design` artifact ≠ `/workflow:design`,
  which writes `code-design.md`.) Stock `openspec validate`/`archive` work on proposal + specs alone.

## OpenSpec integration (the thin seam)

OpenSpec sits **underneath** this workflow as a passive spec store + canonical library, driven by the engine.
Grain: **one OpenSpec change = one change = one PR.**

- **Where the spec lives — `specRoot` (cwd discipline).** OpenSpec resolves its root from the **working
  directory**: `change`, `validate`, and `archive` operate on `<cwd>/openspec/` (no walk-up); `status` walks up
  to the *nearest* ancestor `openspec/`. So a change's spec lives wherever you run `openspec`. This workflow
  records that directory as the change's **`specRoot`** and runs **every** `openspec` invocation for the change
  with `<specRoot>` as cwd — `(cd "<specRoot>" && openspec …)`. Default `specRoot` is `"."`
  (repo root). A repo organizes specs **per app/domain** simply by creating sub-root `openspec/` dirs
  (`goods/openspec/`, …) and pointing a change's `specRoot` at one; cross-cutting changes use `"."`. The engine
  **discovers** existing roots — it never hardcodes paths or app names, so this stays repo-agnostic.
- **Authoring** — `/workflow:propose` picks `specRoot`, runs `openspec new change <id>`, and writes both
  `proposal.md` (why/what) and the `specs/<capability>/spec.md` deltas (testable behavior) in one session. It pulls
  the exact format from `openspec instructions <artifact> --change <id> --json`. All of these run with cwd =
  `<specRoot>`, on whatever checkout is currently active (the change's branch doesn't exist yet — see
  `reference/git-safety.md`).
- **Consumption** — for a spec-bearing change, code-design and the loop's agents read the change's behavioral spec
  from `<specRoot>/openspec/changes/<change>/` (passed to the loop as the absolute `changeDir` — see
  `/workflow:build`). The reviewer commits the change's proposal + specs into its PR, but
  **never** `<specRoot>/openspec/specs/` (the canonical library). For a **spec-less** change there is no OpenSpec
  change: `changeDir` is `null`, `code-design.md` is the whole behavioral contract, and nothing OpenSpec-related is
  read or committed.
- **Archive is manual and deliberate** (`/workflow:archive`): run it yourself (with cwd = `<specRoot>`) when you
  are sure the change is fully done. It merges the change's deltas into the canonical
  `<specRoot>/openspec/specs/<capability>/` and moves the change to `<specRoot>/openspec/changes/archive/`. It is
  **not** automated by the loop. Run it on the change's branch *before* merging (so the canonical spec ships in
  the PR) or after — your call.
- Requires the `openspec` CLI (`@fission-ai/openspec`, Node ≥ 20.19) and a one-time `openspec init` in each
  `specRoot` (the engine runs it automatically when a chosen `specRoot` has no `openspec/` yet).
