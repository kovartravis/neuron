import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { execSync } from 'node:child_process';
import path from 'node:path';
import fs from 'node:fs';

describe('Neuron CLI End-to-End', () => {
  const tempDbDir = path.join(process.cwd(), 'src/__tests__/temp');
  const tempDbPath = path.join(tempDbDir, 'test-cli.sqlite');

  beforeAll(() => {
    fs.mkdirSync(tempDbDir, { recursive: true });
  });

  afterAll(() => {
    if (fs.existsSync(tempDbPath)) {
      fs.unlinkSync(tempDbPath);
    }
    if (fs.existsSync(tempDbDir)) {
      fs.rmdirSync(tempDbDir);
    }
  });

  it('should run "status" command and return status JSON', () => {
    // Run CLI status command via tsx
    const cliPath = path.join(process.cwd(), 'src/cli.ts');
    
    const stdout = execSync(`npx tsx ${cliPath} status`, {
      env: {
        ...process.env,
        NEURON_DB_PATH: tempDbPath,
        // Mock embedder isn't easily injected via CLI unless we have a mock flag or mock env var.
        // But for status, we don't load the embedder or generate embeddings, so it's very fast and requires no network!
      }
    }).toString();

    const status = JSON.parse(stdout);
    expect(status.db).toBe('ready');
    expect(status.project).toBeDefined();
    expect(status.projectRoot).toBe(process.cwd());
  });

  it('should support learn add, list, query, and delete via CLI', () => {
    const cliPath = path.join(process.cwd(), 'src/cli.ts');
    const env = { ...process.env, NEURON_DB_PATH: tempDbPath, NEURON_MOCK_EMBEDDER: 'true' };

    // 1. Add learning
    const addStdout = execSync(`npx tsx ${cliPath} learn add "Always test first" --tags test,tdd`, { env }).toString();
    const addRes = JSON.parse(addStdout);
    expect(addRes.status).toBe('created');
    expect(addRes.id).toBeDefined();

    // 2. List learnings
    const listStdout = execSync(`npx tsx ${cliPath} learn list`, { env }).toString();
    const listRes = JSON.parse(listStdout);
    expect(listRes).toHaveLength(1);
    expect(listRes[0].content).toBe('Always test first');
    expect(listRes[0].tags).toEqual(['test', 'tdd']);

    // 3. Query learnings
    const queryStdout = execSync(`npx tsx ${cliPath} learn query "test"`, { env }).toString();
    const queryRes = JSON.parse(queryStdout);
    expect(queryRes.results).toHaveLength(1);
    expect(queryRes.results[0].content).toBe('Always test first');

    // 4. Delete learning
    const deleteStdout = execSync(`npx tsx ${cliPath} learn delete ${addRes.id}`, { env }).toString();
    const deleteRes = JSON.parse(deleteStdout);
    expect(deleteRes.status).toBe('deleted');
    expect(deleteRes.id).toBe(addRes.id);

    // 5. List after delete
    const listAfterDeleteStdout = execSync(`npx tsx ${cliPath} learn list`, { env }).toString();
    const listAfterDeleteRes = JSON.parse(listAfterDeleteStdout);
    expect(listAfterDeleteRes).toHaveLength(0);
  });

  it('should support history add, list, consolidate, and delete via CLI', () => {
    const cliPath = path.join(process.cwd(), 'src/cli.ts');
    const env = { ...process.env, NEURON_DB_PATH: tempDbPath, NEURON_MOCK_EMBEDDER: 'true' };

    // 1. Add history
    const addStdout = execSync(`npx tsx ${cliPath} history add "Wrote test for CLI" --task-id task-123 --tags cli,test`, { env }).toString();
    const addRes = JSON.parse(addStdout);
    expect(addRes.status).toBe('created');
    expect(addRes.id).toBeDefined();

    // 2. List history
    const listStdout = execSync(`npx tsx ${cliPath} history list`, { env }).toString();
    const listRes = JSON.parse(listStdout);
    expect(listRes).toHaveLength(1);
    expect(listRes[0].content).toBe('Wrote test for CLI');
    expect(listRes[0].taskId).toBe('task-123');
    expect(listRes[0].tags).toEqual(['cli', 'test']);

    // 3. Consolidate history
    const consolidateStdout = execSync(`npx tsx ${cliPath} history consolidate`, { env }).toString();
    const consolidateRes = JSON.parse(consolidateStdout);
    expect(consolidateRes.entries).toHaveLength(1);
    expect(consolidateRes.entries[0].content).toBe('Wrote test for CLI');
    expect(consolidateRes.previousCursor).toBeNull();

    // 4. Consolidate again (should be empty since cursor advanced)
    const consolidate2Stdout = execSync(`npx tsx ${cliPath} history consolidate`, { env }).toString();
    const consolidate2Res = JSON.parse(consolidate2Stdout);
    expect(consolidate2Res.entries).toHaveLength(0);
    expect(consolidate2Res.previousCursor).toBe(consolidateRes.consolidatedAt);
  });

  it('should support the init command to bootstrap AGENTS.md or CLAUDE.md', () => {
    const cliPath = path.join(process.cwd(), 'src/cli.ts');
    
    const initTempDir = path.join(tempDbDir, 'init-test-project');
    fs.mkdirSync(initTempDir, { recursive: true });

    const env = { ...process.env, NEURON_DB_PATH: tempDbPath, NEURON_MOCK_EMBEDDER: 'true' };

    // 1. Run init (should create AGENTS.md by default)
    execSync(`npx tsx ${cliPath} init`, { env, cwd: initTempDir });
    
    const agentsPath = path.join(initTempDir, 'AGENTS.md');
    expect(fs.existsSync(agentsPath)).toBe(true);
    
    const agentsContent = fs.readFileSync(agentsPath, 'utf8');
    expect(agentsContent).toContain('## Memory Store');
    expect(agentsContent).toContain('neuron learn query');

    // 2. Run init with --file CLAUDE.md
    execSync(`npx tsx ${cliPath} init --file CLAUDE.md`, { env, cwd: initTempDir });
    const claudePath = path.join(initTempDir, 'CLAUDE.md');
    expect(fs.existsSync(claudePath)).toBe(true);

    const claudeContent = fs.readFileSync(claudePath, 'utf8');
    expect(claudeContent).toContain('## Memory Store');

    // Clean up
    fs.unlinkSync(agentsPath);
    fs.unlinkSync(claudePath);
    fs.rmdirSync(initTempDir);
  });
});
