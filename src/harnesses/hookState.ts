import fs from 'node:fs';
import path from 'node:path';
import { LifecyclePoint, LIFECYCLE_POINTS } from './types.js';
import { hookCacheDir } from './cacheDir.js';

/**
 * Firing evidence, not inference from file contents. Ticket 10 found no
 * harness researched documents an external way to confirm a registered hook
 * actually *fired* — so neuron manufactures its own evidence: the hook
 * command records a timestamp the moment it runs, before doing any of the
 * work that could fail. `verify()` reads this file to answer "is this hook
 * firing" as a fact, not a guess from `settings.json` being present.
 */
interface HookStateFile {
  points: Partial<Record<LifecyclePoint, { lastFiredAt: string; fireCount: number }>>;
}

function statePath(projectRoot: string, harnessId: string): string {
  return path.join(hookCacheDir(projectRoot), `state-${harnessId}.json`);
}

function readFile(projectRoot: string, harnessId: string): HookStateFile {
  try {
    const parsed = JSON.parse(fs.readFileSync(statePath(projectRoot, harnessId), 'utf8'));
    return { points: parsed.points ?? {} };
  } catch {
    return { points: {} };
  }
}

/**
 * Records that `point` just fired. Callers should invoke this before doing
 * any work that could throw or time out, so a downstream failure still
 * leaves accurate evidence that the hook itself ran — the fail-safe posture
 * (ADR 0014) degrades recall, not the record of whether recall was attempted.
 */
export function recordFired(projectRoot: string, harnessId: string, point: LifecyclePoint): void {
  const filePath = statePath(projectRoot, harnessId);
  const current = readFile(projectRoot, harnessId);
  const existing = current.points[point];
  current.points[point] = {
    lastFiredAt: new Date().toISOString(),
    fireCount: (existing?.fireCount ?? 0) + 1,
  };
  try {
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, JSON.stringify(current), 'utf8');
  } catch {
    // Firing evidence is best-effort itself: never let recording it be the
    // reason a hook fails.
  }
}

export function readFiringState(
  projectRoot: string,
  harnessId: string
): Record<LifecyclePoint, { lastFiredAt?: string; fireCount: number }> {
  const state = readFile(projectRoot, harnessId);
  const result = {} as Record<LifecyclePoint, { lastFiredAt?: string; fireCount: number }>;
  for (const point of LIFECYCLE_POINTS) {
    const entry = state.points[point];
    result[point] = { lastFiredAt: entry?.lastFiredAt, fireCount: entry?.fireCount ?? 0 };
  }
  return result;
}
