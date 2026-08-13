import type { NeuronConfig } from './neuronYaml.js';
import type { OverwritePolicy } from '../harnesses/types.js';

/**
 * Ticket 14: hooks own the read side on a harness with a deterministic
 * adapter, so the generated protocol block only needs to teach the write
 * side there. A harness with no such adapter (including every harness
 * without a `HarnessAdapter` at all — 'best-effort' ones fall into this
 * bucket too, since neither can guarantee the model ever sees a result) has
 * nothing else performing recall, so it keeps the manual query step.
 */
export type ProtocolFidelity = 'deterministic' | 'fallback';

export const PROTOCOL_MARKER_START = '<!-- neuron:protocol:start -->';
export const PROTOCOL_MARKER_END = '<!-- neuron:protocol:end -->';

function categoryList(config: NeuronConfig): string[] {
  return Object.keys(config.categories);
}

function metadataFlagsSection(): string {
  return [
    '### Metadata flags',
    '',
    "- `--tags`: omit — write-side enrichment infers tags from the store's " +
      'vocabulary, which converges it; hand-written tags widen it instead.',
    "- `--importance`: omit defaults to `3`, `neuron memory prune`'s default " +
      'ceiling — anything left at 3 is prune-eligible past `--days`. Pass `4` or ' +
      '`5` to survive a prune.',
    '- `--category`: always pass — omitting it can cost a model load or ' +
      'hard-fail the write.',
  ].join('\n');
}

function scanRefreshSection(): string {
  return [
    'If module boundaries, subsystems, or a public export contract changed, ' +
      'also refresh the blueprint:',
    '```bash',
    'neuron exec -- neuron scan --diff   # review what moved',
    'neuron exec -- neuron scan          # upsert the blueprint card',
    '```',
  ].join('\n');
}

function headerSection(config: NeuronConfig): string {
  const categories = categoryList(config);
  const lines = [
    '## Memory Store Protocol (`@kovartravis/neuron`)',
    '',
    'Follow this loop when working in this project. Memory categories configured ' +
      `in \`neuron.yaml\`: ${categories.map(c => `\`${c}\``).join(', ')}.`,
  ];
  if (config.scan?.enabled) {
    lines[lines.length - 1] +=
      ` Architecture scan settings: enabled: true, category: \`${config.scan.category}\`, ` +
      `depth: ${config.scan.depth}.`;
  }
  return lines.join('\n');
}

function recallStep(config: NeuronConfig): string {
  const categories = categoryList(config);
  const example = categories.slice(0, 2).join(',') || categories[0] || 'learning';
  return [
    '## 1. Recall',
    '',
    'No hook performs recall on this harness. Before viewing files, editing code, ' +
      'or taking any other action, your first tool call should be to query the ' +
      'memory store for context:',
    '```bash',
    `neuron memory query "<task topic or goal>" --categories ${example}`,
    '# Omit --categories to search every category:',
    'neuron memory query "<task topic or goal>"',
    '```',
    'If no results return, try a broader keyword (`git`, `tdd`, `db`, etc.).',
  ].join('\n');
}

function execStep(n: number): string {
  return [
    `## ${n}. Command Execution`,
    '',
    'Never run raw shell commands for builds, tests, or git operations directly. ' +
      'Wrap them with `neuron exec`:',
    '```bash',
    'neuron exec -- <command>',
    '```',
    '*Example:* `neuron exec -- npm test` or `neuron exec -- git commit`',
  ].join('\n');
}

function failureFixStep(n: number): string {
  return [
    `## ${n}. Failure-Fix Recording`,
    '',
    'When a failing command/build/test gets fixed, record it before moving on. ' +
      'Write 3-4 sentences: context/symptom, root cause, exact resolution (with a ' +
      'command/code example), any edge cases:',
    '```bash',
    'neuron memory add --category learning "Fix for <error>: <context & symptom>. ' +
      '<verified root cause>. <exact resolution steps & code/command example>." ' +
      '--importance 4',
    '```',
  ].join('\n');
}

