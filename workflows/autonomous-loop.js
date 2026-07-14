export const meta = {
  name: 'workflow-autonomous-loop',
  description: 'Autonomous tail of the dev workflow for one change: parallel implement+test → test/lint → opus review (commits) → draft PR (with its own QA section). File-based handoff; loops on failure; escalates the unresolvable.',
  phases: [
    { title: 'Build', detail: 'parallel implementer + test-author from the code design' },
    { title: 'Migrate', detail: 'optional pre-test command; skipped when migrateCmd absent' },
    { title: 'Test', detail: 'scoped test+lint (haiku); reconcile → re-run, bounded' },
    { title: 'Review', detail: 'opus review of the diff; commits on pass; fix loop, bounded' },
    { title: 'PR', detail: 'draft pull request, including its own manual QA section' },
    { title: 'Commit', detail: 'redo-only: land code on the branch without opening/rewriting a PR' },
  ],
}

// ---------- args (from /workflow:build, which has filesystem access) ----------
let A = args
if (typeof A === 'string') { try { A = JSON.parse(A) } catch (_e) { A = {} } }
A = A || {}

const TITLE = A.title || A.scope || 'change'
const SCOPE = A.scope || TITLE
const FEATURE_DIR = A.featureDir   // .workflow/<feature>/   (epic architecture.md lives here in epic mode)
const PHASE_DIR = A.phaseDir       // .workflow/<feature>/<NN>-slug/  (this phase's stage files)
const CHANGE_DIR = A.changeDir || null  // <specRoot>/openspec/changes/<change-id>/ — this change's behavioral spec (OpenSpec change)
// Canonical spec library for this change's OpenSpec root (sibling of changes/). Derived from CHANGE_DIR so it is
// correct whether specRoot is the repo root or an app/domain sub-dir — never staged during the loop (merges only at archive).
const CANON_SPECS = CHANGE_DIR ? CHANGE_DIR.replace(/\/changes\/[^/]+\/?$/, '/specs') : 'openspec/specs'
// OpenSpec-change clauses spliced into the review/commit/PR instructions. Empty for a spec-less change (no
// CHANGE_DIR) so we never tell an agent to stage an `openspec/changes/<change>` path that doesn't exist.
const SPEC_CLAUSE = CHANGE_DIR ? ` plus the phase's OpenSpec change at ${CHANGE_DIR}` : ''
const CANON_CLAUSE = CHANGE_DIR ? `, never the canonical library \`${CANON_SPECS}\` (it merges only at archive)` : ''
const WORKDIR = A.workdir || '.'   // absolute repo root — ALL git/test/gh commands run here
const BASE_REF = A.baseRef || 'main'
const APP_DIR = A.appDir || '.'
const TEST_CMD = A.testCmd || null
const MIGRATE_CMD = A.migrateCmd || null
const IS_PEEL = A.isPeel === true || (TEST_CMD || '').startsWith('peel')

// Stages still to do (command computed this from state.json + on-disk GATEs). Empty/absent → run all.
const PENDING = Array.isArray(A.pendingStages) ? A.pendingStages : null
const todo = (name) => !PENDING || PENDING.includes(name)

// Models are set BOTH inline here and in each agent's frontmatter, so the per-stage model holds even if plugin
// agentType namespace resolution degrades to the default workflow agent.
const M = { code: 'sonnet', test: 'sonnet', run: 'haiku', review: 'opus', pr: 'sonnet' }

