import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { execSync } from 'node:child_process';
import path from 'node:path';
import fs from 'node:fs';
import { openDatabase } from './index.js';

describe('Neuron CLI Core & Flag Options', () => {
  const tempDbDir = path.join(process.cwd(), 'src/__tests__/temp-cli');
  let tempDbPath: string;

  beforeAll(() => {
    fs.mkdirSync(tempDbDir, { recursive: true });
  });

  beforeEach(() => {
    tempDbPath = path.join(tempDbDir, `test-cli-${Date.now()}-${Math.random().toString(36).slice(2)}.sqlite`);
  });

  afterAll(() => {
    if (fs.existsSync(tempDbDir)) {
      fs.rmSync(tempDbDir, { recursive: true, force: true });
    }
  });

  it('should support the master --help screen', () => {
    const cliPath = path.join(process.cwd(), 'dist/cli.js');
    const env = { ...process.env, NEURON_DB_PATH: tempDbPath, NEURON_MOCK_EMBEDDER: 'true' };

    const emptyStdout = execSync(`node ${cliPath}`, { env }).toString();
    expect(emptyStdout).toContain('Usage: neuron');
    expect(emptyStdout).toContain('init');
    expect(emptyStdout).toContain('status');
    expect(emptyStdout).toContain('learn');
    expect(emptyStdout).toContain('history');

    const helpStdout = execSync(`node ${cliPath} --help`, { env }).toString();
    expect(helpStdout).toContain('Usage: neuron');

    const shortHelpStdout = execSync(`node ${cliPath} -h`, { env }).toString();
    expect(shortHelpStdout).toContain('Usage: neuron');
  });

  it('should support adding learnings and history with custom importance and scope flags', () => {
    const cliPath = path.join(process.cwd(), 'dist/cli.js');
    const env = { ...process.env, NEURON_DB_PATH: tempDbPath, NEURON_MOCK_EMBEDDER: 'true' };

    const addLearnStdout = execSync(
      `node ${cliPath} learn add "Important design rule" --importance 5 --scope custom-scope --tags design`,
      { env }
    ).toString();
    const addLearnRes = JSON.parse(addLearnStdout);
    expect(addLearnRes.status).toBe('created');

    const addHistStdout = execSync(
      `node ${cliPath} history add "Crucial pipeline update" --importance 4 --scope global --tags CI`,
      { env }
    ).toString();
    const addHistRes = JSON.parse(addHistStdout);
    expect(addHistRes.status).toBe('created');

    const db = openDatabase(tempDbPath);
    
    const l1 = db.prepare('SELECT scope, importance FROM memories WHERE id = ?').get(addLearnRes.id) as { scope: string; importance: number };
    expect(l1.scope).toBe('custom-scope');
    expect(l1.importance).toBe(5);

    const h1 = db.prepare('SELECT scope, importance FROM memories WHERE id = ?').get(addHistRes.id) as { scope: string; importance: number };
    expect(h1.scope).toBe('global');
    expect(h1.importance).toBe(4);

    db.close();
  });

  it('should validate --importance flag at the CLI layer', () => {
    const cliPath = path.join(process.cwd(), 'dist/cli.js');
    const env = { ...process.env, NEURON_DB_PATH: tempDbPath, NEURON_MOCK_EMBEDDER: 'true' };

    expect(() => {
      execSync(`node ${cliPath} learn add "Invalid rule" --importance 6`, { env, stdio: 'pipe' });
    }).toThrow(/--importance must be an integer between 1 and 5/);

    expect(() => {
      execSync(`node ${cliPath} history add "Invalid history" --importance abc`, { env, stdio: 'pipe' });
    }).toThrow(/--importance must be an integer between 1 and 5/);
  });

  it('should support querying learnings and history by specific scopes via the --scopes flag', () => {
    const cliPath = path.join(process.cwd(), 'dist/cli.js');
    const env = { ...process.env, NEURON_DB_PATH: tempDbPath, NEURON_MOCK_EMBEDDER: 'true' };

    execSync(`node ${cliPath} learn add "Scope Alpha rule" --scope alpha`, { env });
    execSync(`node ${cliPath} learn add "Scope Beta rule" --scope beta`, { env });

    const queryAlphaStdout = execSync(`node ${cliPath} learn query "rule" --scopes alpha`, { env }).toString();
    const queryAlphaRes = JSON.parse(queryAlphaStdout);
    expect(queryAlphaRes.results).toHaveLength(1);
    expect(queryAlphaRes.results[0].content).toBe('Scope Alpha rule');

    const queryBothStdout = execSync(`node ${cliPath} learn query "rule" --scopes alpha,beta`, { env }).toString();
    const queryBothRes = JSON.parse(queryBothStdout);
    expect(queryBothRes.results).toHaveLength(2);

    const queryGammaStdout = execSync(`node ${cliPath} learn query "rule" --scopes gamma`, { env }).toString();
    const queryGammaRes = JSON.parse(queryGammaStdout);
    expect(queryGammaRes.results).toHaveLength(0);

    execSync(`node ${cliPath} history add "Alpha pipeline complete" --scope alpha`, { env });
    execSync(`node ${cliPath} history add "Beta deployment finished" --scope beta`, { env });

    const histAlphaStdout = execSync(`node ${cliPath} history query "pipeline" --scopes alpha`, { env }).toString();
    const histAlphaRes = JSON.parse(histAlphaStdout);
    expect(histAlphaRes.results).toHaveLength(1);
    expect(histAlphaRes.results[0].content).toBe('Alpha pipeline complete');

    const histGammaStdout = execSync(`node ${cliPath} history query "pipeline" --scopes gamma`, { env }).toString();
    const histGammaRes = JSON.parse(histGammaStdout);
    expect(histGammaRes.results).toHaveLength(0);
  });
});
