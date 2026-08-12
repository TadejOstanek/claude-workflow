export const meta = {
  name: 'insights',
  description: 'Analyzes one change (or a whole epic): process-quality insights (review efficacy, design-doc accuracy, gate friction/rework), cost/token stats via the session-report plugin scoped to exactly those sessions, and explicit learnings extraction into project memory.',
  phases: [
    { title: 'Cost + Quality', detail: "scope this change's (or epic's) sessions and run the session-report analyzer, in parallel with process-quality analysis", model: 'sonnet + opus' },
    { title: 'Learnings', detail: 'draft durable feedback/project memories informed by Cost+Quality, and write them if instructed', model: 'sonnet' },
  ],
}

// ---------- args (from /workflow:insights, which has filesystem + git access) ----------
let A = args
if (typeof A === 'string') { try { A = JSON.parse(A) } catch (_e) { A = {} } }
A = A || {}

const FEATURE = A.feature || ''
const SCOPE = A.scope === 'epic' ? 'epic' : 'single-change'
const CHANGES = Array.isArray(A.changes) ? A.changes : []
const REPORT_DIR = A.reportDir || '.'
const REPO_ROOT = A.repoRoot || '.'
const MODE = A.mode === 'exact' ? 'exact' : 'approximate'
const SESSION_IDS = Array.isArray(A.sessionIds) ? A.sessionIds : []
const WINDOW_START = A.windowStart || null
const WINDOW_END = A.windowEnd || null
const WRITE_MEMORY = !!A.writeMemory

const M = { cost: 'sonnet', quality: 'opus', learnings: 'sonnet' }

// ---------- schemas ----------
const COST_SCHEMA = {
  type: 'object', additionalProperties: false,
  required: ['mode', 'notes', 'sessionCount', 'subagentCount', 'tokens', 'cacheHitPct', 'apiCalls', 'summary'],
  properties: {
    mode: { type: 'string', enum: ['exact', 'approximate'] },
    notes: { type: 'array', items: { type: 'string' } },
    sessionCount: { type: 'integer' },
    subagentCount: { type: 'integer' },
    tokens: {
      type: 'object', additionalProperties: false,
      required: ['inputUncached', 'cacheCreate', 'cacheRead', 'output'],
      properties: {
        inputUncached: { type: 'integer' }, cacheCreate: { type: 'integer' },
        cacheRead: { type: 'integer' }, output: { type: 'integer' },
      },
    },
    cacheHitPct: { type: 'number' },
    apiCalls: { type: 'integer' },
    wallClockHours: { type: 'number' },
    activeHours: { type: 'number' },
    htmlReportPath: { type: 'string', description: 'absolute path to the saved scoped session-report HTML, or empty if the session-report plugin was not found' },
    summary: { type: 'string' },
  },
}
const QUALITY_FINDING = {
  type: 'object', additionalProperties: false,
  required: ['area', 'severity', 'summary', 'evidence'],
  properties: {
    area: { type: 'string', enum: ['review-efficacy', 'design-doc-accuracy', 'gate-friction', 'rework', 'other'] },
    severity: { type: 'string', enum: ['critical', 'major', 'minor', 'nit'] },
    summary: { type: 'string' },
    evidence: { type: 'string', description: 'the concrete file/transition/transcript excerpt this is based on' },
  },
}
const QUALITY_SCHEMA = {
  type: 'object', additionalProperties: false,
  required: ['perChange', 'suggestions'],
  properties: {
    perChange: {
      type: 'array',
      items: {
        type: 'object', additionalProperties: false,
        required: ['slug', 'findings', 'reworkCount', 'gateFailCount'],
        properties: {
          slug: { type: 'string' },
          findings: { type: 'array', items: QUALITY_FINDING },
          reworkCount: { type: 'integer' },
          gateFailCount: { type: 'integer' },
        },
      },
    },
    suggestions: { type: 'array', items: { type: 'string' } },
  },
}
const LEARNINGS_SCHEMA = {
  type: 'object', additionalProperties: false,
  required: ['memories', 'amended', 'skippedReason'],
  properties: {
    memories: {
      type: 'array',
      items: {
        type: 'object', additionalProperties: false,
        required: ['slug', 'type', 'description', 'indexHook'],
        properties: {
          slug: { type: 'string' },
          type: { type: 'string', enum: ['feedback', 'project', 'reference', 'user'] },
          description: { type: 'string' },
          indexHook: { type: 'string', description: 'the one-line MEMORY.md pointer text' },
        },
      },
    },
    amended: { type: 'array', items: { type: 'string' }, description: 'slugs of existing memory files amended instead of duplicated' },
    skippedReason: { type: 'string', description: 'empty if nothing was skipped' },
  },
}

// ---------- shared prompt context ----------
const changeList = CHANGES.map((c) => `${c.slug} ("${c.title}") — files under ${c.phaseDir}${c.changeDir ? `, OpenSpec change at ${c.changeDir}` : ''}`).join('\n')
const CTX = `Analyzing ${SCOPE === 'epic' ? `the WHOLE EPIC "${FEATURE}"` : `change "${CHANGES[0]?.slug}"`} in repo ${REPO_ROOT}.
Changes in scope:
${changeList}
Session scoping mode: ${MODE}${MODE === 'approximate' ? ` (no reliable per-session attribution — use the time window ${WINDOW_START} to ${WINDOW_END} instead; note this is approximate and may include unrelated work)` : ` (exact session ids: ${SESSION_IDS.join(', ') || 'none recorded'})`}.`