// ---------- schemas ----------
const GATE_SCHEMA = {
  type: 'object', additionalProperties: false,
  required: ['gate', 'summary'],
  properties: {
    gate: { type: 'string', enum: ['pass', 'fail'] },
    summary: { type: 'string' },
    returnTo: { type: 'string', description: 'stage to fix it, when gate=fail' },
    reason: { type: 'string' },
    escalate: { type: 'boolean', description: 'true if a human must decide (design/architecture problem)' },
  },
}
const TEST_SCHEMA = {
  type: 'object', additionalProperties: false,
  required: ['ran', 'passed', 'summary', 'failures'],
  properties: {
    ran: { type: 'boolean', description: 'true ONLY if tools actually executed — judge by OUTPUT, not exit code' },
    passed: { type: 'boolean' },
    summary: { type: 'string' },
    failures: {
      type: 'array',
      items: {
        type: 'object', additionalProperties: false,
        required: ['target', 'test', 'error'],
        properties: {
          target: { type: 'string' }, test: { type: 'string' }, error: { type: 'string' },
          domain: {
            type: 'string', enum: ['code', 'test', 'unknown'],
            description: 'best-effort guess at which side owns the fix, NOT a verified fact — "unknown" is the safe default whenever signals are unclear or conflicting',
          },
        },
      },
    },
  },
}
const REVIEW_SCHEMA = {
  type: 'object', additionalProperties: false,
  required: ['clean', 'committed', 'summary', 'findings'],
  properties: {
    clean: { type: 'boolean', description: 'true if NO critical findings remain' },
    committed: { type: 'boolean', description: 'true if you committed the code' },
    escalate: { type: 'boolean', description: 'true if the fix is a design decision a human must make' },
    summary: { type: 'string' },
    findings: {
      type: 'array',
      items: {
        type: 'object', additionalProperties: false,
        required: ['severity', 'file', 'title', 'detail'],
        properties: {
          severity: { type: 'string', enum: ['critical', 'major', 'minor', 'nit'] },
          file: { type: 'string' }, title: { type: 'string' }, detail: { type: 'string' },
        },
      },
    },
  },
}
const PR_SCHEMA = {
  type: 'object', additionalProperties: false,
  required: ['opened', 'summary'],
  properties: { opened: { type: 'boolean' }, committed: { type: 'boolean', description: 'true if you committed the change here (e.g. review was skipped)' }, url: { type: 'string' }, summary: { type: 'string' } },
}

// ---------- shared prompt context ----------
const SPEC_LINE = CHANGE_DIR
  ? `Behavioral spec: ${CHANGE_DIR}/  (OpenSpec change — read proposal.md + specs/**/*.md; the requirement
  scenarios there ARE the acceptance criteria this change must satisfy)`
  : `Behavioral spec: see ${PHASE_DIR}/code-design.md`
const CTX = `Workflow change "${TITLE}" (scope: ${SCOPE}).
Epic arch:   ${FEATURE_DIR}/architecture.md  (epic mode only; may be absent)
${SPEC_LINE}
Change docs: ${PHASE_DIR}/  (this change's code-design.md + an optional architecture.md)
Working dir: ${WORKDIR}  — run ALL shell/git/test/gh commands here (use \`git -C ${WORKDIR}\` or cd first).
Read your role's agent instructions; read only what you need. Write your output file in ${PHASE_DIR}/ and end it
with a \`## GATE\`. Your final structured output IS that gate.`

const PEEL_NOTE = IS_PEEL ? `
PEEL: first run after a Docker (re)start builds the container (minutes) — not a failure, wait. peel can exit 0 even
when it never ran (Docker down / expired AWS session) — judge by OUTPUT and set ran=false in that case.` : ''

// ---------- result accumulator ----------
const result = {
  scope: SCOPE, committed: false, prUrl: null, testsVerified: false,
  escalation: null, openFindings: [], stageGates: {}, skipped: [],
}
const escalate = (returnTo, reason) => { result.escalation = { returnTo, reason }; }

// Decide which fixer(s) to spawn for a round of TEST_SCHEMA failures. Narrows to a single domain's fixer ONLY when
// every failure in the round carries the same explicit 'code' or 'test' tag; any 'unknown' tag, any missing/absent
// tag, or a mix of tags falls back to spawning both (today's behavior) — the safe default on any ambiguity.
const fixDomains = (failures) => {
  const tags = (failures || []).map((f) => (f && (f.domain === 'code' || f.domain === 'test')) ? f.domain : 'unknown')
  if (tags.length && tags.every((d) => d === 'code')) return ['code']
  if (tags.length && tags.every((d) => d === 'test')) return ['test']
  return ['code', 'test']
}

