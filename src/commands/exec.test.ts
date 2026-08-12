import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { execSync, spawnSync } from 'node:child_process';
import path from 'node:path';
import fs from 'node:fs';
import os from 'node:os';

describe('CLI Command: exec', () => {
  const tempDbDir = path.join(process.cwd(), 'src/__tests__/temp-exec');
  let tempDbPath: string;
  let projectDir: string;

  beforeAll(() => {
    fs.mkdirSync(tempDbDir, { recursive: true });
  });

  beforeEach(() => {
    tempDbPath = path.join(tempDbDir, `test-exec-${Date.now()}-${Math.random().toString(36).slice(2)}.sqlite`);
    // Own project root, so config discovery stops here instead of walking up
    // into the neuron repo's own neuron.yaml (ticket 42).
    projectDir = path.join(tempDbDir, `proj-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    fs.mkdirSync(projectDir, { recursive: true });
    fs.writeFileSync(path.join(projectDir, 'package.json'), '{}');
  });

  afterAll(() => {
    if (fs.existsSync(tempDbDir)) {
      fs.rmSync(tempDbDir, { recursive: true, force: true });
    }
  });

  it('should support neuron exec -- <command>, output matched learnings to stderr, and pass through exit code', () => {
    const cliPath = path.join(process.cwd(), 'dist/cli.js');
    const env = { ...process.env, NEURON_DB_PATH: tempDbPath, NEURON_MOCK_EMBEDDER: 'true' };

    execSync(`node ${cliPath} learn add "Vitest test runner requires --runInBand" --tags vitest,test --importance 4`, { env, cwd: projectDir });

    const result = execSync(`node ${cliPath} exec -- echo "test build"`, { env, cwd: projectDir, stdio: 'pipe' });
    expect(result.toString().trim()).toBe('test build');

    let caughtError: any;
    try {
      execSync(`node ${cliPath} exec -- node -e process.exitCode=42`, { env, cwd: projectDir, stdio: 'pipe' });
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
      execSync(`node ${cliPath} exec -- node -e process.exitCode=1`, { env, cwd: projectDir, stdio: 'pipe' });
    } catch (err) {}

    const addRes = execSync(`node ${cliPath} learn add "Fix for build error: pass --no-cache to avoid stale artifacts" --tags failure-fix,build --importance 4`, { env, cwd: projectDir }).toString();
    const parsed = JSON.parse(addRes);
    expect(parsed.status).toBe('created');

    const execRes = spawnSync('node', [cliPath, 'exec', '--', 'echo', 'build artifacts'], { env, cwd: projectDir });
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

    // Phrased so the pair clears ticket 29's reranker leg too (calibrated
    // threshold, verified — not assumed): "Prefer WAL journal mode when many
    // agents write concurrently" scores below the cutoff against this exact
    // query text despite being genuinely on-topic.
    execSync(
      `node ${cliPath} learn add "For concurrent database writes from many agents, use WAL journal mode" --tags db --importance 5`,
      { env, cwd: projectDir }
    );

    const res = spawnSync('node', [cliPath, 'exec', '--', 'echo', 'concurrent database writes'], { env, cwd: projectDir });
    expect(res.stdout.toString().trim()).toBe('concurrent database writes');

    // The learning is surfaced on stderr, which only happens when the query
    // produced a real similarity score above the configured threshold.
    expect(res.stderr.toString()).toContain('WAL journal mode');

    // And exec must not leak the stub flag into the spawned child's env.
    const probePath = path.join(tempDbDir, 'env-probe.cjs');
    fs.writeFileSync(probePath, 'process.stdout.write(String(process.env.NEURON_MOCK_EMBEDDER));\n');

    const envProbe = spawnSync('node', [cliPath, 'exec', '--', 'node', probePath], { env, cwd: projectDir });
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
      { env, cwd: projectDir }
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

    const res = spawnSync('node', [cliPath, 'exec', '--', 'echo first && echo second'], { env, cwd: projectDir });
    expect(res.stdout.toString().trim().split('\n')).toEqual(['first', 'second']);
  });

  it('announces zero relevant results with a rejected count when the relevance gate clears the candidate list (ticket 41)', () => {
    // Isolated tmp project (own cwd + neuron.yaml, storage.mode: vector)
    // rather than this repo's own cwd/store: under the default `md` mode,
    // NEURON_DB_PATH only isolates SQLite, and reconcile would still pull in
    // this project's real, populated `.neuron/learning.md` (ticket 42), making
    // a "zero candidates" assertion unreliable.
    const tmpDir = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'neuron-exec-gate-test-')));
    fs.writeFileSync(
      path.join(tmpDir, 'neuron.yaml'),
      'version: "1.0"\nstorage:\n  mode: vector\n  path: .neuron\ncategories:\n  learning:\n    description: test\n'
    );

    try {
      const cliPath = path.join(process.cwd(), 'dist/cli.js');
      const dbPath = path.join(tmpDir, 'test.sqlite');
      const env = { ...process.env, NEURON_DB_PATH: dbPath, NEURON_MOCK_EMBEDDER: 'true' };

      // Mock embedder zeroes every vector, so a candidate survives only via
      // the lexical leg (an FTS match). This learning shares no token at all
      // with the command below, so the gate rejects it.
      execSync(`node ${cliPath} learn add "Prefer WAL journal mode for concurrent writers" --tags db`, { env, cwd: tmpDir });

      const res = spawnSync('node', [cliPath, 'exec', '--', 'echo', 'unrelated-token-xyz'], { env, cwd: tmpDir });
      expect(res.stderr.toString()).toContain('0 relevant learning(s)');
      expect(res.stderr.toString()).toContain('candidate(s) below relevance gate');
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });
});
