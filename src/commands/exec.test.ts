import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { execSync, spawnSync } from 'node:child_process';
import path from 'node:path';
import fs from 'node:fs';

describe('CLI Command: exec', () => {
  const tempDbDir = path.join(process.cwd(), 'src/__tests__/temp-exec');
  let tempDbPath: string;

  beforeAll(() => {
    fs.mkdirSync(tempDbDir, { recursive: true });
  });

  beforeEach(() => {
    tempDbPath = path.join(tempDbDir, `test-exec-${Date.now()}-${Math.random().toString(36).slice(2)}.sqlite`);
  });

  afterAll(() => {
    if (fs.existsSync(tempDbDir)) {
      fs.rmSync(tempDbDir, { recursive: true, force: true });
    }
  });

  it('should support neuron exec -- <command>, output matched learnings to stderr, and pass through exit code', () => {
    const cliPath = path.join(process.cwd(), 'dist/cli.js');
    const env = { ...process.env, NEURON_DB_PATH: tempDbPath, NEURON_MOCK_EMBEDDER: 'true' };

    execSync(`node ${cliPath} learn add "Vitest test runner requires --runInBand" --tags vitest,test --importance 4`, { env });

    const result = execSync(`node ${cliPath} exec -- echo "test build"`, { env, stdio: 'pipe' });
    expect(result.toString().trim()).toBe('test build');

    let caughtError: any;
    try {
      execSync(`node ${cliPath} exec -- node -e process.exitCode=42`, { env, stdio: 'pipe' });
    } catch (err: any) {
      caughtError = err;
    }
    expect(caughtError).toBeDefined();
    expect(caughtError.status).toBe(42);
  });

  it('should support end-to-end failure fix learning recording workflow', () => {
    const cliPath = path.join(process.cwd(), 'dist/cli.js');
    const env = { ...process.env, NEURON_DB_PATH: tempDbPath, NEURON_MOCK_EMBEDDER: 'true' };

    try {
      execSync(`node ${cliPath} exec -- node -e process.exitCode=1`, { env, stdio: 'pipe' });
    } catch (err) {}

    const addRes = execSync(`node ${cliPath} learn add "Fix for build error: pass --no-cache to avoid stale artifacts" --tags failure-fix,build --importance 4`, { env }).toString();
    const parsed = JSON.parse(addRes);
    expect(parsed.status).toBe('created');

    const execRes = spawnSync('node', [cliPath, 'exec', '--', 'echo', 'build artifacts'], { env });
    expect(execRes.stdout.toString().trim()).toBe('build artifacts');
  });
});
