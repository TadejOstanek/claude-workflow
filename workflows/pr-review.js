export const meta = {
  name: 'pr-review',
  description: 'Standalone adversarial PR review: parallel finder dimensions (spec-satisfaction, correctness, conventions, concurrency) → per-finding adversarial verify (drop REFUTED) → dedup + rank. Reviews an arbitrary GitHub PR from an isolated worktree; never edits or commits.',
  phases: [
    { title: 'Finders', detail: 'parallel dimension finders over the PR diff (spec dim skipped if the PR has no OpenSpec change)', model: 'opus + sonnet' },
    { title: 'Verify', detail: 'one adversarial verifier per finding — CONFIRMED / PLAUSIBLE / REFUTED; drop REFUTED', model: 'sonnet' },
    { title: 'Synthesis', detail: 'dedup near-duplicates across dimensions + overall summary', model: 'opus' },
  ],
}

// ---------- args (from /workflow:review-pr, which has filesystem + gh access) ----------
let A = args
if (typeof A === 'string') { try { A = JSON.parse(A) } catch (_e) { A = {} } }
A = A || {}

const PR = A.prNumber
const TITLE = A.title || `PR #${PR}`
const URL = A.url || ''
const WORKDIR = A.workdir || '.'          // the PR checkout (a git worktree) — run all git/read/test here
const BASE_REF = A.baseRef || 'main'      // the PR's actual base branch — never assume main
const HEAD_SHA = A.headSha || 'HEAD'
const REPO = A.repo || ''                 // owner/repo of the base
const SPEC_TARGETS = Array.isArray(A.specTargets) ? A.specTargets : []
const HAS_SPEC = SPEC_TARGETS.length > 0
const TEST_CMD = A.testCmd || null        // best-effort; the finders may run it, never required

// Models are set BOTH inline here and in each agent's frontmatter, so the per-stage model holds even if plugin
// agentType namespace resolution degrades to the default workflow agent.
const M = { spec: 'opus', find: 'sonnet', verify: 'sonnet', synth: 'opus' }

const SEV_RANK = { critical: 0, major: 1, minor: 2, nit: 3 }

// ---------- schemas ----------
const FINDING_ITEM = {
  type: 'object', additionalProperties: false,
  required: ['severity', 'file', 'title', 'detail'],
  properties: {
    severity: { type: 'string', enum: ['critical', 'major', 'minor', 'nit'] },
    file: { type: 'string' },
    line: { type: 'integer', description: 'start line of the finding in the file at PR head' },
    endLine: { type: 'integer', description: 'end line (same as line for a single-line finding)' },
    title: { type: 'string' },
    detail: { type: 'string', description: 'the concrete failure: input/state → wrong outcome' },
    scenario: { type: 'string', description: 'spec dimension only: the #### Scenario this maps to' },
  },
}
const FINDER_SCHEMA = {
  type: 'object', additionalProperties: false,
  required: ['dimension', 'summary', 'findings'],
  properties: {
    dimension: { type: 'string', enum: ['spec', 'correctness', 'conventions', 'concurrency'] },
    summary: { type: 'string' },
    findings: { type: 'array', items: FINDING_ITEM },
  },
}
const VERDICT_SCHEMA = {
  type: 'object', additionalProperties: false,
  required: ['verdict', 'rationale'],
  properties: {
    verdict: { type: 'string', enum: ['CONFIRMED', 'PLAUSIBLE', 'REFUTED'] },
    rationale: { type: 'string' },
    adjustedSeverity: { type: 'string', enum: ['critical', 'major', 'minor', 'nit'] },
  },
}
const SYNTH_SCHEMA = {
  type: 'object', additionalProperties: false,
  required: ['summary', 'keepIds'],
  properties: {
    summary: { type: 'string', description: '2-3 sentence overview of the review' },
    keepIds: { type: 'array', items: { type: 'string' }, description: 'ids of findings to keep after dropping near-duplicates' },
  },
}

// ---------- shared prompt context ----------
const CTX = `Reviewing GitHub PR #${PR} — "${TITLE}"${URL ? ` (${URL})` : ''}.
The PR is checked out at: ${WORKDIR}  — run all git/read/test commands there.
The PR's changeset is the THREE-DOT diff: \`git -C ${WORKDIR} diff ${BASE_REF}...HEAD\` (against its base "${BASE_REF}").
Read full files under ${WORKDIR} for context; review only lines this PR modified/added and their direct consequences.
${TEST_CMD ? `Optional: the repo's tests can be run with \`${TEST_CMD}\` (from ${WORKDIR}) — best-effort; deps may be missing, so treat a non-run as a skip, not a failure.` : 'No test command was detected — do not run tests.'}`

// ============ FINDERS (parallel) ============
phase('Finders')
log(`Reviewing PR #${PR}: ${HAS_SPEC ? SPEC_TARGETS.length + ' spec target(s) + ' : 'no OpenSpec change — '}3 general dimensions`)