// ============ BUILD (parallel implementer + test-author) ============
if (todo('build') && !result.escalation) {
  phase('Build')
  log(`${TITLE}: implementing code + tests in parallel`)
  const [impl, tst] = await parallel([
    () => agent(`${CTX}\nImplement the application CODE for this phase from ${PHASE_DIR}/code-design.md.`,
      { agentType: 'workflow:implementer', model: M.code, phase: 'Build', label: `code:${SCOPE}`, schema: GATE_SCHEMA }),
    () => agent(`${CTX}\nWrite the TESTS for this phase from ${PHASE_DIR}/code-design.md (its Tests section).`,
      { agentType: 'workflow:test-author', model: M.test, phase: 'Build', label: `tests:${SCOPE}`, schema: GATE_SCHEMA }),
  ])
  result.stageGates.build = { impl, tst }
  const failed = [impl, tst].find((g) => g && g.gate === 'fail')
  if (failed) { escalate(failed.returnTo || 'code-design', failed.reason || 'build agent reported the design is not implementable'); }
}

// ============ MIGRATE (optional) ============
if (MIGRATE_CMD && todo('test-lint') && !result.escalation) {
  phase('Migrate')
  await agent(`${CTX}\nRun \`${MIGRATE_CMD}\` and report.${PEEL_NOTE}\nSet ran=false if the runner is unavailable. Do not hand-edit generated files.`,
    { agentType: 'workflow:test-runner', model: M.run, phase: 'Migrate', label: `migrate:${SCOPE}`, schema: TEST_SCHEMA })
}

// ============ TEST + LINT (haiku; bounded reconcile) ============
let test = null
if (todo('test-lint') && !result.escalation) {
  if (!TEST_CMD) {
    log('Tests SKIPPED — no testCmd was provided to the loop.')
    result.skipped.push('test-lint')
  } else {
    phase('Test')
    const RUN_INSTR = IS_PEEL
      ? 'This repo uses peel. Decide which peel targets apply to this change (test framework + linters for the changed languages only, per your own scoping) and run them together in ONE `peel test -t ...` invocation — never call peel once per tool.'
      : `Run \`${TEST_CMD}\` (plus this repo's linters)`
    const RUN = `${CTX}\n${RUN_INSTR} for this change and write ${PHASE_DIR}/test-lint.md.${PEEL_NOTE}\nReport every real failure precisely (target + test + error).`
    const MAX = 2
    for (let i = 1; i <= MAX; i++) {
      test = await agent(RUN, { agentType: 'workflow:test-runner', model: M.run, phase: 'Test', label: `test #${i}:${SCOPE}`, schema: TEST_SCHEMA })
      if (!test || !test.ran) { log('Tests SKIPPED (runner unavailable) — must run before merge.'); result.skipped.push('test-lint'); break }
      if (test.passed) { log(`Tests green on attempt ${i}.`); break }
      log(`Test attempt ${i} failed: ${test.summary}`)
      if (i === MAX) {
        log(`Test attempt ${i}: tests still failing after max attempts.`)
        escalate('build', `unresolved test failures after ${MAX} attempts: ${(test.failures || []).map((f) => f.test).join('; ') || test.summary}`)
        break
      }
      // reconcile: re-run the build pair — only the fixer(s) whose domain test-runner confidently implicated;
      // both (today's behavior) whenever attribution is mixed, unknown, or absent.
      const fx = `${CTX}\nThe tests failed. Fix ONLY what's needed, faithful to ${PHASE_DIR}/code-design.md, within your domain. Then stop; the harness re-runs tests.\nFailures:\n${JSON.stringify(test.failures, null, 2)}`
      const domains = fixDomains(test.failures)
      const fixers = []
      if (domains.includes('code')) fixers.push(() => agent(`${fx}\n(You are CODE — fix implementation bugs only.)`, { agentType: 'workflow:implementer', model: M.code, phase: 'Test', label: `fix-code #${i}:${SCOPE}`, schema: GATE_SCHEMA }))
      if (domains.includes('test')) fixers.push(() => agent(`${fx}\n(You are TESTS — fix test bugs only.)`, { agentType: 'workflow:test-author', model: M.test, phase: 'Test', label: `fix-tests #${i}:${SCOPE}`, schema: GATE_SCHEMA }))
      await parallel(fixers)
    }
    result.testsVerified = !!(test && test.ran && test.passed)
    result.stageGates['test-lint'] = test
  }
}

