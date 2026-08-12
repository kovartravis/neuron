import { NeuronMemory, GitLogHit } from '../index.js';
import { loadConfig, resolveExecCategories } from '../config/neuronYaml.js';
import { withTimeout } from '../components/timeout.js';
import { blueprintCardId, moduleCardId, parseModuleListFromIndex } from '../scanner/ingest.js';
import { compressArchitectureCard } from '../scanner/compressCard.js';
import {
  buildPayload,
  buildDiscoveryHint,
  filterUnseen,
  loadEpochState,
  remainingEpochBudget,
  recordSessionStartInjection,
  recordPrePromptTurn,
  rollEpoch,
  recordFired,
  recordHintFired,
  recordToolUse,
  summarizeRecallCost,
  buildZeroSessionsWarning,
  SESSION_START_CHAR_BUDGET,
  PRE_PROMPT_CHAR_BUDGET,
  GIT_LOG_CHAR_BUDGET,
  PRE_COMMAND_CHAR_BUDGET,
  LifecyclePoint,
} from '../harnesses/index.js';

/** Extracts the exact suggested command from a `buildDiscoveryHint` line — everything after `run: `. */
function hintCommand(hint: string): string {
  const idx = hint.indexOf('run: ');
  return idx === -1 ? hint : hint.slice(idx + 'run: '.length);
}

interface CardPayload {
  text: string;
  includedIds: string[];
}

/**
 * The architecture card, fetched two ways and combined (ticket 25): first by
 * its stable scan id (`blueprintCardId`), so it survives category crowding —
 * a generic ranked query can rank it out of a `limit`-sized window once
 * enough other entries share the category, exactly `ingest.ts`'s own comment
 * warns about, and exactly what this repo's own `scan.category: decisions`
 * config reproduces. Structurally compressed to `cap` if it exceeds it
 * (ticket 27/30, `compressArchitectureCard`) — every module-list line gets
 * a chance to appear, in order, rather than truncating raw text at whatever
 * byte offset the budget happens to land on. Whatever budget is left after
 * the card goes to the existing top-N-in-category query, additive, since a
 * category shared with general decision-log content (this repo's own
 * setup) is a deliberate config choice, not a bug to route around — but
 * (ticket 30) that query also matches real per-module detail cards, which
 * share the same category and tags as the index post-28. Left unfiltered, a
 * module card rides along on every `session-start` injection regardless of
 * relevance, reproduced live against this repo's own store (the `ui`
 * module's full card riding along on a plain `session-start` call with no
 * prompt in play at all) — exactly the unconditional per-module detail this
 * ticket's index/module split exists to avoid. So the additive query
 * excludes every module card belonging to this index, not just the index's
 * own id: module detail surfaces only through the *pre-prompt* relevance
 * query (the reused-recall design), never through this always-on one.
 */
async function fetchArchitectureCardPayload(memory: NeuronMemory, category: string, cap: number): Promise<CardPayload> {
  if (cap <= 0) return { text: '', includedIds: [] };

  const parts: string[] = [];
  const includedIds: string[] = [];
  let remaining = cap;

  const blueprint = await memory.findById(blueprintCardId(category));
  const moduleIds = blueprint
    ? new Set(parseModuleListFromIndex(blueprint.content).map(m => moduleCardId(category, m.path)))
    : new Set<string>();
  if (blueprint) {
    const prefix = `- [${blueprint.category}] `;
    const budget = Math.max(0, remaining - prefix.length);
    const compressed = compressArchitectureCard(blueprint.content, budget);
    const chunk = compressed ? `${prefix}${compressed}` : '';
    if (chunk.length > 0) {
      parts.push(chunk);
      includedIds.push(blueprint.id);
      remaining = Math.max(0, remaining - chunk.length - 1);
    }
  }

  if (remaining > 0) {
    const results = await memory.query({ categories: [category], limit: 4 });
    const filtered = results.filter(r => r.id !== blueprint?.id && !moduleIds.has(r.id));
    const built = buildPayload(filtered, remaining);
    if (built.includedIds.length > 0) {
      parts.push(built.text);
      includedIds.push(...built.includedIds);
    }
  }

  return { text: parts.join('\n'), includedIds };
}

/** Mirrors `benchmarks/token-ab/gitlog-search.mjs`'s prototype constants — ticket 39 (neuron-2.3.0) item 5 left the exact numbers to this ticket, not a structural ruling. */
const GIT_LOG_MAX_COMMITS = 6;
const GIT_LOG_BODY_CHARS = 240;

