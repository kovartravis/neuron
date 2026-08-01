import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { execSync } from 'node:child_process';
import path from 'node:path';
import fs from 'node:fs';
import { openDatabase } from '../index.js';

describe('CLI Command: memory', () => {
  const tempDbDir = path.join(process.cwd(), 'src/__tests__/temp-memory-cmd');
  let tempDbPath: string;

  beforeAll(() => {
    fs.mkdirSync(tempDbDir, { recursive: true });
  });

  beforeEach(() => {
    tempDbPath = path.join(tempDbDir, `test-memory-${Date.now()}-${Math.random().toString(36).slice(2)}.sqlite`);
  });

  afterAll(() => {
    if (fs.existsSync(tempDbDir)) {
      fs.rmSync(tempDbDir, { recursive: true, force: true });
    }
  });

  it('should support memory add, query, list, and delete CLI subcommands with custom categories', () => {
    const cliPath = path.join(process.cwd(), 'dist/cli.js');
    const env = { ...process.env, NEURON_DB_PATH: tempDbPath, NEURON_MOCK_EMBEDDER: 'true' };

    // 1. Add entry to custom category "decisions"
    const addStdout = execSync(
      `node ${cliPath} memory add "Use SQLite WAL mode for concurrency" --category decisions --tags adr,db --importance 4`,
      { env }
    ).toString();
    const added = JSON.parse(addStdout);
    expect(added.status).toBe('created');
    expect(added.id).toBeDefined();

    // Verify record in SQLite database
    const db = openDatabase(tempDbPath);
    const row = db.prepare('SELECT category, content, importance FROM memories WHERE id = ?').get(added.id) as any;
    expect(row.category).toBe('decisions');
    expect(row.content).toBe('Use SQLite WAL mode for concurrency');
    expect(row.importance).toBe(4);
    db.close();

    // 2. Query entries filtered by category "decisions"
    const queryStdout = execSync(
      `node ${cliPath} memory query "SQLite WAL" --categories decisions`,
      { env }
    ).toString();
    const queryRes = JSON.parse(queryStdout);
    expect(queryRes.results.length).toBeGreaterThanOrEqual(1);
    const walMatch = queryRes.results.find((r: any) => r.content.includes('Use SQLite WAL mode for concurrency'));
    expect(walMatch).toBeDefined();
    expect(walMatch.category).toBe('decisions');

    // 3. List entries in category "decisions"
    const listStdout = execSync(
      `node ${cliPath} memory list --category decisions`,
      { env }
    ).toString();
    const listRes = JSON.parse(listStdout);
    expect(listRes.length).toBeGreaterThanOrEqual(1);

    // 4. Update entry in category "decisions"
    const updateStdout = execSync(
      `node ${cliPath} memory update ${added.id} "Use SQLite WAL mode with 5s busy timeout" --category decisions`,
      { env }
    ).toString();
    const updateRes = JSON.parse(updateStdout);
    expect(updateRes.status).toBe('updated');

    // 5. Delete entry
    const deleteStdout = execSync(
      `node ${cliPath} memory delete ${added.id} --category decisions`,
      { env }
    ).toString();
    const deleteRes = JSON.parse(deleteStdout);
    expect(deleteRes.status).toBe('deleted');
  });

  it('should validate --category requirement for memory add', () => {
    const cliPath = path.join(process.cwd(), 'dist/cli.js');
    const env = { ...process.env, NEURON_DB_PATH: tempDbPath, NEURON_MOCK_EMBEDDER: 'true' };

    expect(() => {
      execSync(`node ${cliPath} memory add "Content without category"`, { env, stdio: 'pipe' });
    }).toThrow(/--category is required/);
  });
});
