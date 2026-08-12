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

export const CLAUDE_CODE_HARNESS_ID = 'claude-code';

/** Neuron's own lifecycle vocabulary, translated to Claude Code's event names. */
const EVENT_NAME: Record<LifecyclePoint, string> = {
  'session-start': 'SessionStart',
  'pre-prompt': 'UserPromptSubmit',
  'context-reset': 'PreCompact',
  'pre-command': 'PreToolUse',
};

/**
 * Per-hook timeouts neuron requests, in seconds (Claude Code's `timeout`
 * field is seconds, not ms — see the hooks config schema). Chosen well below
 * the harness's own documented ceilings (600s for command hooks generally,
 * 30s specifically for `UserPromptSubmit`) since a hung neuron process should
 * degrade the user's turn by a few seconds, not by the harness's full budget.
 */
const HOOK_TIMEOUT_SECONDS: Record<LifecyclePoint, number> = {
  'session-start': 20,
  'pre-prompt': 10,
  'context-reset': 5,
  'pre-command': 10,
};

/**
 * Truthful capability record for Claude Code, sourced from ticket 10's
 * research (`code.claude.com/docs/en/hooks`). `session-start` and
 * `pre-prompt` are the two load-bearing points: both documented with a
 * per-turn or per-session guarantee, a 10,000-character payload cap (spill to
 * file beyond it — never relied on, ADR 0014 §4), and clear exit-code
 * semantics. `context-reset` never injects by design (ADR 0014 §5): clearing
 * the session ledger is a side effect, not context, so it only needs the
 * `PreCompact` hook to run, not to carry a payload.
 */
function capability(): CapabilityMap {
  return {
    'session-start': {
      injects: true,
      payloadCapChars: 10000,
      failurePosture: 'fail-open',
      timeoutMs: 600000,
      caveats: ['Neuron requests its own 20s timeout, well under the harness default.'],
    },
    'pre-prompt': {
      injects: true,
      payloadCapChars: 10000,
      failurePosture: 'fail-open',
      timeoutMs: 30000,
      caveats: [
        'Exit code 2 blocks the prompt; neuron deliberately never uses it (ADR 0014 fail-safe posture).',
      ],
    },
    'context-reset': {
      injects: false,
      payloadCapChars: 'unknown',
      failurePosture: 'fail-open',
      timeoutMs: 600000,
      caveats: ['Only clears the session ledger; no payload is ever sent from this point.'],
    },
    'pre-command': {
      injects: true,
      payloadCapChars: 10000,
      failurePosture: 'fail-open',
      timeoutMs: 600000,
      caveats: [
        'Sourced from a direct fetch of code.claude.com/docs/en/hooks during ticket 22 (neuron-2.4.0), not assumed from pre-prompt\'s own record: the 10,000-char output cap is shared across every hook point (confirmed the same figure applies to PreToolUse), but the timeout is not — PreToolUse uses the general 600s command-hook default, not UserPromptSubmit\'s own 30s figure.',
        'A timed-out, erroring, or non-zero-exit PreToolUse hook does not block the tool call — it fails open and the call proceeds through the normal permission flow regardless. Matches ADR 0014\'s existing fail-safe posture; neuron never sets a permissionDecision here either way.',
        'Fires for every tool call, not just Bash — additionalContext also renders after the tool has already run, next to its result, not before (ADR 0014\'s 2026-08-10 amendment, item 3). The hook handler no-ops for non-Bash tool calls rather than relying on the matcher to filter them.',
      ],
    },
  };
}

function targetFilePath(projectDir: string, target: HookTarget): string {
  switch (target) {
    case 'user-global':
      return path.join(os.homedir(), '.claude', 'settings.json');
    case 'project-committed':
      return path.join(projectDir, '.claude', 'settings.json');
    case 'project-local':
      return path.join(projectDir, '.claude', 'settings.local.json');
  }
}

/** All three candidate paths — used by `uninstall`/`verify`, which don't know which one `install` chose. */
function allCandidatePaths(projectDir: string): HookTarget[] {
  return ['user-global', 'project-committed', 'project-local'];
}