const DIMENSIONS = [
  { key: 'correctness', focus: 'CORRECTNESS: logic errors, edge cases, error handling, null/boundary, API misuse, migration correctness. Be adversarial about invariants and data integrity.' },
  { key: 'conventions', focus: 'CONVENTIONS: repo conventions (name the canonical file you compared against), any CLAUDE.md in the touched dirs, naming, structure, dead/duplicated code.' },
  { key: 'concurrency', focus: 'CONCURRENCY & DATA INTEGRITY: races, locking, transaction boundaries, atomicity, idempotency, migration ordering/back-compat. (Do not repeat plain logic bugs — that is the correctness dimension.)' },
]

const finderThunks = []
if (HAS_SPEC) {
  for (const t of SPEC_TARGETS) {
    const label = t.changeId || t.capability || 'spec'
    finderThunks.push(() => agent(
      `${CTX}\nAudit SPEC-SATISFACTION for the OpenSpec spec target at ${t.specDir} (specRoot: ${t.specRoot}${t.changeId ? `, change id: ${t.changeId}` : ''}). Read its spec files, parse the scenarios, and verify this PR's code+tests satisfy every one (variant b — there is no code-design.md). Tag each finding's \`scenario\`.`,
      { agentType: 'workflow:spec-auditor', model: M.spec, phase: 'Finders', label: `spec:${label}`, schema: FINDER_SCHEMA }))
  }
}
for (const d of DIMENSIONS) {
  finderThunks.push(() => agent(
    `${CTX}\nYou are the ${d.key.toUpperCase()} finder. ${d.focus}\nReturn structured findings for the "${d.key}" dimension only.`,
    { agentType: 'workflow:pr-reviewer', model: M.find, phase: 'Finders', label: `find:${d.key}`, schema: FINDER_SCHEMA }))
}

const finderResults = (await parallel(finderThunks)).filter(Boolean)

// Flatten into a single list with stable ids the script owns (never trust the model to echo them).
let n = 0
const findings = []
for (const r of finderResults) {
  for (const f of (r.findings || [])) {
    findings.push({ ...f, dimension: r.dimension, id: `F${++n}` })
  }
}
log(`Finders surfaced ${findings.length} candidate finding(s).`)

// ============ VERIFY (parallel — one refutation-seeking verifier per finding) ============
let survivors = []
if (findings.length) {
  phase('Verify')
  const verdicts = await parallel(findings.map((f) => () => agent(
    `${CTX}\nAdversarially VERIFY this finding — try to refute it; default to skepticism. Return CONFIRMED / PLAUSIBLE / REFUTED.\nFinding (${f.dimension}, severity ${f.severity}):\n${JSON.stringify({ file: f.file, line: f.line, title: f.title, detail: f.detail, scenario: f.scenario }, null, 2)}`,
    { agentType: 'workflow:pr-reviewer', model: M.verify, phase: 'Verify', label: `verify:${f.id}`, schema: VERDICT_SCHEMA })))

  // parallel() preserves order → zip verdicts back onto findings.
  findings.forEach((f, i) => {
    const v = verdicts[i]
    if (!v || v.verdict === 'REFUTED') return                 // drop refuted (and dead verifiers)
    let severity = v.adjustedSeverity || f.severity
    // PLAUSIBLE can never block a merge: demote critical → major, tag as possible.
    const possible = v.verdict === 'PLAUSIBLE'
    if (possible && severity === 'critical') severity = 'major'
    survivors.push({ ...f, severity, possible, verifyNote: v.rationale })
  })
  log(`${survivors.length} finding(s) survived verification (${findings.length - survivors.length} refuted).`)
}

// ============ SYNTHESIS (opus — dedup near-duplicates + overall summary) ============
let summary = survivors.length ? '' : 'No issues survived verification.'
let kept = survivors
if (survivors.length > 1) {
  phase('Synthesis')
  const synth = await agent(
    `${CTX}\nSynthesize this PR review. Below are the verified findings (CONFIRMED + PLAUSIBLE). Drop only NEAR-DUPLICATES (same underlying issue surfaced by more than one dimension) by omitting their ids from keepIds; keep everything else. Also write a 2-3 sentence overall \`summary\`.\nFindings:\n${JSON.stringify(survivors.map((f) => ({ id: f.id, dimension: f.dimension, severity: f.severity, file: f.file, title: f.title })), null, 2)}`,
    { agentType: 'workflow:pr-reviewer', model: M.synth, phase: 'Synthesis', label: `synth:pr-${PR}`, schema: SYNTH_SCHEMA })
  if (synth) {
    summary = synth.summary || summary
    const keep = new Set(synth.keepIds || survivors.map((f) => f.id))
    kept = survivors.filter((f) => keep.has(f.id))
  }
}

// Rank mechanically (never trust the model to sort) and compute clean from the final list.
kept.sort((a, b) => (SEV_RANK[a.severity] - SEV_RANK[b.severity]))
const clean = !kept.some((f) => f.severity === 'critical' && !f.possible)

return {
  pr: PR, url: URL, baseRef: BASE_REF, headSha: HEAD_SHA, repo: REPO,
  specAudited: HAS_SPEC, specTargets: SPEC_TARGETS.map((t) => t.changeId || t.capability),
  testsAvailable: !!TEST_CMD,
  clean, summary,
  candidateCount: findings.length,
  findings: kept.map((f) => ({
    severity: f.severity, dimension: f.dimension, file: f.file, line: f.line, endLine: f.endLine,
    title: f.title, detail: f.detail, scenario: f.scenario, possible: !!f.possible,
  })),
}
