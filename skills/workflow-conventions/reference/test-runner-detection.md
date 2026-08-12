# Test-runner detection (workflow-conventions reference)

Read this when your stage needs to detect a repo's test/lint command — currently `/workflow:build` and
`/workflow:review-pr`.

Detect how a repo runs its tests by scanning it, in this order (used by `/workflow:build` and `/workflow:review-pr`).
Every branch below must set `testCmd` to a concrete, runnable command string — never leave it a bare flag or null
when a runner was actually found:
- `peel.yml` present → `testCmd: "peel test"` and `isPeel:true`. This is a placeholder that confirms **peel** is
  the runner — it does not name the target(s) to run. The test-runner agent decides the actual `-t`/`--target`
  list itself per change (see `workflow:test-runner`), combining every applicable tool into one invocation.
  Detection has no visibility into which languages a given change touches, so don't guess a single target here.
- else a `Makefile` `test` target → `testCmd: "make test"`.
- else `pyproject.toml`/`pytest.ini` present → `testCmd: "pytest"`.
- else a `package.json` test script → `testCmd: "npm test"`.
- else no runner found → `/workflow:build` **asks the user** for a command rather than passing `testCmd: null`
  silently; `/workflow:review-pr` just skips running tests (best-effort there).

A `testCmd` of `null` skips the whole test-lint stage — pass it only when you've actually asked and the user said to
proceed without tests. Some runners (peel) exit `0` even when they never ran (Docker down, expired session) — judge
by real output, not the exit code.
