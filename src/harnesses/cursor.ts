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

export const CURSOR_HARNESS_ID = 'cursor';

/**
 * Neuron's own lifecycle vocabulary, translated to Cursor's event names
 * (camelCase, confirmed via direct fetch of `cursor.com/docs/hooks` during
 * this ticket — the same naming-convention family as Claude Code/Codex).
 * `pre-prompt` has no entry: `beforeSubmitPrompt` fires every turn but its
 * documented output is `{continue, user_message}` — permission allow/deny
 * only, no context-carrying field — so neuron never wires a hook there at
 * all, same design call ticket 01 made for Copilot CLI's `userPromptSubmitted`.
 * Unlike Copilot, `context-reset` *does* get a real event (`preCompact`) —
 * see `capability()` below for why wiring it still doesn't make the epoch
 * reliably roll.
 */
const EVENT_NAME: Partial<Record<LifecyclePoint, string>> = {
  'session-start': 'sessionStart',
  'context-reset': 'preCompact',
};

/**
 * Requested in seconds via the hook entry's `timeout` field. Cursor's own
 * default is documented only as "platform-specific" with no concrete number
 * given, so these are neuron's own conservative inner bounds, not a fraction
 * of a stated ceiling the way the other adapters' timeouts are.
 */
const HOOK_TIMEOUT_SECONDS: Partial<Record<LifecyclePoint, number>> = {
  'session-start': 20,
  'context-reset': 5,
};

/**
 * Truthful capability record for Cursor, sourced from ticket 10's research
 * (`neuron-2.2.0`) plus a direct fetch of `cursor.com/docs/hooks` during this
 * ticket, which resolved three things the research left open:
 *
 * 1. The stdout contract is a flat `{"additional_context": "..."}` at the
 *    root for both `sessionStart` and `postToolUse` — snake_case, and
 *    neither Claude Code/Codex's `hookSpecificOutput` wrapper nor Copilot's
 *    camelCase `additionalContext`. `src/commands/hook.ts`'s `emit()` gained
 *    a third branch for this reason.
 * 2. `preCompact` **does** run in cloud/background agents (Cursor's own
 *    supported-hooks table lists it "Yes"), unlike `sessionStart` and most
 *    other hooks — but its stdin carries **no `session_id` field at all**,
 *    unlike `sessionStart`'s. `rollEpoch` only ever fires when a session id
 *    is present (`src/commands/hook.ts`), so wiring `preCompact` still never
 *    actually rolls the session ledger epoch on this harness — a different
 *    root cause than Copilot's gap (no compaction-equivalent event exists at
 *    all there) but the same practical consequence. Wired anyway, since the
 *    event is real and firing evidence (`verify()`) is still worth recording
 *    truthfully; the caveat below says so rather than silently installing a
 *    hook that can never do its one job.
 * 3. `sessionStart`'s default failure posture is confirmed `fail-open`
 *    (explicit default, with an opt-in per-hook `failClosed: true`) — a real,
 *    known value, better-documented than Copilot's `'unknown'` — but the
 *    payload cap and concrete timeout are still undocumented, which is
 *    enough on its own to keep this harness `best-effort` (`deriveFidelity`).
 */
function capability(): CapabilityMap {
  return {
    'session-start': {
      injects: true,
      payloadCapChars: 'unknown',
      failurePosture: 'fail-open',
      timeoutMs: 'unknown',
      caveats: [
        'Payload cap is not documented anywhere reached. The default hook timeout is documented only as "platform-specific," with no concrete number stated.',
        'sessionStart does not run in cloud/background agents (confirmed via direct fetch) — an execution mode Cursor itself offers. User-level hooks (~/.cursor/hooks.json) never run in cloud agents at all, regardless of lifecycle point, since there is no home directory there.',
      ],
    },
    'pre-prompt': {
      injects: false,
      payloadCapChars: 'unknown',
      failurePosture: 'unknown',
      timeoutMs: 'unknown',
      caveats: [
        'beforeSubmitPrompt fires every turn but its documented output is {continue, user_message} — permission allow/deny only, no context-carrying field (confirmed via direct fetch) — so neuron never wires a hook here at all.',
      ],
    },
    'context-reset': {
      injects: false,
      payloadCapChars: 'unknown',
      failurePosture: 'fail-open',
      timeoutMs: 'unknown',
      caveats: [
        'preCompact exists and is wired — unlike Copilot CLI, which has no compaction-equivalent event at all — and does run in cloud/background agents per Cursor\'s own supported-hooks table. But its stdin carries no session_id field (confirmed via direct fetch, unlike sessionStart\'s), so the session ledger epoch never actually rolls from this point despite the hook firing. verify() firing evidence still records that it ran; only rollEpoch\'s effect is unreachable.',
      ],
    },
  };
}

