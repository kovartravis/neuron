import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { execSync } from 'node:child_process';
import path from 'node:path';
import fs from 'node:fs';
import { openDatabase } from './index.js';

describe('Neuron CLI Core & Flag Options', () => {
  const tempDbDir = path.join(process.cwd(), 'src/__tests__/temp-cli');
  let tempDbPath: string;
  let projectDir: string;

  beforeAll(() => {
    fs.mkdirSync(tempDbDir, { recursive: true });
  });

  beforeEach(() => {
    tempDbPath = path.join(tempDbDir, `test-cli-${Date.now()}-${Math.random().toString(36).slice(2)}.sqlite`);
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

  it('should support the master --help screen', () => {
    const cliPath = path.join(process.cwd(), 'dist/cli.js');
    const env = { ...process.env, NEURON_DB_PATH: tempDbPath, NEURON_MOCK_EMBEDDER: 'true' };

    const emptyStdout = execSync(`node ${cliPath}`, { env, cwd: projectDir }).toString();
    expect(emptyStdout).toContain('Usage: neuron');
    expect(emptyStdout).toContain('init');
    expect(emptyStdout).toContain('status');
    expect(emptyStdout).toContain('learn');

    const helpStdout = execSync(`node ${cliPath} --help`, { env, cwd: projectDir }).toString();
    expect(helpStdout).toContain('Usage: neuron');

    const shortHelpStdout = execSync(`node ${cliPath} -h`, { env, cwd: projectDir }).toString();
    expect(shortHelpStdout).toContain('Usage: neuron');
  });

  it('should support adding learnings and other categories with custom importance, tolerating the deprecated --scope flag', () => {
    const cliPath = path.join(process.cwd(), 'dist/cli.js');
    const env = { ...process.env, NEURON_DB_PATH: tempDbPath, NEURON_MOCK_EMBEDDER: 'true' };

    const addLearnStdout = execSync(
      `node ${cliPath} learn add "Important design rule" --importance 5 --scope custom-scope --tags design`,
      { env, cwd: projectDir }
    ).toString();
    const addLearnRes = JSON.parse(addLearnStdout);
    expect(addLearnRes.status).toBe('created');

    const addHistStdout = execSync(
      `node ${cliPath} memory add "Crucial pipeline update" --category history --importance 4 --scope global --tags CI`,
      { env, cwd: projectDir }
    ).toString();
    const addHistRes = JSON.parse(addHistStdout);
    expect(addHistRes.status).toBe('created');

    const db = openDatabase(tempDbPath);

    // --scope is accepted (deprecated, ticket 38) but has no effect and no
    // longer exists as a column at all.
    const l1 = db.prepare('SELECT importance FROM memories WHERE id = ?').get(addLearnRes.id) as { importance: number };
    expect(l1.importance).toBe(5);

    const h1 = db.prepare('SELECT importance FROM memories WHERE id = ?').get(addHistRes.id) as { importance: number };
    expect(h1.importance).toBe(4);

    db.close();
  });

  it('should validate --importance flag at the CLI layer', () => {
    const cliPath = path.join(process.cwd(), 'dist/cli.js');
    const env = { ...process.env, NEURON_DB_PATH: tempDbPath, NEURON_MOCK_EMBEDDER: 'true' };

    expect(() => {
      execSync(`node ${cliPath} learn add "Invalid rule" --importance 6`, { env, cwd: projectDir, stdio: 'pipe' });
    }).toThrow(/--importance must be an integer between 1 and 5/);

    expect(() => {
      execSync(`node ${cliPath} memory add "Invalid entry" --category history --importance abc`, { env, cwd: projectDir, stdio: 'pipe' });
    }).toThrow(/--importance must be an integer between 1 and 5/);
  });

  it('should ignore the deprecated --scopes flag on query, returning every match regardless of its value (ticket 38)', () => {
    const cliPath = path.join(process.cwd(), 'dist/cli.js');
    const env = { ...process.env, NEURON_DB_PATH: tempDbPath, NEURON_MOCK_EMBEDDER: 'true' };

    // --not-a-reversal: these two entries only differ by "Alpha"/"Beta" —
    // this test exercises the deprecated --scopes flag, not the write-time
    // near-dup gate (ticket 17 / Ticket 6, neuron-2.4.2).
    execSync(`node ${cliPath} learn add "Scope Alpha rule" --scope alpha --not-a-reversal`, { env, cwd: projectDir });
    execSync(`node ${cliPath} learn add "Scope Beta rule" --scope beta --not-a-reversal`, { env, cwd: projectDir });

    // --scopes no longer filters anything — every stored entry matches
    // regardless of what value (or how many) is passed.
    const queryOneStdout = execSync(`node ${cliPath} learn query "rule" --scopes alpha`, { env, cwd: projectDir }).toString();
    const queryOneRes = JSON.parse(queryOneStdout);
    expect(queryOneRes.results).toHaveLength(2);

    const queryGammaStdout = execSync(`node ${cliPath} learn query "rule" --scopes gamma`, { env, cwd: projectDir }).toString();
    const queryGammaRes = JSON.parse(queryGammaStdout);
    expect(queryGammaRes.results).toHaveLength(2);

    // Both entries share the query token, matching the "rule" pair above —
    // ticket 41's lexical relevance gate rejects a result with no FTS match,
    // so a genuinely unrelated second entry (e.g. "Beta deployment finished")
    // would be excluded regardless of --scopes, which is not what this test
    // is checking.
    execSync(`node ${cliPath} memory add "Alpha pipeline complete" --category history --scope alpha`, { env, cwd: projectDir });
    execSync(`node ${cliPath} memory add "Beta pipeline finished" --category history --scope beta`, { env, cwd: projectDir });

    const histGammaStdout = execSync(`node ${cliPath} memory query "pipeline" --category history --scopes gamma`, { env, cwd: projectDir }).toString();
    const histGammaRes = JSON.parse(histGammaStdout);
    expect(histGammaRes.results).toHaveLength(2);
  });
});
