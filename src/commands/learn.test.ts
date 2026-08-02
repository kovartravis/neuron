import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { execSync } from 'node:child_process';
import path from 'node:path';
import fs from 'node:fs';
import { openDatabase } from '../index.js';

describe('CLI Command: learn', () => {
  const tempDbDir = path.join(process.cwd(), 'src/__tests__/temp-learn');
  let tempDbPath: string;

  beforeAll(() => {
    fs.mkdirSync(tempDbDir, { recursive: true });
  });

  beforeEach(() => {
    tempDbPath = path.join(tempDbDir, `test-learn-${Date.now()}-${Math.random().toString(36).slice(2)}.sqlite`);
  });

  afterAll(() => {
    if (fs.existsSync(tempDbDir)) {
      fs.rmSync(tempDbDir, { recursive: true, force: true });
    }
  });

  it('should support learn add, list, query, and delete via CLI', () => {
    const cliPath = path.join(process.cwd(), 'dist/cli.js');
    const env = { ...process.env, NEURON_DB_PATH: tempDbPath, NEURON_MOCK_EMBEDDER: 'true' };

    const addStdout = execSync(`node ${cliPath} learn add "Always test first" --tags test,tdd`, { env }).toString();
    const addRes = JSON.parse(addStdout);
    expect(addRes.status).toBe('created');
    expect(addRes.id).toBeDefined();

    const listStdout = execSync(`node ${cliPath} learn list`, { env }).toString();
    const listRes = JSON.parse(listStdout);
    expect(listRes).toHaveLength(1);
    expect(listRes[0].content).toBe('Always test first');
    expect(listRes[0].tags).toEqual(['test', 'tdd']);

    const queryStdout = execSync(`node ${cliPath} learn query "test"`, { env }).toString();
    const queryRes = JSON.parse(queryStdout);
    expect(queryRes.results).toHaveLength(1);
    expect(queryRes.results[0].content).toBe('Always test first');

    const deleteStdout = execSync(`node ${cliPath} learn delete ${addRes.id}`, { env }).toString();
    const deleteRes = JSON.parse(deleteStdout);
    expect(deleteRes.status).toBe('deleted');
    expect(deleteRes.id).toBe(addRes.id);

    const listAfterDeleteStdout = execSync(`node ${cliPath} learn list`, { env }).toString();
    const listAfterDeleteRes = JSON.parse(listAfterDeleteStdout);
    expect(listAfterDeleteRes).toHaveLength(0);
  });

  it('should support updating learnings via the learn update CLI command', () => {
    const cliPath = path.join(process.cwd(), 'dist/cli.js');
    const env = { ...process.env, NEURON_DB_PATH: tempDbPath, NEURON_MOCK_EMBEDDER: 'true' };

    const addStdout = execSync(`node ${cliPath} learn add "Original learning content" --tags initial --importance 3 --scope initial-scope`, { env }).toString();
    const added = JSON.parse(addStdout);

    const updateStdout = execSync(
      `node ${cliPath} learn update ${added.id} "Updated learning content" --tags updated --importance 5 --scope updated-scope`,
      { env }
    ).toString();
    const updateRes = JSON.parse(updateStdout);
    expect(updateRes.status).toBe('updated');
    expect(updateRes.id).toBe(added.id);

    // --scope is accepted on both add and update (deprecated, ticket 38) but
    // has no effect and no longer exists as a column at all.
    const db = openDatabase(tempDbPath);
    const row = db.prepare('SELECT content, tags, importance FROM memories WHERE id = ?').get(added.id) as any;
    expect(row.content).toBe('Updated learning content');
    expect(JSON.parse(row.tags)).toEqual(['updated']);
    expect(row.importance).toBe(5);
    db.close();
  });

  it('should validate positional parameters for learn update CLI command', () => {
    const cliPath = path.join(process.cwd(), 'dist/cli.js');
    const env = { ...process.env, NEURON_DB_PATH: tempDbPath, NEURON_MOCK_EMBEDDER: 'true' };

    expect(() => {
      execSync(`node ${cliPath} learn update`, { env, stdio: 'pipe' });
    }).toThrow(/ID and content are required for learn update/);

    expect(() => {
      execSync(`node ${cliPath} learn update some-uuid`, { env, stdio: 'pipe' });
    }).toThrow(/ID and content are required for learn update/);
  });

  it('should support learn help screen and missing subcommand handling', () => {
    const cliPath = path.join(process.cwd(), 'dist/cli.js');
    const env = { ...process.env, NEURON_DB_PATH: tempDbPath, NEURON_MOCK_EMBEDDER: 'true' };

    const learnHelpStdout = execSync(`node ${cliPath} learn --help`, { env }).toString();
    expect(learnHelpStdout).toContain('Usage: neuron learn');
    expect(learnHelpStdout).toContain('add');

    expect(() => {
      execSync(`node ${cliPath} learn`, { env, stdio: 'pipe' });
    }).toThrow(/Usage: neuron learn/);
  });
});