interface HookCommandEntry {
  type: 'command';
  command: string;
  args: string[];
  timeout: number;
}

interface MatcherGroup {
  matcher?: string;
  hooks: unknown[];
}

function proposedHook(point: LifecyclePoint): HookCommandEntry {
  return {
    type: 'command',
    command: 'neuron',
    args: ['hook', CLAUDE_CODE_HARNESS_ID, point],
    timeout: HOOK_TIMEOUT_SECONDS[point],
  };
}

function isNeuronHook(entry: unknown, point: LifecyclePoint): entry is HookCommandEntry {
  if (!entry || typeof entry !== 'object') return false;
  const h = entry as Record<string, unknown>;
  return (
    h.type === 'command' &&
    h.command === 'neuron' &&
    Array.isArray(h.args) &&
    h.args[0] === 'hook' &&
    h.args[1] === CLAUDE_CODE_HARNESS_ID &&
    h.args[2] === point
  );
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

function readSettings(filePath: string): Record<string, unknown> {
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

function writeSettings(filePath: string, settings: Record<string, unknown>): void {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(settings, null, 2) + '\n', 'utf8');
}

export class ClaudeCodeAdapter implements HarnessAdapter {
  readonly id = CLAUDE_CODE_HARNESS_ID;

  detect(projectDir: string): boolean {
    return fs.existsSync(path.join(projectDir, '.claude'));
  }

  capability(): CapabilityMap {
    return capability();
  }

  async install(projectDir: string, options: InstallOptions): Promise<InstallResult> {
    const targetPath = targetFilePath(projectDir, options.target);
    const settings = readSettings(targetPath);
    const hooks = (settings.hooks && typeof settings.hooks === 'object' ? settings.hooks : {}) as Record<
      string,
      MatcherGroup[]
    >;

    const points: InstallResult['points'] = {
      'session-start': 'unchanged',
      'pre-prompt': 'unchanged',
      'context-reset': 'unchanged',
      'pre-command': 'unchanged',
    };

    for (const point of LIFECYCLE_POINTS) {
      const eventName = EVENT_NAME[point];
      const groups: MatcherGroup[] = Array.isArray(hooks[eventName]) ? hooks[eventName] : [];
      const proposed = proposedHook(point);
      const existingIndex = findOwnGroup(groups, point);

      if (existingIndex === -1) {
        groups.push({ matcher: '*', hooks: [proposed] });
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
            groups[existingIndex] = { matcher: '*', hooks: [proposed] };
            points[point] = 'written';
          } else {
            points[point] = 'kept-existing';
          }
        }
      }

      hooks[eventName] = groups;
    }

    settings.hooks = hooks;
    writeSettings(targetPath, settings);

    return { harness: this.id, targetPath, target: options.target, points };
  }

  async uninstall(projectDir: string): Promise<UninstallResult> {
    const removed: UninstallResult['removed'] = [];

    for (const target of allCandidatePaths(projectDir)) {
      const targetPath = targetFilePath(projectDir, target);
      if (!fs.existsSync(targetPath)) continue;

      let settings: Record<string, unknown>;
      try {
        settings = readSettings(targetPath);
      } catch {
        // An unparsable file was never neuron's to touch; skip it rather than fail the whole uninstall.
        continue;
      }
      const hooks = (settings.hooks && typeof settings.hooks === 'object' ? settings.hooks : {}) as Record<
        string,
        MatcherGroup[]
      >;

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
        if (Object.keys(hooks).length > 0) settings.hooks = hooks;
        else delete settings.hooks;
        writeSettings(targetPath, settings);
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

      for (const target of allCandidatePaths(projectDir)) {
        const targetPath = targetFilePath(projectDir, target);
        if (!fs.existsSync(targetPath)) continue;
        let settings: Record<string, unknown>;
        try {
          settings = readSettings(targetPath);
        } catch {
          continue;
        }
        const hooks = (settings.hooks && typeof settings.hooks === 'object' ? settings.hooks : {}) as Record<
          string,
          MatcherGroup[]
        >;
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
