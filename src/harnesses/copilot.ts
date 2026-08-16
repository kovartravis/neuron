import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {
  CapabilityMap,
  HarnessAdapter,
  HookTarget,
  InstallOptions,
  InstallResult,
  LifecyclePoint,
  LIFECYCLE_POINTS,
  UninstallResult,
  VerifyResult,
} from './types.js';
import { readFiringState } from './hookState.js';
import { HARNESSES, isHarnessPresent } from '../config/harness.js';

export const COPILOT_HARNESS_ID = 'copilot';

/**
 * Neuron's own lifecycle vocabulary, translated to Copilot CLI's event
 * names — camelCase, unlike Claude Code/Codex's PascalCase (confirmed via
 * direct fetch of `docs.github.com/en/copilot/reference/hooks-reference`
 * during this ticket). Only `session-start` has an entry: `pre-prompt` and
 * `context-reset` are deliberately never wired (see `capability()` below),
 * so the map only needs to cover the one point neuron can actually use.
 */
const EVENT_NAME: Partial<Record<LifecyclePoint, string>> = {
  'session-start': 'sessionStart',
  'pre-stop': 'agentStop',
};

/**
 * Requested in seconds via the hook entry's `timeoutSec` field, well under
 * the harness's documented 30s default for `sessionStart` — same posture as
 * the other adapters' own inner timeouts.
 */
const SESSION_START_TIMEOUT_SECONDS = 20;

/**
 * Truthful capability record for GitHub Copilot CLI, sourced from ticket
 * 10's research (`neuron-2.2.0`) plus a direct fetch of
 * `docs.github.com/en/copilot/reference/hooks-reference` and
 * `.../use-hooks` during this ticket, which confirmed two things the
 * research left as open questions:
 *
 * 1. The stdout contract is *not* the `hookSpecificOutput.additionalContext`
 *    wrapper Claude Code and Codex share — Copilot expects a flat
 *    `{"additionalContext": "..."}` at the root. `src/commands/hook.ts`
 *    branches on harness id for exactly this reason.
 * 2. Hook entries are a flat array per event name, not grouped under a
 *    `matcher` the way Claude Code's and Codex's settings are.
 *
 * `session-start` is the only point that ever injects (research: real,
 * harness-executed `additionalContext` injection, confirmed to apply to
 * Copilot CLI specifically) — but even there, failure/timeout behaviour and
 * any payload cap are undocumented, which is enough on its own to keep this
 * harness `best-effort` rather than `deterministic` (`deriveFidelity`).
 * `pre-prompt` (`userPromptSubmitted`) fires every turn but is documented as
 * "no output processed, notification only" — a genuine functional gap, not
 * an undocumented one, so `injects: false` here is a known fact, not a
 * placeholder for `'unknown'`. `context-reset` has no documented
 * compaction-equivalent event at all on this harness.
 */
function capability(): CapabilityMap {
  return {
    'session-start': {
      injects: true,
      payloadCapChars: 'unknown',
      failurePosture: 'unknown',
      timeoutMs: 30000,
      caveats: [
        'Payload cap is not documented anywhere reached. Failure/timeout behaviour (whether a timeout or non-zero exit blocks the session, warns, or silently continues) is likewise undocumented.',
        `Neuron requests its own ${SESSION_START_TIMEOUT_SECONDS}s timeoutSec, under the harness's documented 30s default.`,
      ],
    },
    'pre-prompt': {
      injects: false,
      payloadCapChars: 'unknown',
      failurePosture: 'unknown',
      timeoutMs: 'unknown',
      caveats: [
        'userPromptSubmitted fires every turn but is documented as notification-only — its output is never processed by the harness, so neuron never wires a hook here at all.',
      ],
    },
    'context-reset': {
      injects: false,
      payloadCapChars: 'unknown',
      failurePosture: 'unknown',
      timeoutMs: 'unknown',
      caveats: [
        'No compaction-equivalent event is documented for Copilot CLI (the full event list is sessionStart, sessionEnd, userPromptSubmitted, preToolUse, postToolUse, agentStop, subagentStart, subagentStop, errorOccurred, notification) — the session ledger epoch never rolls on this harness.',
        'Low practical risk as designed: session-start is the only point that ever spends against the epoch (pre-prompt is never wired, so there is no repeated per-turn spend to accumulate), and its own per-injection cap (SESSION_START_CHAR_BUDGET, 6,000 chars) is well under the default 18,000-char epoch budget on its own. The gap would only matter if Copilot re-fires sessionStart more than once within a single session_id — undocumented, not observed, and would need a real report before building anything for it.',
      ],
    },
    'pre-command': {
      injects: false,
      payloadCapChars: 'unknown',
      failurePosture: 'unknown',
      timeoutMs: 'unknown',
      caveats: [
        'A structural ceiling, not an undocumented gap (ticket 12, neuron-2.4.0): preToolUse only returns permissionDecision/permissionDecisionReason/modifiedArgs (confirmed via direct fetch of docs.github.com/en/copilot/reference/hooks-reference) — additionalContext is documented as specific to postToolUse/notification, not preToolUse, so there is no context-carrying field to inject here at all. Never wired by neuron init, permanently, the same as pre-prompt above. The CLAUDE.md/AGENTS.md-instructed `neuron exec` step stays as this harness\'s only path to the same lookup.',
      ],
    },
    'pre-stop': {
      injects: true,
      payloadCapChars: 'unknown',
      failurePosture: 'unknown',
      timeoutMs: 30000,
      caveats: [
        'agentStop ("the main agent finishes a turn") supports decision:"block" + reason, which forces another agent turn using reason as the prompt — real, functional support, distinct from sessionEnd above which is fire-and-forget. It does not support additionalContext, so the reminder must ride in reason rather than as model context.',
        'Doc-sourced only (docs.github.com/en/copilot/reference/hooks-reference), not verified against a real Copilot CLI installation — payload cap and failure/timeout behaviour are undocumented, same gap as session-start.',
        'A runaway safeguard is documented: after 8 consecutive block continuations, the CLI overrides the hook and ends the turn anyway — neuron\'s own per-session ledger dedup (see hook.ts) means this is never reached in practice (one nudge, then always allow).',
      ],
    },
  };
}