function formatGitLogHit(hit: GitLogHit): string {
  const shortHash = hit.hash.slice(0, 8);
  const trimmedBody = hit.body.length > GIT_LOG_BODY_CHARS ? `${hit.body.slice(0, GIT_LOG_BODY_CHARS)}...` : hit.body;
  const bodyLine = trimmedBody ? `\n  ${trimmedBody.replace(/\n+/g, ' ')}` : '';
  return `- \`${shortHash}\` ${hit.subject}${bodyLine}`;
}

/**
 * Packs gated git-log hits (already ranked by `searchGitLog`) into `charBudget`
 * characters, header included — mirrors `buildPayload`'s drop-whole-entries
 * discipline. Returns empty when nothing fits or nothing was passed in: ticket
 * 39 item 6 rules silence over a hedge-with-nothing message when the gate
 * finds nothing relevant, so there is no "no matches" branch here, unlike the
 * prototype's `formatGitLogNote`.
 */
function buildGitLogPayload(hits: GitLogHit[], charBudget: number): { text: string; includedIds: string[] } {
  const header =
    '## Git History\n\nRelevant commits from this repository\'s history — may be incomplete, and ticket ' +
    'numbers can collide across concurrent wayfinder maps (ticket 39, neuron-2.3.0); verify against `git ' +
    'log`/`git show` yourself:';
  if (charBudget <= header.length) return { text: '', includedIds: [] };

  const includedIds: string[] = [];
  const lines: string[] = [];
  let used = header.length + 1;
  for (const hit of hits) {
    const line = formatGitLogHit(hit);
    const cost = line.length + 1;
    if (used + cost > charBudget) continue;
    lines.push(line);
    includedIds.push(hit.hash);
    used += cost;
  }
  if (lines.length === 0) return { text: '', includedIds: [] };
  return { text: `${header}\n${lines.join('\n')}`, includedIds };
}

/**
 * Bounds how long a hung query can hold up the user's turn. Well under the
 * harness's own documented ceilings (`claudeCode.ts`'s `HOOK_TIMEOUT_SECONDS`
 * is the outer, harness-enforced bound; this is neuron's own inner one, so a
 * slow embedder degrades the turn by single-digit seconds rather than the
 * harness's full budget).
 */
const HOOK_TIMEOUT_MS: Record<LifecyclePoint, number> = {
  'session-start': 15000,
  'pre-prompt': 8000,
  'context-reset': 3000,
  'pre-command': 8000,
};

const VALID_POINTS: LifecyclePoint[] = ['session-start', 'pre-prompt', 'context-reset', 'pre-command'];

/**
 * Claude Code and Codex share the same stdin fields (`session_id`, `prompt`)
 * and stdout contract (`hookSpecificOutput.additionalContext`), confirmed
 * for Codex via a direct fetch of its hooks docs during ticket 13. Copilot
 * CLI (ticket 01) shares the stdin fields but expects a flat
 * `{"additionalContext": "..."}` at the root instead — confirmed via a
 * direct fetch of its own hooks reference. Cursor (ticket 02) shares the
 * stdin fields too but expects a flat, **snake_case**
 * `{"additional_context": "..."}` at the root — a third distinct shape,
 * confirmed via a direct fetch of `cursor.com/docs/hooks` — so `emit()`
 * branches on harness id for the difference that matters each time.
 */
const VALID_HARNESSES = ['claude-code', 'codex', 'copilot', 'cursor'];

function readStdin(): Promise<string> {
  return new Promise(resolve => {
    if (process.stdin.isTTY) {
      resolve('');
      return;
    }
    let data = '';
    process.stdin.setEncoding('utf8');
    process.stdin.on('data', chunk => { data += chunk; });
    process.stdin.on('end', () => resolve(data));
    process.stdin.on('error', () => resolve(data));
  });
}

function emit(harness: string, hookEventName: string, additionalContext: string): void {
  if (harness === 'copilot') {
    process.stdout.write(JSON.stringify({ additionalContext }) + '\n');
    return;
  }
  if (harness === 'cursor') {
    process.stdout.write(JSON.stringify({ additional_context: additionalContext }) + '\n');
    return;
  }
  process.stdout.write(JSON.stringify({ hookSpecificOutput: { hookEventName, additionalContext } }) + '\n');
}