/**
 * Cursor documents `.cursor/hooks.json` at project root and
 * `~/.cursor/hooks.json` at user level (plus enterprise-managed paths
 * neuron never targets). No third, gitignored, project-local scope is
 * documented — the same gap Copilot CLI and Codex CLI both have —
 * `'project-local'` collapses into `'project-committed'`'s file, with a
 * one-time warning.
 */
function targetFilePath(projectDir: string, target: HookTarget): string {
  switch (target) {
    case 'user-global':
      return path.join(os.homedir(), '.cursor', 'hooks.json');
    case 'project-committed':
    case 'project-local':
      return path.join(projectDir, '.cursor', 'hooks.json');
  }
}

/** Only two distinct files exist; `project-local` collapses into `project-committed`'s. */
function allCandidatePaths(): HookTarget[] {
  return ['user-global', 'project-committed'];
}

interface HookCommandEntry {
  type: 'command';
  /** A single shell command string — same shape as Codex's schema, not Claude Code's `command` + `args[]` split. */
  command: string;
  timeout: number;
}

function commandString(point: LifecyclePoint): string {
  return `neuron hook ${CURSOR_HARNESS_ID} ${point}`;
}

function proposedHook(point: LifecyclePoint): HookCommandEntry {
  return {
    type: 'command',
    command: commandString(point),
    timeout: HOOK_TIMEOUT_SECONDS[point]!,
  };
}

function isNeuronHook(entry: unknown, point: LifecyclePoint): entry is HookCommandEntry {
  if (!entry || typeof entry !== 'object') return false;
  const h = entry as Record<string, unknown>;
  return h.type === 'command' && h.command === commandString(point);
}

/**
 * Hook entries for an event are a **flat array**, each entry optionally
 * carrying its own `matcher` (confirmed via direct fetch) — not grouped
 * under a shared matcher the way Claude Code/Codex's settings are. Same
 * shape as Copilot's, so "neuron's own entry" is an array index, not a
 * matcher-group shape check. Neuron never sets `matcher` on its own entries.
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

export class CursorAdapter implements HarnessAdapter {
  readonly id = CURSOR_HARNESS_ID;

  detect(projectDir: string): boolean {
    return fs.existsSync(path.join(projectDir, '.cursor'));
  }

  capability(): CapabilityMap {
    return capability();
  }

  async install(projectDir: string, options: InstallOptions): Promise<InstallResult> {
    if (options.target === 'project-local') {
      process.stderr.write(
        '[neuron warning] Cursor has no documented gitignored project-level hooks scope distinct from ' +
        'the committed one — writing to .cursor/hooks.json, the same file \'project-committed\' would use. ' +
        'Add it to your own .gitignore if you want it untracked.\n'
      );
    }

    const targetPath = targetFilePath(projectDir, options.target);
    const file = readHooksFile(targetPath);
    const hooks = (file.hooks && typeof file.hooks === 'object' ? file.hooks : {}) as Record<string, unknown[]>;

    const points: InstallResult['points'] = {
      'session-start': 'unchanged',
      'pre-prompt': 'unchanged',
      'context-reset': 'unchanged',
    };

    for (const point of LIFECYCLE_POINTS) {
      const eventName = EVENT_NAME[point];
      if (!eventName) continue; // pre-prompt: no usable injection point, nothing to install, ever.

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

    // Documented as a required top-level field alongside `hooks`; neuron sets
    // it only when creating the file fresh, never overwriting one already there.
    if (file.version === undefined) file.version = 1;
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