/**
 * Repo-level hooks live at `.github/hooks/*.json` (any filename, per the
 * docs — neuron picks a stable one) and must be committed; personal hooks
 * live at `~/.copilot/hooks/*.json`. No gitignored project-local scope is
 * documented, the same gap Codex CLI has — `'project-local'` collapses into
 * the same file `'project-committed'` would use, with a one-time warning.
 */
function targetFilePath(projectDir: string, target: HookTarget): string {
  switch (target) {
    case 'user-global':
      return path.join(os.homedir(), '.copilot', 'hooks', 'neuron.json');
    case 'project-committed':
    case 'project-local':
      return path.join(projectDir, '.github', 'hooks', 'neuron.json');
  }
}

/** Only two distinct files exist; `project-local` collapses into `project-committed`'s. */
function allCandidatePaths(): HookTarget[] {
  return ['user-global', 'project-committed'];
}

interface HookCommandEntry {
  type: 'command';
  /** Cross-platform fallback field — confirmed valid alone, no `bash`/`powershell` required alongside it. */
  command: string;
  timeoutSec: number;
}

function commandString(point: LifecyclePoint): string {
  return `neuron hook ${COPILOT_HARNESS_ID} ${point}`;
}

function proposedHook(point: LifecyclePoint): HookCommandEntry {
  return {
    type: 'command',
    command: commandString(point),
    timeoutSec: SESSION_START_TIMEOUT_SECONDS,
  };
}

function isNeuronHook(entry: unknown, point: LifecyclePoint): entry is HookCommandEntry {
  if (!entry || typeof entry !== 'object') return false;
  const h = entry as Record<string, unknown>;
  return h.type === 'command' && h.command === commandString(point);
}

/**
 * Hook entries for an event are a **flat array**, not matcher-grouped
 * (confirmed via direct fetch) — so, unlike Claude Code/Codex, "neuron's own
 * entry" is just an array index, not a group shape.
 */
function findOwnEntry(entries: unknown[], point: LifecyclePoint): number {
  return entries.findIndex(e => isNeuronHook(e, point));
}

function readHooksFile(filePath: string): Record<string, unknown> {
  if (!fs.existsSync(filePath)) return {};
  let raw: string;
  try {
    raw = fs.readFileSync(filePath, 'utf8');
  } catch (e: any) {
    throw new Error(`neuron: cannot read ${filePath}: ${e.message}`);
  }
  if (raw.trim() === '') return {};
  try {
    return JSON.parse(raw);
  } catch (e: any) {
    throw new Error(
      `neuron: ${filePath} is not valid JSON — fix or remove it by hand before running 'neuron init' again (${e.message}).`
    );
  }
}

function writeHooksFile(filePath: string, contents: Record<string, unknown>): void {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(contents, null, 2) + '\n', 'utf8');
}

export class CopilotAdapter implements HarnessAdapter {
  readonly id = COPILOT_HARNESS_ID;

  /**
   * Bare `.github/` existence used to be enough (ticket 31, neuron-2.4.0
   * found this false-positives on any repo with GitHub Actions/issue
   * templates and no Copilot use at all). Shares `harnesses.json`'s
   * `github` entry — the config-driven `.github/copilot-instructions.md`
   * marker, plus the already-onboarded-by-neuron fallback — as the single
   * source of truth, rather than duplicating the rule here.
   */
  detect(projectDir: string): boolean {
    const meta = HARNESSES.find(h => h.name === 'github');
    if (!meta) return fs.existsSync(path.join(projectDir, '.github'));
    return isHarnessPresent(projectDir, meta);
  }