/**
 * The harness hook entrypoint (`neuron hook <harness> <point>`), invoked by
 * the harness itself, never by hand. Fail-safe by construction, per ADR
 * 0014: a hook that errors, hangs, or returns nothing must not break the
 * user's session, so every failure mode here degrades to "inject nothing"
 * rather than a non-zero exit — `UserPromptSubmit` treats exit 2 as blocking
 * the prompt entirely, which is exactly the wedged-harness failure this
 * command exists to never cause. Nothing in this function is allowed to
 * reject or throw past its own boundary.
 */
/** Ticket 07 (neuron-2.4.0)'s measurement instrument — deliberately not a `LifecyclePoint`; see `runPostToolUse`. */
const MEASUREMENT_POINT = 'post-tool-use';
const POST_TOOL_USE_TIMEOUT_MS = 3000;

export async function handleHookCommand(args: string[]): Promise<void> {
  const harness = args[1];
  const point = args[2];
  const projectDir = process.cwd();

  if (!VALID_HARNESSES.includes(harness)) return;

  if (point === MEASUREMENT_POINT) {
    try {
      await withTimeout(runPostToolUse(projectDir), POST_TOOL_USE_TIMEOUT_MS, `neuron hook ${harness} ${point}`);
    } catch {
      // Silent degrade: a missed measurement is never worth failing the tool call.
    }
    return;
  }

  if (!VALID_POINTS.includes(point as LifecyclePoint)) {
    return;
  }
  const lifecyclePoint = point as LifecyclePoint;

  // Recorded before any work that could fail, so verify()'s firing evidence
  // stays accurate even when the query below times out or throws.
  recordFired(projectDir, harness, lifecyclePoint);

  try {
    await withTimeout(
      runHook(projectDir, harness, lifecyclePoint),
      HOOK_TIMEOUT_MS[lifecyclePoint],
      `neuron hook ${harness} ${lifecyclePoint}`
    );
  } catch {
    // Silent degrade: no stdout means no injection; exit code stays 0.
  }
}

/**
 * Confirmed identical `tool_name`/`tool_input.command` stdin shape on both
 * Claude Code and Codex CLI (ticket 22, neuron-2.4.0, direct-fetch against
 * each harness's own hooks docs) — same fields `runPostToolUse` below
 * already reads for its own `Bash` check. Returns `undefined` for any other
 * tool (file edits, MCP calls, etc.), which every caller treats as a no-op.
 */
function extractBashCommand(input: Record<string, unknown>): string | undefined {
  const toolName = typeof input.tool_name === 'string' ? input.tool_name : undefined;
  const toolInput = input.tool_input && typeof input.tool_input === 'object' ? (input.tool_input as Record<string, unknown>) : undefined;
  const command = toolInput && typeof toolInput.command === 'string' ? toolInput.command : undefined;
  if (toolName !== 'Bash' || !command || !command.trim()) return undefined;
  return command;
}

/**
 * Ticket 07 (neuron-2.4.0): records whether a `Bash` tool call matches a
 * `neuron memory query` command, for `hintFollowLog.ts`'s analysis pass to
 * join against `fired` events by session id. Measurement-only — no
 * `LifecyclePoint` capability contract, no firing evidence, no
 * install()/verify() support, and never wired by `neuron init`. This repo's
 * own `.claude/settings.json` registers it by hand as a `PostToolUse` entry
 * matching `Bash`.
 */
async function runPostToolUse(projectDir: string): Promise<void> {
  const raw = await readStdin();
  let input: Record<string, unknown> = {};
  try {
    input = raw ? JSON.parse(raw) : {};
  } catch {
    input = {};
  }
  const sessionId = typeof input.session_id === 'string' ? input.session_id : undefined;
  const command = extractBashCommand(input);
  if (!sessionId || !command) return;
  recordToolUse(projectDir, sessionId, command);
}

