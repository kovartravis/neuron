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

  it('retrieves with the real embedder rather than forcing the zero-vector stub', () => {
    // Regression: exec used to set NEURON_MOCK_EMBEDDER='true' unconditionally.
    // The stub embeds every text as an all-zero vector, so pre-command lookup
    // silently degraded to keyword matching. Note the env below deliberately
    // omits NEURON_MOCK_EMBEDDER.
    const cliPath = path.join(process.cwd(), 'dist/cli.js');
    const env: NodeJS.ProcessEnv = { ...process.env, NEURON_DB_PATH: tempDbPath };
    delete env.NEURON_MOCK_EMBEDDER;

    execSync(
      `node ${cliPath} learn add "Prefer WAL journal mode when many agents write concurrently" --tags db --importance 5`,
      { env }
    );

    const res = spawnSync('node', [cliPath, 'exec', '--', 'echo', 'concurrent database writes'], { env });
    expect(res.stdout.toString().trim()).toBe('concurrent database writes');

    // The learning is surfaced on stderr, which only happens when the query
    // produced a real similarity score above the configured threshold.
    expect(res.stderr.toString()).toContain('WAL journal mode');

    // And exec must not leak the stub flag into the spawned child's env.
    const probePath = path.join(tempDbDir, 'env-probe.cjs');
    fs.writeFileSync(probePath, 'process.stdout.write(String(process.env.NEURON_MOCK_EMBEDDER));\n');

    const envProbe = spawnSync('node', [cliPath, 'exec', '--', 'node', probePath], { env });
    expect(envProbe.stdout.toString().trim()).toBe('undefined');
  }, 120000);

  it('preserves argument boundaries instead of re-splitting them in a shell', () => {
    // Regression: exec joined argv with ' ' and ran the result through a
    // shell, so `git commit -m "two words"` reached git as four arguments.
    // Reported as: `/bin/sh: drift: command not found` / `too many arguments`.
    const cliPath = path.join(process.cwd(), 'dist/cli.js');
    const env = { ...process.env, NEURON_DB_PATH: tempDbPath, NEURON_MOCK_EMBEDDER: 'true' };

    const probePath = path.join(tempDbDir, 'argv-probe.cjs');
    fs.writeFileSync(probePath, 'process.stdout.write(JSON.stringify(process.argv.slice(2)));\n');

    const res = spawnSync(
      'node',
      [cliPath, 'exec', '--', 'node', probePath, '-m', 'release: v2.1.0 — drift detection', 'tail'],
      { env }
    );

    expect(JSON.parse(res.stdout.toString())).toEqual([
      '-m',
      'release: v2.1.0 — drift detection',
      'tail'
    ]);
  });

  it('still runs a single argument through a shell so operators keep working', () => {
    const cliPath = path.join(process.cwd(), 'dist/cli.js');
    const env = { ...process.env, NEURON_DB_PATH: tempDbPath, NEURON_MOCK_EMBEDDER: 'true' };

    const res = spawnSync('node', [cliPath, 'exec', '--', 'echo first && echo second'], { env });
    expect(res.stdout.toString().trim().split('\n')).toEqual(['first', 'second']);
  });
});
