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

export const CODEX_HARNESS_ID = 'codex';

/**
 * Neuron's own lifecycle vocabulary, translated to Codex CLI's event names.
 * Confirmed identical to Claude Code's naming (`learn.chatgpt.com/docs/hooks`,
 * fetched directly during this ticket): `SessionStart`, `UserPromptSubmit`,
 * and `PreCompact` are named exactly the same on both harnesses.
 */
const EVENT_NAME: Record<LifecyclePoint, string> = {
  'session-start': 'SessionStart',
  'pre-prompt': 'UserPromptSubmit',
  'context-reset': 'PreCompact',
};

/**
 * Per-hook timeouts neuron requests, in seconds (Codex's `timeout` field is
 * seconds, default 600 — same unit and default as Claude Code's). Chosen well
 * below that ceiling so a hung neuron process degrades the user's turn by a
 * few seconds, not by the harness's full budget.
 */
const HOOK_TIMEOUT_SECONDS: Record<LifecyclePoint, number> = {
  'session-start': 20,
  'pre-prompt': 10,
  'context-reset': 5,
};

/**
 * Truthful capability record for Codex CLI. Sourced from ticket 10's research
 * plus a direct fetch of `learn.chatgpt.com/docs/hooks` during this ticket,
 * which resolved two things ticket 10 left as documentation gaps:
 *
 * 1. `session_id` is present on every hook's stdin, `PreCompact`/`PostCompact`
 *    included — confirming ADR 0014 §3's session-ledger design holds here too
 *    (the same open risk ticket 12 closed for Claude Code).
 * 2. The stdout contract is byte-identical to Claude Code's:
 *    `{"hookSpecificOutput":{"hookEventName":...,"additionalContext":...}}`,
 *    for `SessionStart` and `UserPromptSubmit` alike — so `src/commands/hook.ts`
 *    needed no per-harness branching to emit Codex's output.
 *
 * `payloadCapChars` is a conversion, not a direct quote: Codex's own limit
 * (`additionalContextLimit`) is token-denominated (default 2500), not
 * character-denominated. Neuron counts characters everywhere (`payload.ts`),
 * so this reports the same conservative 3-chars/token reading that module
 * already uses to size its shared budgets — flagged via `caveats` rather than
 * presented as a directly-documented character figure.
 */
function capability(): CapabilityMap {
  return {
    'session-start': {
      injects: true,
      payloadCapChars: 7500,
      failurePosture: 'fail-open',
      timeoutMs: 600000,
      caveats: [
        'Codex documents this cap in tokens (additionalContextLimit, default 2500), not characters; 7500 is a conservative 3 chars/token conversion, not a directly quoted figure.',
        'Neuron requests its own 20s timeout, well under the harness default.',
      ],
    },
    'pre-prompt': {
      injects: true,
      payloadCapChars: 7500,
      failurePosture: 'fail-open',
      timeoutMs: 600000,
      caveats: [
        'Same token-to-character conversion caveat as session-start.',
        'Codex is fail-open on a non-zero exit or timeout (execution continues without the hook\'s output) — unlike Claude Code, there is no blocking exit code for UserPromptSubmit here.',
      ],
    },
    'context-reset': {
      injects: false,
      payloadCapChars: 'unknown',
      failurePosture: 'fail-open',
      timeoutMs: 600000,
      caveats: [
        'PreCompact ignores stdout entirely (confirmed via direct fetch) — only clears the session ledger; no payload is ever sent from this point.',
      ],
    },
  };
}

/**
 * Codex documents exactly two hooks.json locations: `~/.codex/hooks.json`
 * (user) and `<repo>/.codex/hooks.json` (project) — no third, gitignored,
 * project-local scope the way Claude Code has `settings.local.json`.
 * `'project-local'` therefore resolves to the same path as
 * `'project-committed'`; `install()` warns once when that happens so the
 * collapse is visible rather than silently losing the distinction the user
 * asked for.
 */
function targetFilePath(projectDir: string, target: HookTarget): string {
  switch (target) {
    case 'user-global':
      return path.join(os.homedir(), '.codex', 'hooks.json');
    case 'project-committed':
    case 'project-local':
      return path.join(projectDir, '.codex', 'hooks.json');
  }
}

/** Only two distinct files exist; `project-local` collapses into `project-committed`'s. */
function allCandidatePaths(): HookTarget[] {
  return ['user-global', 'project-committed'];
}