async function runHook(projectDir: string, harness: string, point: LifecyclePoint): Promise<void> {
  const raw = await readStdin();
  let input: Record<string, unknown> = {};
  try {
    input = raw ? JSON.parse(raw) : {};
  } catch {
    input = {};
  }
  const sessionId = typeof input.session_id === 'string' ? input.session_id : undefined;

  if (point === 'context-reset') {
    // Execution-only (ADR 0014 §5): rolling the epoch is the entire job.
    if (sessionId) rollEpoch(projectDir, sessionId);
    return;
  }

  const config = loadConfig(projectDir);
  const epochCharBudget = config.recall.epochCharBudget;
  const memory = NeuronMemory.open(projectDir);
  try {
    if (point === 'session-start') {
      const category = config.scan?.category || 'architecture';

      // No session id means no epoch to budget against — degrade toward the
      // fixed per-injection cap alone, same as before ticket 07 (neuron-2.3.0).
      const cap = sessionId
        ? Math.min(SESSION_START_CHAR_BUDGET, remainingEpochBudget(projectDir, sessionId, epochCharBudget))
        : SESSION_START_CHAR_BUDGET;
      const { text: cardText, includedIds } = await fetchArchitectureCardPayload(memory, category, cap);

      // Ticket 21: a proactive session-start warning for the write-only-store
      // failure mode, distinct from `status --health`'s own opt-in report of
      // the same signal (ticket 20) — this fires unprompted, once per session,
      // rather than requiring a maintainer to run a command to notice it.
      const sessionsObserved = summarizeRecallCost(projectDir, epochCharBudget).sessionsObserved;
      const totalEntries = memory.getStatus().totalCount;
      const warningBudget = cap - (cardText ? cardText.length + 1 : 0);
      const warning = buildZeroSessionsWarning(sessionsObserved, totalEntries);
      const fittingWarning = warning && warning.length <= warningBudget ? warning : null;

      const text = [cardText, fittingWarning].filter(Boolean).join('\n');
      if (!text) return;
      if (sessionId) recordSessionStartInjection(projectDir, sessionId, includedIds, text.length);
      emit(harness, 'SessionStart', text);
      return;
    }

    if (point === 'pre-command') {
      // Non-Bash tool calls (file edits, MCP calls, etc.) are a no-op, not a
      // query — the ADR 0014 amendment's own scope is shell/bash commands
      // only, mirroring `neuron exec`'s CLI surface exactly.
      const command = extractBashCommand(input);
      if (!command) return;

      // Reuses `neuron exec`'s own category-matching/gated-query path
      // (`exec.ts`) verbatim — the hook is a second trigger for the same
      // lookup, not a second implementation of it. Deliberately no epoch/
      // ledger accounting (unlike session-start/pre-prompt): this fires per
      // tool call rather than per turn and has no ledger of its own to
      // dedupe or budget against yet.
      const { categories, limit } = resolveExecCategories(config, command);
      const { results } = await memory.queryGated({ text: command, categories, limit });
      const { text } = buildPayload(results, PRE_COMMAND_CHAR_BUDGET);
      if (!text) return;
      emit(harness, 'PreToolUse', text);
      return;
    }

    // point === 'pre-prompt'
    const prompt = typeof input.prompt === 'string' ? input.prompt : undefined;
    if (!prompt || !prompt.trim()) return;

    if (!sessionId) {
      // No session id means no ledger to dedupe or budget against — degrade
      // toward repetition (show everything every turn), never toward silence.
      const results = await memory.query({ text: prompt, limit: 10 });
      const { text: body } = buildPayload(results, PRE_PROMPT_CHAR_BUDGET);
      // Ticket 06: gap is measured against `results.length` — this turn's
      // gated, ranked recall before budget-packing — not the final injected
      // count, so a tight char budget doesn't get double-flagged (ticket 07
      // already surfaces that constraint on its own terms).
      const totalMatches = memory.countFtsMatches(prompt);
      const hintBudget = PRE_PROMPT_CHAR_BUDGET - (body ? body.length + 1 : 0);
      const hint = buildDiscoveryHint(prompt, totalMatches, results.length, hintBudget);
      const memoryText = hint ? (body ? `${body}\n${hint}` : hint) : body;

      // Ticket 08: pre-prompt only, keyed off the prompt's own embedding.
      // No ledger here either, so — same posture as the memory recall above —
      // a git-log hit can repeat every turn rather than being deduped.
      await memory.refreshGitLogIndex();
      const gitLogCap = Math.min(GIT_LOG_CHAR_BUDGET, PRE_PROMPT_CHAR_BUDGET - (memoryText ? memoryText.length + 1 : 0));
      const gitLogHits = gitLogCap > 0 ? await memory.searchGitLog(prompt, GIT_LOG_MAX_COMMITS) : [];
      const gitLogBody = buildGitLogPayload(gitLogHits, gitLogCap).text;

      const text = [memoryText, gitLogBody].filter(Boolean).join('\n\n');
      if (!text) return;
      emit(harness, 'UserPromptSubmit', text);
      return;
    }

    const remaining = remainingEpochBudget(projectDir, sessionId, epochCharBudget);
    if (remaining <= 0) {
      // Hard stop (ticket 07): this epoch's budget is already spent. Record
      // the turn — the per-turn cost rate needs silent turns in its
      // denominator too — but skip the query; nothing this turn could inject.
      recordPrePromptTurn(projectDir, sessionId, [], 0);
      return;
    }

    // Ticket 11: the architecture card is injected only at `session-start`,
    // which never fires again after a compaction — so re-inject it here, on
    // the first `pre-prompt` of each epoch (never from `context-reset`,
    // whose stdout isn't load-bearing on every harness). Reserving the
    // turn's normal allotment first means the card can only spend what the
    // turn wouldn't have used anyway.
    let cardBody = '';
    let cardIds: string[] = [];
    if (loadEpochState(projectDir, sessionId).turns === 0) {
      const category = config.scan?.category || 'architecture';
      const reserveForTurn = Math.min(PRE_PROMPT_CHAR_BUDGET, remaining);
      const cardCap = Math.min(SESSION_START_CHAR_BUDGET, remaining - reserveForTurn);
      if (cardCap > 0) {
        const built = await fetchArchitectureCardPayload(memory, category, cardCap);
        if (built.includedIds.length > 0) {
          cardBody = built.text;
          cardIds = built.includedIds;
        }
      }
    }

    const turnCap = Math.min(PRE_PROMPT_CHAR_BUDGET, remaining - cardBody.length);
    const results = await memory.query({ text: prompt, limit: 10 });
    const unseen = filterUnseen(projectDir, sessionId, results);
    const { text: turnBody, includedIds: turnIds } = buildPayload(unseen, turnCap);

    // Ticket 06: same query text, but an unranked store-wide count with no
    // `LIMIT` — compared against `results.length` (this turn's gated, ranked
    // recall, capped at `limit: 10`, before ledger dedup and budget-packing),
    // not the final injected count. Comparing against the post-dedup count
    // instead would re-fire the hint every subsequent turn on an entry the
    // ledger already silenced as seen — directly at odds with the dedup
    // guarantee other tickets rely on (a repeat turn over the same prompt
    // must stay silent). Comparing against the post-budget count would
    // couple the hint to ticket 07's own char-budget truncation, which
    // already surfaces itself on its own terms. `results.length` isolates
    // exactly the gap this ticket is about: the query's own `limit: 10`
    // ceiling versus what's really in the store — the architecture card is a
    // different query and irrelevant to it either way.
    const totalMatches = memory.countFtsMatches(prompt);
    const hintBudget = turnCap - (turnBody ? turnBody.length + 1 : 0);
    const hint = buildDiscoveryHint(prompt, totalMatches, results.length, hintBudget);
    // Ticket 07 (neuron-2.4.0): a fired hint is measurement-relevant only
    // when there's a session to later join a `post-tool-use` event against —
    // the sessionless branch above has no ledger either, for the same reason.
    if (hint) recordHintFired(projectDir, sessionId, hintCommand(hint));
    const turnBodyWithHint = hint ? (turnBody ? `${turnBody}\n${hint}` : hint) : turnBody;

    // Ticket 08: additive resident-footprint cost, carved out of whatever's
    // left of the epoch budget after the card and this turn's memory recall
    // — the same reservation shape the re-injected architecture card above
    // already uses. Deduped against the same session ledger `filterUnseen`
    // reads from: a commit hash is just another opaque id in that set.
    await memory.refreshGitLogIndex();
    const gitLogCap = Math.min(GIT_LOG_CHAR_BUDGET, remaining - cardBody.length - turnBodyWithHint.length);
    const gitLogSeen = loadEpochState(projectDir, sessionId).injectedIds;
    const gitLogHits = gitLogCap > 0 ? await memory.searchGitLog(prompt, GIT_LOG_MAX_COMMITS) : [];
    const unseenGitLogHits = gitLogHits.filter(h => !gitLogSeen.has(h.hash));
    const { text: gitLogBody, includedIds: gitLogIds } = buildGitLogPayload(unseenGitLogHits, gitLogCap);

    const sections: string[] = [];
    if (cardBody) sections.push(`## Architecture\n${cardBody}`);
    if (turnBodyWithHint) sections.push(cardBody ? `## Relevant\n${turnBodyWithHint}` : turnBodyWithHint);
    if (gitLogBody) sections.push(gitLogBody);
    const text = sections.join('\n\n');
    const includedIds = [...cardIds, ...turnIds, ...gitLogIds];

    recordPrePromptTurn(projectDir, sessionId, includedIds, text.length);
    if (!text) return;
    emit(harness, 'UserPromptSubmit', text);
  } finally {
    memory.close();
  }
}