// ============ COST + QUALITY (parallel) ============
phase('Cost + Quality')
log(`Analyzing ${SCOPE === 'epic' ? `epic "${FEATURE}" (${CHANGES.length} changes)` : `change "${CHANGES[0]?.slug}"`} — mode: ${MODE}`)

const COST_PROMPT = `${CTX}
You are playing the Cost role. Locate the session-report plugin's \`analyze-sessions.mjs\` at runtime — search under
\`~/.claude/plugins/**/session-report/**\` (never hardcode a version/path segment; if you can't find it, return
mode:"${MODE}" with a note explaining the plugin isn't installed and all-zero token fields).
Build a symlink farm containing ONLY the sessions in scope, never point --dir at the live ~/.claude/projects tree
directly:
  - exact mode: symlink these session ids' main transcripts and their subagents/ files:
    ${SESSION_IDS.join(', ') || '(none)'}
    under \`~/.claude/projects/<project-slug>/\` where <project-slug> is ${REPO_ROOT} with "/" replaced by "-"
    (confirm the exact slugification empirically against a real dir under ~/.claude/projects before trusting it).
  - approximate mode: list every top-level *.jsonl file in that real project dir, keep the ones whose first/last
    timestamp overlaps [${WINDOW_START}, ${WINDOW_END}] (±1 day buffer), and symlink those (+ their subagents/).
  - Symlink INDIVIDUAL .jsonl files, not whole directories (directory-symlink traversal isn't reliably followed
    cross-platform). Clean up the temp dir on every exit path, including on error.
Run \`node <analyzer> --dir <tmpdir> --json\`. Then copy that plugin's \`template.html\` and, using Edit (not Write,
to preserve its JS/CSS), inject the JSON into the \`<script id="report-data">\` tag and fill the
\`<!-- AGENT: anomalies -->\` / \`<!-- AGENT: optimizations -->\` blocks with 3-5 one-line findings and 1-4
callouts (same format the session-report skill itself uses). Save the result to
\`${REPORT_DIR}/session-report-<date>.html\`.
Return COST_SCHEMA. If you had to fall back partway (e.g. plugin missing), set mode accordingly and explain in notes.`

const QUALITY_PROMPT = `${CTX}
You are playing the Quality role. Apply the \`workflow:review-standards\` skill for severity vocabulary. For EACH
change listed above, derive — from its actual \`.workflow/\` files, its real \`git diff\` against main, and this
workflow's \`transitions\` log — findings nothing else in this ecosystem currently reports:
- review-efficacy: how many review/fix rounds did this change need (count revisions to review.md, and any
  review-fix loop visible in its session transcripts)? Were the findings design-level (should have been caught at
  code-design) or implementation slips?
- design-doc-accuracy: does code-design.md's stated interfaces/behaviors match the real diff? Was code-design.md
  itself revised mid-build (a sign it under-specified)?
- gate-friction / rework: scan this change's transitions for a stage sent backward (done -> pending/failed) or
  re-run; name the stage and the apparent cause.
Return one perChange entry per change (even for scope:"single-change", where there's exactly one), plus epic-wide
suggestions when there's more than one change in scope. Ground every finding's evidence in a real file, transition,
or transcript excerpt — never speculate.`

const [cost, quality] = await parallel([
  () => agent(COST_PROMPT, { agentType: 'insights', model: M.cost, phase: 'Cost + Quality', label: `cost:${FEATURE}`, schema: COST_SCHEMA }),
  () => agent(QUALITY_PROMPT, { agentType: 'insights', model: M.quality, phase: 'Cost + Quality', label: `quality:${FEATURE}`, schema: QUALITY_SCHEMA }),
])

// ============ LEARNINGS ============
phase('Learnings')
const LEARNINGS_PROMPT = `${CTX}
You are playing the Learnings role. Read the in-scope sessions' transcripts directly for explicit user corrections,
confirmations, or non-obvious decisions made during this work — not code. Combine with these summaries:
Cost: ${cost ? cost.summary : '(cost analysis unavailable)'}
Quality suggestions: ${quality ? JSON.stringify(quality.suggestions) : '(quality analysis unavailable)'}
Draft ONLY feedback/project/reference/user-type memories — never a code pattern, git-history fact, or anything
re-derivable by reading the repo. Check \`~/.claude/projects/<project-slug>/memory/MEMORY.md\` and its files for a
near-duplicate before proposing a new one; prefer amending an existing file (a dated addendum, like this repo's own
memory files do) over creating a near-duplicate.
${WRITE_MEMORY
    ? 'writeMemory is TRUE: actually write the approved memory files (frontmatter: name, description, metadata: {node_type: memory, type, originSessionId: THIS session\'s own $CLAUDE_CODE_SESSION_ID — not one of the analyzed sessions}) plus their MEMORY.md pointer lines, then return what you wrote.'
    : 'writeMemory is FALSE: DO NOT write anything. Only draft and return the proposed memories/amendments — the command will show them to the user, who can re-run with --write-memory to persist.'}
Return LEARNINGS_SCHEMA. If there's nothing durable/non-obvious to capture, return empty memories/amended and set skippedReason.`

const learnings = await agent(LEARNINGS_PROMPT, { agentType: 'insights', model: M.learnings, phase: 'Learnings', label: `learnings:${FEATURE}`, schema: LEARNINGS_SCHEMA })

return { feature: FEATURE, scope: SCOPE, mode: MODE, writeMemory: WRITE_MEMORY, cost, quality, learnings }
