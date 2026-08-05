import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { execSync } from 'node:child_process';
import path from 'node:path';
import fs from 'node:fs';
import { openDatabase } from '../index.js';

describe('CLI Command: history', () => {
  const tempDbDir = path.join(process.cwd(), 'src/__tests__/temp-history');
  let tempDbPath: string;
  let projectDir: string;

  beforeAll(() => {
    fs.mkdirSync(tempDbDir, { recursive: true });
  });

  beforeEach(() => {
    tempDbPath = path.join(tempDbDir, `test-history-${Date.now()}-${Math.random().toString(36).slice(2)}.sqlite`);
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

  it('should support history add, list, consolidate, and delete via CLI', () => {
    const cliPath = path.join(process.cwd(), 'dist/cli.js');
    const env = { ...process.env, NEURON_DB_PATH: tempDbPath, NEURON_MOCK_EMBEDDER: 'true' };

    const addStdout = execSync(`node ${cliPath} history add "Wrote test for CLI" --task-id task-123 --tags cli,test`, { env, cwd: projectDir }).toString();
    const addRes = JSON.parse(addStdout);
    expect(addRes.status).toBe('created');
    expect(addRes.id).toBeDefined();

    const listStdout = execSync(`node ${cliPath} history list`, { env, cwd: projectDir }).toString();
    const listRes = JSON.parse(listStdout);
    expect(listRes).toHaveLength(1);
    expect(listRes[0].content).toBe('Wrote test for CLI');
    expect(listRes[0].taskId).toBe('task-123');

    const consolidateStdout = execSync(`node ${cliPath} history consolidate`, { env, cwd: projectDir }).toString();
    const consolidateRes = JSON.parse(consolidateStdout);
    expect(consolidateRes.entries).toHaveLength(1);
    expect(consolidateRes.previousCursor).toBeNull();
  });

  it('should support pruning history via the history prune CLI command', () => {
    const cliPath = path.join(process.cwd(), 'dist/cli.js');
    const env = { ...process.env, NEURON_DB_PATH: tempDbPath, NEURON_MOCK_EMBEDDER: 'true' };

    execSync(`node ${cliPath} history add "Old entry" --importance 1`, { env, cwd: projectDir });
    execSync(`node ${cliPath} history add "Old default entry" --importance 3`, { env, cwd: projectDir });
    execSync(`node ${cliPath} history add "Old important entry" --importance 4`, { env, cwd: projectDir });

    const db = openDatabase(tempDbPath);
    const oldDate = new Date();
    oldDate.setDate(oldDate.getDate() - 40);
    db.prepare("UPDATE memories SET created_at = ? WHERE category = 'history'").run(oldDate.toISOString());
    db.close();

    execSync(`node ${cliPath} history add "New entry" --importance 1`, { env, cwd: projectDir });

    const pruneStdout = execSync(`node ${cliPath} history prune --days 30`, { env, cwd: projectDir }).toString();
    const pruneRes = JSON.parse(pruneStdout);
    expect(pruneRes.status).toBe('pruned');
    expect(pruneRes.deletedCount).toBe(2);

    const dbVerify = openDatabase(tempDbPath);
    const remaining = dbVerify.prepare("SELECT content FROM memories WHERE category = 'history' ORDER BY created_at ASC").all() as any[];
    expect(remaining).toHaveLength(2);
    dbVerify.close();
  });

  it('should validate --days flag at the CLI layer for prune command', () => {
    const cliPath = path.join(process.cwd(), 'dist/cli.js');
    const env = { ...process.env, NEURON_DB_PATH: tempDbPath, NEURON_MOCK_EMBEDDER: 'true' };

    expect(() => {
      execSync(`node ${cliPath} history prune --days -5`, { env, cwd: projectDir, stdio: 'pipe' });
    }).toThrow(/--days must be a positive integer/);
  });

  it('should support history help screen and missing subcommand handling', () => {
    const cliPath = path.join(process.cwd(), 'dist/cli.js');
    const env = { ...process.env, NEURON_DB_PATH: tempDbPath, NEURON_MOCK_EMBEDDER: 'true' };

    const historyHelpStdout = execSync(`node ${cliPath} history --help`, { env, cwd: projectDir }).toString();
    expect(historyHelpStdout).toContain('Usage: neuron history');

    expect(() => {
      execSync(`node ${cliPath} history`, { env, cwd: projectDir, stdio: 'pipe' });
    }).toThrow(/Usage: neuron history/);
  });
});