// ============ REVIEW (opus; commits on pass; bounded fix loop) ============
let review = null
if (todo('review') && !result.escalation) {
  phase('Review')
  const RUN = `${CTX}\nStrict senior review. Inspect \`git -C ${WORKDIR} diff ${BASE_REF} -- ${APP_DIR}\` plus new untracked files. Judge: (1) no regressions/bugs, (2) every spec + code-design criterion met. Write ${PHASE_DIR}/review.md. If clean, COMMIT the change (stage only this change's files — the code/test/doc files${SPEC_CLAUSE}, including any ADR noted in code-design.md/architecture.md — never \`.workflow/\`${CANON_CLAUSE}, never unrelated edits). If a fix is a design decision, set escalate=true.`
  // After a fix round, re-check ONLY the fixed findings instead of a full re-review — the first pass already
  // derived the spec/scenario coverage map, and the harness already re-runs tests below.
  const verifyRun = (crits) => `${CTX}\nFocused re-check, not a full review: a fix was applied for the CRITICAL findings below. Re-inspect only the touched files/lines in \`git -C ${WORKDIR} diff ${BASE_REF} -- ${APP_DIR}\` to confirm each is actually resolved and the fix didn't introduce an obvious new critical nearby. Do not re-derive the full spec/scenario coverage map — the first pass already did that. Write ${PHASE_DIR}/review.md. If resolved, COMMIT the change (stage only this change's files — the code/test/doc files${SPEC_CLAUSE}, including any ADR noted in code-design.md/architecture.md — never \`.workflow/\`${CANON_CLAUSE}, never unrelated edits). If a fix is a design decision, set escalate=true.\nFindings to verify:\n${JSON.stringify(crits, null, 2)}`
  const MAX = 2
  let prevCriticals = null
  for (let i = 1; i <= MAX; i++) {
    const prompt = prevCriticals ? verifyRun(prevCriticals) : RUN
    review = await agent(prompt, { agentType: 'workflow:reviewer', model: M.review, phase: 'Review', label: `review #${i}:${SCOPE}`, schema: REVIEW_SCHEMA })
    result.openFindings = (review && review.findings) || []
    if (review && review.committed) result.committed = true
    const criticals = ((review && review.findings) || []).filter((f) => f.severity === 'critical')
    if (review && review.escalate) { escalate('code-design', review.summary || 'review needs a design decision'); break }
    if (!criticals.length) { log(`Review #${i}: clean.`); break }
    if (i === MAX) { log(`Review #${i}: ${criticals.length} critical finding(s) remain after max attempts.`); escalate('build', `unresolved critical findings: ${criticals.map((c) => c.title).join('; ')}`); break }
    log(`Review #${i}: ${criticals.length} critical — applying fixes.`)
    await agent(`${CTX}\nApply fixes for these CRITICAL findings, minimal and faithful to ${PHASE_DIR}/code-design.md. Then stop.\n${JSON.stringify(criticals, null, 2)}`,
      { agentType: 'workflow:implementer', model: M.code, phase: 'Review', label: `review-fix #${i}:${SCOPE}`, schema: GATE_SCHEMA })
    if (TEST_CMD && result.testsVerified) {
      const RERUN_INSTR = IS_PEEL
        ? 'This repo uses peel. Re-determine which peel targets apply (same scoping as before) and re-run them together in ONE `peel test -t ...` invocation'
        : `Re-run \`${TEST_CMD}\``
      const t = await agent(`${CTX}\n${RERUN_INSTR} after the fix; write ${PHASE_DIR}/test-lint.md.${PEEL_NOTE}`,
        { agentType: 'workflow:test-runner', model: M.run, phase: 'Review', label: `re-test #${i}:${SCOPE}`, schema: TEST_SCHEMA })
      if (t && t.ran && !t.passed) {
        const tDomains = fixDomains(t.failures)
        const reFixers = []
        if (tDomains.includes('code')) reFixers.push(() => agent(`${CTX}\nFix failing tests within your (CODE) domain.\n${JSON.stringify(t.failures, null, 2)}`, { agentType: 'workflow:implementer', model: M.code, phase: 'Review', label: `re-fix-code #${i}`, schema: GATE_SCHEMA }))
        if (tDomains.includes('test')) reFixers.push(() => agent(`${CTX}\nFix failing tests within your (TESTS) domain.\n${JSON.stringify(t.failures, null, 2)}`, { agentType: 'workflow:test-author', model: M.test, phase: 'Review', label: `re-fix-tests #${i}`, schema: GATE_SCHEMA }))
        await parallel(reFixers)
      }
    }
    prevCriticals = criticals
  }
  result.stageGates.review = review
}