interface HookCommandEntry {
  type: 'command';
  /**
   * A single shell command string, not Claude Code's `command` + `args[]`
   * split — the fetched Codex schema lists only `command` ("executable
   * path") with no sibling `args` field.
   */
  command: string;
  timeout: number;
}

interface MatcherGroup {
  matcher?: string;
  hooks: unknown[];
}

function commandString(point: LifecyclePoint): string {
  return `neuron hook ${CODEX_HARNESS_ID} ${point}`;
}

function proposedHook(point: LifecyclePoint): HookCommandEntry {
  return {
    type: 'command',
    command: commandString(point),
    timeout: HOOK_TIMEOUT_SECONDS[point],
  };
}

function isNeuronHook(entry: unknown, point: LifecyclePoint): entry is HookCommandEntry {
  if (!entry || typeof entry !== 'object') return false;
  const h = entry as Record<string, unknown>;
  return h.type === 'command' && h.command === commandString(point);
}

/**
 * A matcher-group neuron itself created: exactly one hook entry, and that
 * entry is neuron's own. Install/uninstall only ever read or mutate groups
 * matching this shape — a user's own hooks, including ones that happen to
 * share a matcher-group with other tooling, are never touched.
 */
function findOwnGroup(groups: MatcherGroup[], point: LifecyclePoint): number {
  return groups.findIndex(g => Array.isArray(g.hooks) && g.hooks.length === 1 && isNeuronHook(g.hooks[0], point));
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

export class CodexAdapter implements HarnessAdapter {
  readonly id = CODEX_HARNESS_ID;

  detect(projectDir: string): boolean {
    return fs.existsSync(path.join(projectDir, '.codex'));
  }

  capability(): CapabilityMap {
    return capability();
  }

  async install(projectDir: string, options: InstallOptions): Promise<InstallResult> {
    if (options.target === 'project-local') {
      process.stderr.write(
        '[neuron warning] Codex CLI has no documented gitignored project-level hooks scope distinct from ' +
        'the committed one — writing to .codex/hooks.json, the same file \'project-committed\' would use. ' +
        'Add it to your own .gitignore if you want it untracked.\n'
      );
    }

    const targetPath = targetFilePath(projectDir, options.target);
    const file = readHooksFile(targetPath);
    const hooks = (file.hooks && typeof file.hooks === 'object' ? file.hooks : {}) as Record<string, MatcherGroup[]>;

    const points: InstallResult['points'] = {
      'session-start': 'unchanged',
      'pre-prompt': 'unchanged',
      'context-reset': 'unchanged',
    };

    for (const point of LIFECYCLE_POINTS) {
      const eventName = EVENT_NAME[point];
      const groups: MatcherGroup[] = Array.isArray(hooks[eventName]) ? hooks[eventName] : [];
      const proposed = proposedHook(point);
      const existingIndex = findOwnGroup(groups, point);

      if (existingIndex === -1) {
        groups.push({ matcher: '.*', hooks: [proposed] });
        points[point] = 'written';
      } else {
        const existing = groups[existingIndex].hooks[0];
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
            groups[existingIndex] = { matcher: '.*', hooks: [proposed] };
            points[point] = 'written';
          } else {
            points[point] = 'kept-existing';
          }
        }
      }

      hooks[eventName] = groups;
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
      const hooks = (file.hooks && typeof file.hooks === 'object' ? file.hooks : {}) as Record<string, MatcherGroup[]>;

      let removedCount = 0;
      for (const point of LIFECYCLE_POINTS) {
        const eventName = EVENT_NAME[point];
        const groups: MatcherGroup[] = Array.isArray(hooks[eventName]) ? hooks[eventName] : [];
        const ownIndex = findOwnGroup(groups, point);
        if (ownIndex !== -1) {
          groups.splice(ownIndex, 1);
          removedCount++;
        }
        if (groups.length > 0) hooks[eventName] = groups;
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

      for (const target of allCandidatePaths()) {
        const targetPath = targetFilePath(projectDir, target);
        if (!fs.existsSync(targetPath)) continue;
        let file: Record<string, unknown>;
        try {
          file = readHooksFile(targetPath);
        } catch {
          continue;
        }
        const hooks = (file.hooks && typeof file.hooks === 'object' ? file.hooks : {}) as Record<string, MatcherGroup[]>;
        const groups: MatcherGroup[] = Array.isArray(hooks[EVENT_NAME[point]]) ? hooks[EVENT_NAME[point]] : [];
        if (findOwnGroup(groups, point) !== -1) {
          registered = true;
          registeredAt = targetPath;
          break;
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
