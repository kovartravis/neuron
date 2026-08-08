import { NeuronMemory } from '../index.js';
import { loadConfig } from '../config/neuronYaml.js';
import { withTimeout } from '../components/timeout.js';
import {
  buildPayload,
  filterUnseen,
  remainingEpochBudget,
  recordSessionStartInjection,
  recordPrePromptTurn,
  rollEpoch,
  recordFired,
  SESSION_START_CHAR_BUDGET,
  PRE_PROMPT_CHAR_BUDGET,
  LifecyclePoint,
} from '../harnesses/index.js';

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
};

const VALID_POINTS: LifecyclePoint[] = ['session-start', 'pre-prompt', 'context-reset'];

/**
 * Claude Code and Codex share the same stdin fields (`session_id`, `prompt`)
 * and stdout contract (`hookSpecificOutput.additionalContext`), confirmed
 * for Codex via a direct fetch of its hooks docs during ticket 13. Copilot
 * CLI (ticket 01) shares the stdin fields but expects a flat
 * `{"additionalContext": "..."}` at the root instead — confirmed via a
 * direct fetch of its own hooks reference — so `emit()` branches on harness
 * id for the one difference that matters.
 */
const VALID_HARNESSES = ['claude-code', 'codex', 'copilot'];

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
export async function handleHookCommand(args: string[]): Promise<void> {
  const harness = args[1];
  const point = args[2] as LifecyclePoint;
  const projectDir = process.cwd();

  if (!VALID_HARNESSES.includes(harness) || !VALID_POINTS.includes(point)) {
    return;
  }

  // Recorded before any work that could fail, so verify()'s firing evidence
  // stays accurate even when the query below times out or throws.
  recordFired(projectDir, harness, point);

  try {
    await withTimeout(runHook(projectDir, harness, point), HOOK_TIMEOUT_MS[point], `neuron hook ${harness} ${point}`);
  } catch {
    // Silent degrade: no stdout means no injection; exit code stays 0.
  }
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
      const results = await memory.query({ categories: [category], limit: 3 });
      if (results.length === 0) return;

      // No session id means no epoch to budget against — degrade toward the
      // fixed per-injection cap alone, same as before ticket 07 (neuron-2.3.0).
      const cap = sessionId
        ? Math.min(SESSION_START_CHAR_BUDGET, remainingEpochBudget(projectDir, sessionId, epochCharBudget))
        : SESSION_START_CHAR_BUDGET;
      const { text, includedIds } = buildPayload(results, cap);
      if (includedIds.length === 0) return;
      if (sessionId) recordSessionStartInjection(projectDir, sessionId, includedIds, text.length);
      emit(harness, 'SessionStart', text);
      return;
    }

    // point === 'pre-prompt'
    const prompt = typeof input.prompt === 'string' ? input.prompt : undefined;
    if (!prompt || !prompt.trim()) return;

    if (!sessionId) {
      // No session id means no ledger to dedupe or budget against — degrade
      // toward repetition (show everything every turn), never toward silence.
      const results = await memory.query({ text: prompt, limit: 10 });
      const { text, includedIds } = buildPayload(results, PRE_PROMPT_CHAR_BUDGET);
      if (includedIds.length === 0) return;
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

    const results = await memory.query({ text: prompt, limit: 10 });
    const unseen = filterUnseen(projectDir, sessionId, results);
    const { text, includedIds } = buildPayload(unseen, Math.min(PRE_PROMPT_CHAR_BUDGET, remaining));
    recordPrePromptTurn(projectDir, sessionId, includedIds, text.length);
    if (includedIds.length === 0) return;
    emit(harness, 'UserPromptSubmit', text);
  } finally {
    memory.close();
  }
}