// Don't ship the PR unless the change is review-clean AND committed (or review already passed in a prior run),
// and we're not escalating. clean-but-not-committed must NOT proceed to a PR on uncommitted code.
const reviewPassed = !result.escalation && (todo('review')
  ? !!(review && review.clean && review.committed)
  : true)
if (todo('review') && review && review.clean && !review.committed) {
  log('Review clean but commit did NOT happen — holding the PR. Investigate before shipping.')
}

// ============ PR (draft, authors its own QA section) ============
if (todo('pr') && reviewPassed) {
  phase('PR')
  const COMMIT_NOTE = result.committed
    ? `First ensure every file of this change is committed — if any change files are still uncommitted, commit them now (scoped to this change's code/test/doc files${SPEC_CLAUSE}; never \`.workflow/\`${CANON_CLAUSE}, never unrelated edits). Then `
    : `Nothing has been committed yet (the review stage was skipped). FIRST commit this change yourself — stage only this change's code/test/doc files${SPEC_CLAUSE} (never \`.workflow/\`${CANON_CLAUSE}, never \`git add -A\`, never unrelated edits) and commit with a concise why-focused message (no Claude attribution). Then `
  const pr = await agent(`${CTX}\n(Override: the PR stage writes NO file — return opened+committed+url as your structured output.)\n${COMMIT_NOTE}push the branch and open a DRAFT PR against main using the repo's pull_request_template.md. Why-first description; changes in plain English (no file paths); decide and write your own manual-QA section per your instructions.`,
    { agentType: 'workflow:pr-author', model: M.pr, phase: 'PR', label: `pr:${SCOPE}`, schema: PR_SCHEMA })
  if (pr && pr.committed) result.committed = true
  if (pr && pr.opened) { result.prUrl = pr.url || null; log(`Draft PR: ${pr.url || '(opened)'}`) }
  result.stageGates.pr = pr
}

// ============ COMMIT (redo-only: land re-built code without a PR rewrite) ============
// For iteration: re-implement against an amended spec, then push to the existing draft PR without re-running
// review or rewriting the PR body. Inert when `pr` ran (it already committed) or when nothing was selected.
if (todo('commit') && !todo('pr') && reviewPassed && !result.committed) {
  phase('Commit')
  const c = await agent(`${CTX}\n(Override: write NO file — return your \`## GATE\` as structured output.)\nCommit and push ONLY this change's code/test/doc files${SPEC_CLAUSE} (never \`.workflow/\`${CANON_CLAUSE}, never \`git add -A\`, never unrelated edits). Use a concise why-focused message (no Claude attribution), then push the branch. Do NOT open, edit, or touch any pull request — an existing draft PR picks up the push on its own.`,
    { agentType: 'workflow:pr-author', model: M.pr, phase: 'Commit', label: `commit:${SCOPE}`, schema: GATE_SCHEMA })
  if (c && c.gate === 'pass') { result.committed = true; log('Committed + pushed (no PR rewrite).') }
  result.stageGates.commit = c
}

if (!result.escalation && !result.committed && !result.prUrl) {
  log('Light build complete — changes are in the working tree, uncommitted (no review, PR, or commit ran). Review, commit, and run /workflow:archive when ready.')
}
if (result.escalation) log(`ESCALATION → ${result.escalation.returnTo}: ${result.escalation.reason}`)
return result
