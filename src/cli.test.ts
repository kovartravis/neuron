import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { execSync } from 'node:child_process';
import path from 'node:path';
import fs from 'node:fs';
import Database from 'better-sqlite3';

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
      fs.rmSync(tempDbDir, { recursive: true, force: true });
    }
  });

  it('should run "status" command and return status JSON', () => {
    // Run CLI status command via compiled JS
    const cliPath = path.join(process.cwd(), 'dist/cli.js');
    
    const stdout = execSync(`node ${cliPath} status`, {
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
    const cliPath = path.join(process.cwd(), 'dist/cli.js');
    const env = { ...process.env, NEURON_DB_PATH: tempDbPath, NEURON_MOCK_EMBEDDER: 'true' };

    // 1. Add learning
    const addStdout = execSync(`node ${cliPath} learn add "Always test first" --tags test,tdd`, { env }).toString();
    const addRes = JSON.parse(addStdout);
    expect(addRes.status).toBe('created');
    expect(addRes.id).toBeDefined();

    // 2. List learnings
    const listStdout = execSync(`node ${cliPath} learn list`, { env }).toString();
    const listRes = JSON.parse(listStdout);
    expect(listRes).toHaveLength(1);
    expect(listRes[0].content).toBe('Always test first');
    expect(listRes[0].tags).toEqual(['test', 'tdd']);

    // 3. Query learnings
    const queryStdout = execSync(`node ${cliPath} learn query "test"`, { env }).toString();
    const queryRes = JSON.parse(queryStdout);
    expect(queryRes.results).toHaveLength(1);
    expect(queryRes.results[0].content).toBe('Always test first');

    // 4. Delete learning
    const deleteStdout = execSync(`node ${cliPath} learn delete ${addRes.id}`, { env }).toString();
    const deleteRes = JSON.parse(deleteStdout);
    expect(deleteRes.status).toBe('deleted');
    expect(deleteRes.id).toBe(addRes.id);

    // 5. List after delete
    const listAfterDeleteStdout = execSync(`node ${cliPath} learn list`, { env }).toString();
    const listAfterDeleteRes = JSON.parse(listAfterDeleteStdout);
    expect(listAfterDeleteRes).toHaveLength(0);
  });

  it('should support history add, list, consolidate, and delete via CLI', () => {
    const cliPath = path.join(process.cwd(), 'dist/cli.js');
    const env = { ...process.env, NEURON_DB_PATH: tempDbPath, NEURON_MOCK_EMBEDDER: 'true' };

    // 1. Add history
    const addStdout = execSync(`node ${cliPath} history add "Wrote test for CLI" --task-id task-123 --tags cli,test`, { env }).toString();
    const addRes = JSON.parse(addStdout);
    expect(addRes.status).toBe('created');
    expect(addRes.id).toBeDefined();

    // 2. List history
    const listStdout = execSync(`node ${cliPath} history list`, { env }).toString();
    const listRes = JSON.parse(listStdout);
    expect(listRes).toHaveLength(1);
    expect(listRes[0].content).toBe('Wrote test for CLI');
    expect(listRes[0].taskId).toBe('task-123');
    expect(listRes[0].tags).toEqual(['cli', 'test']);

    // 3. Consolidate history
    const consolidateStdout = execSync(`node ${cliPath} history consolidate`, { env }).toString();
    const consolidateRes = JSON.parse(consolidateStdout);
    expect(consolidateRes.entries).toHaveLength(1);
    expect(consolidateRes.entries[0].content).toBe('Wrote test for CLI');
    expect(consolidateRes.previousCursor).toBeNull();

    // 4. Consolidate again (should be empty since cursor advanced)
    const consolidate2Stdout = execSync(`node ${cliPath} history consolidate`, { env }).toString();
    const consolidate2Res = JSON.parse(consolidate2Stdout);
    expect(consolidate2Res.entries).toHaveLength(0);
    expect(consolidate2Res.previousCursor).toBe(consolidateRes.consolidatedAt);
  });

  it('should support the init command to bootstrap AGENTS.md or CLAUDE.md', () => {
    const cliPath = path.join(process.cwd(), 'dist/cli.js');
    
    const initTempDir = path.join(tempDbDir, 'init-test-project');
    fs.mkdirSync(initTempDir, { recursive: true });

    const env = { ...process.env, NEURON_DB_PATH: tempDbPath, NEURON_MOCK_EMBEDDER: 'true' };

    // 1. Run init (should create AGENTS.md by default)
    execSync(`node ${cliPath} init`, { env, cwd: initTempDir });
    
    const agentsPath = path.join(initTempDir, 'AGENTS.md');
    expect(fs.existsSync(agentsPath)).toBe(true);
    
    const agentsContent = fs.readFileSync(agentsPath, 'utf8');
    expect(agentsContent).toContain('## Memory Store');
    expect(agentsContent).toContain('neuron-memory');
    expect(agentsContent).not.toContain('neuron learn query');

    // 2. Run init with --file CLAUDE.md
    execSync(`node ${cliPath} init --file CLAUDE.md`, { env, cwd: initTempDir });
    const claudePath = path.join(initTempDir, 'CLAUDE.md');
    expect(fs.existsSync(claudePath)).toBe(true);

    const claudeContent = fs.readFileSync(claudePath, 'utf8');
    expect(claudeContent).toContain('## Memory Store');

    // Clean up
    fs.rmSync(initTempDir, { recursive: true });
  });

  it('neuron init: copies skill to detected harness dir (.agents/)', () => {
    const cliPath = path.join(process.cwd(), 'src/cli.ts');
    const initTempDir = path.join(tempDbDir, 'harness-agents-test');
    const agentsDir = path.join(initTempDir, '.agents');
    fs.mkdirSync(agentsDir, { recursive: true });

    const env = { ...process.env, NEURON_DB_PATH: tempDbPath, NEURON_MOCK_EMBEDDER: 'true' };

    const stdout = execSync(`npx tsx ${cliPath} init`, { env, cwd: initTempDir }).toString();
    const result = JSON.parse(stdout);

    const expectedSkillPath = path.join(initTempDir, '.agents', 'skills', 'neuron-memory', 'SKILL.md');
    expect(fs.existsSync(expectedSkillPath)).toBe(true);
    expect(result.skillsWritten).toContain(expectedSkillPath);

    // Clean up
    fs.rmSync(initTempDir, { recursive: true });
  });

  it('neuron init: copies skill to all detected harness dirs (.claude/ + .cursor/)', () => {
    const cliPath = path.join(process.cwd(), 'src/cli.ts');
    const initTempDir = path.join(tempDbDir, 'harness-multi-test');
    fs.mkdirSync(path.join(initTempDir, '.claude'), { recursive: true });
    fs.mkdirSync(path.join(initTempDir, '.cursor'), { recursive: true });

    const env = { ...process.env, NEURON_DB_PATH: tempDbPath, NEURON_MOCK_EMBEDDER: 'true' };

    const stdout = execSync(`npx tsx ${cliPath} init`, { env, cwd: initTempDir }).toString();
    const result = JSON.parse(stdout);

    const claudeSkill = path.join(initTempDir, '.claude', 'skills', 'neuron-memory', 'SKILL.md');
    const cursorSkill = path.join(initTempDir, '.cursor', 'skills', 'neuron-memory', 'SKILL.md');
    expect(fs.existsSync(claudeSkill)).toBe(true);
    expect(fs.existsSync(cursorSkill)).toBe(true);
    expect(result.skillsWritten).toContain(claudeSkill);
    expect(result.skillsWritten).toContain(cursorSkill);

    fs.rmSync(initTempDir, { recursive: true });
  });

  it('neuron init: falls back to .agents/skills/ when no harness dirs present', () => {
    const cliPath = path.join(process.cwd(), 'src/cli.ts');
    const initTempDir = path.join(tempDbDir, 'harness-fallback-test');
    fs.mkdirSync(initTempDir, { recursive: true });

    const env = { ...process.env, NEURON_DB_PATH: tempDbPath, NEURON_MOCK_EMBEDDER: 'true' };

    const stdout = execSync(`npx tsx ${cliPath} init`, { env, cwd: initTempDir }).toString();
    const result = JSON.parse(stdout);

    const fallbackSkill = path.join(initTempDir, '.agents', 'skills', 'neuron-memory', 'SKILL.md');
    expect(fs.existsSync(fallbackSkill)).toBe(true);
    expect(result.skillsWritten).toEqual([fallbackSkill]);

    fs.rmSync(initTempDir, { recursive: true });
  });

  it('neuron init: is idempotent — running twice overwrites skill without error', () => {
    const cliPath = path.join(process.cwd(), 'src/cli.ts');
    const initTempDir = path.join(tempDbDir, 'harness-idempotent-test');
    fs.mkdirSync(path.join(initTempDir, '.agents'), { recursive: true });

    const env = { ...process.env, NEURON_DB_PATH: tempDbPath, NEURON_MOCK_EMBEDDER: 'true' };

    // First run
    execSync(`npx tsx ${cliPath} init`, { env, cwd: initTempDir });
    // Second run — must not throw
    const stdout = execSync(`npx tsx ${cliPath} init`, { env, cwd: initTempDir }).toString();
    const result = JSON.parse(stdout);

    expect(result.status).toBe('initialized');
    const skillPath = path.join(initTempDir, '.agents', 'skills', 'neuron-memory', 'SKILL.md');
    expect(fs.existsSync(skillPath)).toBe(true);

    fs.rmSync(initTempDir, { recursive: true });
  });

  it('should support adding learnings and history with custom importance and scope flags', () => {
    const cliPath = path.join(process.cwd(), 'dist/cli.js');
    const env = { ...process.env, NEURON_DB_PATH: tempDbPath, NEURON_MOCK_EMBEDDER: 'true' };

    // 1. Add learning with importance and scope
    const addLearnStdout = execSync(
      `node ${cliPath} learn add "Important design rule" --importance 5 --scope custom-scope --tags design`,
      { env }
    ).toString();
    const addLearnRes = JSON.parse(addLearnStdout);
    expect(addLearnRes.status).toBe('created');

    // 2. Add history with importance and scope
    const addHistStdout = execSync(
      `node ${cliPath} history add "Crucial pipeline update" --importance 4 --scope global --tags CI`,
      { env }
    ).toString();
    const addHistRes = JSON.parse(addHistStdout);
    expect(addHistRes.status).toBe('created');

    // 3. Directly inspect the database to verify the values were written
    const db = new Database(tempDbPath);
    
    const l1 = db.prepare('SELECT scope, importance FROM learnings WHERE id = ?').get(addLearnRes.id) as { scope: string; importance: number };
    expect(l1.scope).toBe('custom-scope');
    expect(l1.importance).toBe(5);

    const h1 = db.prepare('SELECT scope, importance FROM history WHERE id = ?').get(addHistRes.id) as { scope: string; importance: number };
    expect(h1.scope).toBe('global');
    expect(h1.importance).toBe(4);

    db.close();
  });

  it('should validate --importance flag at the CLI layer', () => {
    const cliPath = path.join(process.cwd(), 'dist/cli.js');
    const env = { ...process.env, NEURON_DB_PATH: tempDbPath, NEURON_MOCK_EMBEDDER: 'true' };

    // 1. Invalid value: 6
    expect(() => {
      execSync(`node ${cliPath} learn add "Invalid rule" --importance 6`, { env, stdio: 'pipe' });
    }).toThrow(/--importance must be an integer between 1 and 5/);

    // 2. Invalid value: abc
    expect(() => {
      execSync(`node ${cliPath} history add "Invalid history" --importance abc`, { env, stdio: 'pipe' });
    }).toThrow(/--importance must be an integer between 1 and 5/);
  });

  it('should support querying learnings and history by specific scopes via the --scopes flag', () => {
    const cliPath = path.join(process.cwd(), 'dist/cli.js');
    const env = { ...process.env, NEURON_DB_PATH: tempDbPath, NEURON_MOCK_EMBEDDER: 'true' };

    // 1. Add learnings in different scopes
    execSync(`node ${cliPath} learn add "Scope Alpha rule" --scope alpha`, { env });
    execSync(`node ${cliPath} learn add "Scope Beta rule" --scope beta`, { env });

    // 2. Query only "alpha" scope
    const queryAlphaStdout = execSync(`node ${cliPath} learn query "rule" --scopes alpha`, { env }).toString();
    const queryAlphaRes = JSON.parse(queryAlphaStdout);
    expect(queryAlphaRes.results).toHaveLength(1);
    expect(queryAlphaRes.results[0].content).toBe('Scope Alpha rule');

    // 3. Query multiple scopes: "alpha" and "beta"
    const queryBothStdout = execSync(`node ${cliPath} learn query "rule" --scopes alpha,beta`, { env }).toString();
    const queryBothRes = JSON.parse(queryBothStdout);
    expect(queryBothRes.results).toHaveLength(2);

    // 4. Query a scope that has nothing
    const queryGammaStdout = execSync(`node ${cliPath} learn query "rule" --scopes gamma`, { env }).toString();
    const queryGammaRes = JSON.parse(queryGammaStdout);
    expect(queryGammaRes.results).toHaveLength(0);

    // 5. Add history in different scopes
    execSync(`node ${cliPath} history add "Alpha pipeline complete" --scope alpha`, { env });
    execSync(`node ${cliPath} history add "Beta deployment finished" --scope beta`, { env });

    // 6. Query history on "alpha"
    const histAlphaStdout = execSync(`node ${cliPath} history query "pipeline" --scopes alpha`, { env }).toString();
    const histAlphaRes = JSON.parse(histAlphaStdout);
    expect(histAlphaRes.results).toHaveLength(1);
    expect(histAlphaRes.results[0].content).toBe('Alpha pipeline complete');

    // 7. Query history on "gamma"
    const histGammaStdout = execSync(`node ${cliPath} history query "pipeline" --scopes gamma`, { env }).toString();
    const histGammaRes = JSON.parse(histGammaStdout);
    expect(histGammaRes.results).toHaveLength(0);
  });

  it('should support pruning history via the history prune CLI command', () => {
    const cliPath = path.join(process.cwd(), 'dist/cli.js');
    const env = { ...process.env, NEURON_DB_PATH: tempDbPath, NEURON_MOCK_EMBEDDER: 'true' };

    // 1. Clear history table to ensure isolation
    const dbClean = new Database(tempDbPath);
    dbClean.prepare('DELETE FROM history').run();
    dbClean.close();

    // 2. Add some history entries
    execSync(`node ${cliPath} history add "Old entry" --importance 1`, { env });
    execSync(`node ${cliPath} history add "Old important entry" --importance 4`, { env });

    // 2. Manipulate dates directly in SQLite
    const db = new Database(tempDbPath);
    const oldDate = new Date();
    oldDate.setDate(oldDate.getDate() - 40);
    const oldDateStr = oldDate.toISOString();
    db.prepare('UPDATE history SET created_at = ?').run(oldDateStr);
    db.close();

    // 3. Add a new history entry (should not be pruned because it is new)
    execSync(`node ${cliPath} history add "New entry" --importance 1`, { env });

    // 4. Run history prune with --days 30 (defaults to max importance 2)
    const pruneStdout = execSync(`node ${cliPath} history prune --days 30`, { env }).toString();
    const pruneRes = JSON.parse(pruneStdout);
    expect(pruneRes.status).toBe('pruned');
    expect(pruneRes.deletedCount).toBe(1);
    expect(pruneRes.project).toBeDefined();

    // 5. Verify database state
    const dbVerify = new Database(tempDbPath);
    const remaining = dbVerify.prepare('SELECT content FROM history ORDER BY created_at ASC').all() as any[];
    expect(remaining).toHaveLength(2);
    expect(remaining[0].content).toBe('Old important entry');
    expect(remaining[1].content).toBe('New entry');
    dbVerify.close();
  });

  it('should validate --days flag at the CLI layer for prune command', () => {
    const cliPath = path.join(process.cwd(), 'dist/cli.js');
    const env = { ...process.env, NEURON_DB_PATH: tempDbPath, NEURON_MOCK_EMBEDDER: 'true' };

    // 1. Invalid value: -5
    expect(() => {
      execSync(`node ${cliPath} history prune --days -5`, { env, stdio: 'pipe' });
    }).toThrow(/--days must be a positive integer/);

    // 2. Invalid value: abc
    expect(() => {
      execSync(`node ${cliPath} history prune --days abc`, { env, stdio: 'pipe' });
    }).toThrow(/--days must be a positive integer/);
  });

  it('should support updating learnings via the learn update CLI command', () => {
    const cliPath = path.join(process.cwd(), 'dist/cli.js');
    const env = { ...process.env, NEURON_DB_PATH: tempDbPath, NEURON_MOCK_EMBEDDER: 'true' };

    // 1. Add a learning
    const addStdout = execSync(`node ${cliPath} learn add "Original learning content" --tags initial --importance 3 --scope initial-scope`, { env }).toString();
    const added = JSON.parse(addStdout);

    // 2. Run learn update with positional content and overrides
    const updateStdout = execSync(
      `node ${cliPath} learn update ${added.id} "Updated learning content" --tags updated --importance 5 --scope updated-scope`,
      { env }
    ).toString();
    const updateRes = JSON.parse(updateStdout);
    expect(updateRes.status).toBe('updated');
    expect(updateRes.id).toBe(added.id);

    // 3. Verify database state
    const db = new Database(tempDbPath);
    const row = db.prepare('SELECT content, tags, importance, scope FROM learnings WHERE id = ?').get(added.id) as any;
    expect(row.content).toBe('Updated learning content');
    expect(JSON.parse(row.tags)).toEqual(['updated']);
    expect(row.importance).toBe(5);
    expect(row.scope).toBe('updated-scope');
    db.close();
  });

  it('should validate positional parameters for learn update CLI command', () => {
    const cliPath = path.join(process.cwd(), 'dist/cli.js');
    const env = { ...process.env, NEURON_DB_PATH: tempDbPath, NEURON_MOCK_EMBEDDER: 'true' };

    // 1. Missing both arguments
    expect(() => {
      execSync(`node ${cliPath} learn update`, { env, stdio: 'pipe' });
    }).toThrow(/ID and content are required for learn update/);

    // 2. Missing content argument
    expect(() => {
      execSync(`node ${cliPath} learn update some-uuid`, { env, stdio: 'pipe' });
    }).toThrow(/ID and content are required for learn update/);
  });

  it('should support the master --help screen', () => {
    const cliPath = path.join(process.cwd(), 'dist/cli.js');
    const env = { ...process.env, NEURON_DB_PATH: tempDbPath, NEURON_MOCK_EMBEDDER: 'true' };

    // 1. Run with no arguments
    const emptyStdout = execSync(`node ${cliPath}`, { env }).toString();
    expect(emptyStdout).toContain('Usage: neuron');
    expect(emptyStdout).toContain('init');
    expect(emptyStdout).toContain('status');
    expect(emptyStdout).toContain('learn');
    expect(emptyStdout).toContain('history');

    // 2. Run with --help
    const helpStdout = execSync(`node ${cliPath} --help`, { env }).toString();
    expect(helpStdout).toContain('Usage: neuron');

    // 3. Run with -h
    const shortHelpStdout = execSync(`node ${cliPath} -h`, { env }).toString();
    expect(shortHelpStdout).toContain('Usage: neuron');
  });

  it('should support namespace-specific help screens', () => {
    const cliPath = path.join(process.cwd(), 'dist/cli.js');
    const env = { ...process.env, NEURON_DB_PATH: tempDbPath, NEURON_MOCK_EMBEDDER: 'true' };

    // 1. Run learn --help
    const learnHelpStdout = execSync(`node ${cliPath} learn --help`, { env }).toString();
    expect(learnHelpStdout).toContain('Usage: neuron learn');
    expect(learnHelpStdout).toContain('add');
    expect(learnHelpStdout).toContain('query');
    expect(learnHelpStdout).toContain('list');
    expect(learnHelpStdout).toContain('delete');
    expect(learnHelpStdout).toContain('update');

    // 2. Run history --help
    const historyHelpStdout = execSync(`node ${cliPath} history --help`, { env }).toString();
    expect(historyHelpStdout).toContain('Usage: neuron history');
    expect(historyHelpStdout).toContain('add');
    expect(historyHelpStdout).toContain('query');
    expect(historyHelpStdout).toContain('list');
    expect(historyHelpStdout).toContain('delete');
    expect(historyHelpStdout).toContain('consolidate');
    expect(historyHelpStdout).toContain('prune');
  });

  it('should print namespace help and exit with status 1 on missing subcommand', () => {
    const cliPath = path.join(process.cwd(), 'dist/cli.js');
    const env = { ...process.env, NEURON_DB_PATH: tempDbPath, NEURON_MOCK_EMBEDDER: 'true' };

    // 1. Missing subcommand for learn
    expect(() => {
      execSync(`node ${cliPath} learn`, { env, stdio: 'pipe' });
    }).toThrow(/Usage: neuron learn/);

    // 2. Missing subcommand for history
    expect(() => {
      execSync(`node ${cliPath} history`, { env, stdio: 'pipe' });
    }).toThrow(/Usage: neuron history/);
  });
});
