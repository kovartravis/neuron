import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { execSync } from 'node:child_process';
import path from 'node:path';
import fs from 'node:fs';

describe('CLI Command: status', () => {
  const tempDbDir = path.join(process.cwd(), 'src/__tests__/temp-status');
  let tempDbPath: string;

  beforeAll(() => {
    fs.mkdirSync(tempDbDir, { recursive: true });
  });

  beforeEach(() => {
    tempDbPath = path.join(tempDbDir, `test-status-${Date.now()}-${Math.random().toString(36).slice(2)}.sqlite`);
  });

  afterAll(() => {
    if (fs.existsSync(tempDbDir)) {
      fs.rmSync(tempDbDir, { recursive: true, force: true });
    }
  });

  it('should run "status" command and return status JSON', () => {
    const cliPath = path.join(process.cwd(), 'dist/cli.js');

    // NEURON_HOOK_CACHE_DIR isolates recallCost's ledger scan (ticket 07) from
    // this repo's own real, dogfooded hook cache (ticket 42's pattern) —
    // without it, status would summarize live session data from this very
    // conversation and the assertions below would be non-deterministic.
    const stdout = execSync(`node ${cliPath} status`, {
      env: {
        ...process.env,
        NEURON_DB_PATH: tempDbPath,
        NEURON_HOOK_CACHE_DIR: path.join(tempDbDir, 'hook-cache'),
      }
    }).toString();

    const status = JSON.parse(stdout);
    expect(status.db).toBe('ready');
    expect(status.project).toBeDefined();
    expect(status.projectRoot).toBe(process.cwd());
    expect(status.recallCost.epochCharBudget).toBe(18000);
    expect(status.recallCost.sessionsObserved).toBe(0);
  });
});