  capability(): CapabilityMap {
    return capability();
  }

  async install(projectDir: string, options: InstallOptions): Promise<InstallResult> {
    if (options.target === 'project-local') {
      process.stderr.write(
        '[neuron warning] Copilot CLI has no documented gitignored project-level hooks scope distinct from ' +
        'the committed one — writing to .github/hooks/neuron.json, the same file \'project-committed\' would ' +
        'use. Add it to your own .gitignore if you want it untracked.\n'
      );
    }

    const targetPath = targetFilePath(projectDir, options.target);
    const file = readHooksFile(targetPath);
    const hooks = (file.hooks && typeof file.hooks === 'object' ? file.hooks : {}) as Record<string, unknown[]>;

    const points: InstallResult['points'] = {
      'session-start': 'unchanged',
      'pre-prompt': 'unchanged',
      'context-reset': 'unchanged',
      'pre-command': 'unchanged',
      'pre-stop': 'unchanged',
    };

    for (const point of LIFECYCLE_POINTS) {
      const eventName = EVENT_NAME[point];
      if (!eventName) continue; // No documented hook point on this harness — nothing to install, ever.

      const entries: unknown[] = Array.isArray(hooks[eventName]) ? hooks[eventName] : [];
      const proposed = proposedHook(point);
      const existingIndex = findOwnEntry(entries, point);

      if (existingIndex === -1) {
        entries.push(proposed);
        points[point] = 'written';
      } else {
        const existing = entries[existingIndex];
        if (JSON.stringify(existing) === JSON.stringify(proposed)) {
          points[point] = 'unchanged';
        } else {
          const policy = options.overwrite ?? 'ask';
          let shouldOverwrite: boolean;
          if (policy === 'overwrite') shouldOverwrite = true;
          else if (policy === 'keep') shouldOverwrite = false;
          else if (options.onConflict) shouldOverwrite = await options.onConflict({ targetPath, point });
          else shouldOverwrite = false; // 'ask' with no prompt available never clobbers silently.

          if (shouldOverwrite) {
            entries[existingIndex] = proposed;
            points[point] = 'written';
          } else {
            points[point] = 'kept-existing';
          }
        }
      }

      hooks[eventName] = entries;
    }

    file.hooks = hooks;
    writeHooksFile(targetPath, file);

    return { harness: this.id, targetPath, target: options.target, points };
  }

  async uninstall(projectDir: string): Promise<UninstallResult> {
    const removed: UninstallResult['removed'] = [];

    for (const target of allCandidatePaths()) {
      const targetPath = targetFilePath(projectDir, target);
      if (!fs.existsSync(targetPath)) continue;

      let file: Record<string, unknown>;
      try {
        file = readHooksFile(targetPath);
      } catch {
        // An unparsable file was never neuron's to touch; skip it rather than fail the whole uninstall.
        continue;
      }
      const hooks = (file.hooks && typeof file.hooks === 'object' ? file.hooks : {}) as Record<string, unknown[]>;

      let removedCount = 0;
      for (const point of LIFECYCLE_POINTS) {
        const eventName = EVENT_NAME[point];
        if (!eventName) continue;

        const entries: unknown[] = Array.isArray(hooks[eventName]) ? hooks[eventName] : [];
        const ownIndex = findOwnEntry(entries, point);
        if (ownIndex !== -1) {
          entries.splice(ownIndex, 1);
          removedCount++;
        }
        if (entries.length > 0) hooks[eventName] = entries;
        else delete hooks[eventName];
      }

      if (removedCount > 0) {
        if (Object.keys(hooks).length > 0) file.hooks = hooks;
        else delete file.hooks;
        writeHooksFile(targetPath, file);
        removed.push({ targetPath, removedCount });
      }
    }

    return { harness: this.id, removed };
  }

  verify(projectDir: string): VerifyResult {
    const firing = readFiringState(projectDir, this.id);
    const result = {} as VerifyResult;

    for (const point of LIFECYCLE_POINTS) {
      let registered = false;
      let registeredAt: string | undefined;
      const eventName = EVENT_NAME[point];

      if (eventName) {
        for (const target of allCandidatePaths()) {
          const targetPath = targetFilePath(projectDir, target);
          if (!fs.existsSync(targetPath)) continue;
          let file: Record<string, unknown>;
          try {
            file = readHooksFile(targetPath);
          } catch {
            continue;
          }
          const hooks = (file.hooks && typeof file.hooks === 'object' ? file.hooks : {}) as Record<string, unknown[]>;
          const entries: unknown[] = Array.isArray(hooks[eventName]) ? hooks[eventName] : [];
          if (findOwnEntry(entries, point) !== -1) {
            registered = true;
            registeredAt = targetPath;
            break;
          }
        }
      }

      result[point] = {
        registered,
        targetPath: registeredAt,
        lastFiredAt: firing[point].lastFiredAt,
        fireCount: firing[point].fireCount,
      };
    }

    return result;
  }
}