function sessionEndStep(n: number): string {
  return [
    `## ${n}. Session Conclusion`,
    '',
    'Before finishing: log a history entry, plus any new learnings/decisions ' +
      '(3-4 sentences each):',
    '```bash',
    'neuron memory add --category history "<summary of work completed>" --task-id <ticket-id>',
    '# ADRs / design choices:',
    'neuron memory add --category decisions "<rationale and details>"',
    '```',
    '',
    scanRefreshSection(),
  ].join('\n');
}

export interface ProtocolBlockOptions {
  fidelity: ProtocolFidelity;
  execFidelity: ProtocolFidelity;
  config: NeuronConfig;
}

/**
 * Generates the managed protocol block, wrapped in marker comments so a later
 * `neuron init` can find and replace just this region without disturbing
 * hand-written content elsewhere in the file (deliverable: capability-aware
 * generator, one generator, output varying by fidelity).
 *
 * Recall and command-execution are hooked independently (ticket 23) — a
 * project can have one wired without the other — so each step is dropped on
 * its own `deterministic` verdict. `recallStep()`'s own heading is hardcoded
 * `## 1. Recall` since, whenever present, it's always first; every step
 * after it is numbered by position.
 */
export function generateProtocolBlock(options: ProtocolBlockOptions): string {
  const { fidelity, execFidelity, config } = options;
  const steps: string[] = [];
  if (fidelity !== 'deterministic') steps.push(recallStep(config));
  let n = steps.length + 1;
  if (execFidelity !== 'deterministic') steps.push(execStep(n++));
  steps.push(failureFixStep(n++));
  steps.push(sessionEndStep(n++));

  const body = [headerSection(config), ...steps, metadataFlagsSection()].join('\n\n');

  return `${PROTOCOL_MARKER_START}\n${body}\n${PROTOCOL_MARKER_END}`;
}

export type ProtocolWriteAction = 'created' | 'inserted' | 'written' | 'unchanged' | 'kept-existing';

export interface UpsertProtocolBlockResult {
  content: string;
  action: ProtocolWriteAction;
}

/**
 * Exported so a drift check (ticket 34) can extract the same managed region
 * `upsertProtocolBlock` writes into, without duplicating the marker-scan
 * logic or re-running the write path just to read it.
 */
export function findMarkerRange(content: string): { start: number; end: number } | null {
  const start = content.indexOf(PROTOCOL_MARKER_START);
  if (start === -1) return null;
  const endMarkerIndex = content.indexOf(PROTOCOL_MARKER_END, start);
  if (endMarkerIndex === -1) return null;
  return { start, end: endMarkerIndex + PROTOCOL_MARKER_END.length };
}

/**
 * Idempotently merges `block` into `existingFileContent`, touching only the
 * region between the marker comments — never content a project author wrote
 * around it. Mirrors the hook adapters' overwrite posture (ADR 0014 §7):
 * a brand-new insertion never asks, but replacing a *differing* managed
 * region does, so a customised block upgrades on consent rather than being
 * silently rewritten.
 */
export async function upsertProtocolBlock(
  existingFileContent: string | null,
  block: string,
  options: {
    overwrite?: OverwritePolicy;
    onConflict?: () => Promise<boolean> | boolean;
  } = {}
): Promise<UpsertProtocolBlockResult> {
  if (existingFileContent === null) {
    return { content: `${block}\n`, action: 'created' };
  }

  const range = findMarkerRange(existingFileContent);
  if (!range) {
    const separator = existingFileContent.endsWith('\n') ? '\n' : '\n\n';
    return { content: `${existingFileContent}${separator}${block}\n`, action: 'inserted' };
  }

  const existingBlock = existingFileContent.slice(range.start, range.end);
  if (existingBlock === block) {
    return { content: existingFileContent, action: 'unchanged' };
  }

  const policy = options.overwrite ?? 'ask';
  let shouldOverwrite: boolean;
  if (policy === 'overwrite') shouldOverwrite = true;
  else if (policy === 'keep') shouldOverwrite = false;
  else if (options.onConflict) shouldOverwrite = await options.onConflict();
  else shouldOverwrite = false; // 'ask' with no prompt available never clobbers silently.

  if (!shouldOverwrite) {
    return { content: existingFileContent, action: 'kept-existing' };
  }

  const content = existingFileContent.slice(0, range.start) + block + existingFileContent.slice(range.end);
  return { content, action: 'written' };
}
