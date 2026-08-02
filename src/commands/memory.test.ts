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

  describe('the --category contract', () => {
    const cliPath = path.join(process.cwd(), 'dist/cli.js');
    let projectDir: string;

    /**
     * A project whose config names a literal fallback category. The model is
     * disabled under NODE_ENV=test, so the fallback is what makes the success
     * path deterministic without loading 500M parameters.
     */
    beforeEach(() => {
      projectDir = path.join(tempDbDir, `proj-${Date.now()}-${Math.random().toString(36).slice(2)}`);
      fs.mkdirSync(projectDir, { recursive: true });
      fs.writeFileSync(path.join(projectDir, 'package.json'), '{}');
      fs.writeFileSync(
        path.join(projectDir, 'neuron.yaml'),
        `version: "1.0"\ncategories:\n  learning:\n    description: Rules\nllm:\n  enrichment:\n    category: learning\n`
      );
    });

    it('accepts memory add without --category', () => {
      const env = { ...process.env, NEURON_DB_PATH: tempDbPath, NEURON_MOCK_EMBEDDER: 'true' };
      const stdout = execSync(`node ${cliPath} memory add "An entry filed by inference"`, {
        env,
        cwd: projectDir,
      }).toString();

      const added = JSON.parse(stdout);
      expect(added.status).toBe('created');

      const db = openDatabase(tempDbPath);
      const row = db.prepare('SELECT category FROM memories WHERE id = ?').get(added.id) as any;
      expect(row.category).toBe('learning');
      db.close();
    });

    it('still requires --category for delete and update', () => {
      const env = { ...process.env, NEURON_DB_PATH: tempDbPath, NEURON_MOCK_EMBEDDER: 'true' };

      expect(() => {
        execSync(`node ${cliPath} memory delete some-id`, { env, cwd: projectDir, stdio: 'pipe' });
      }).toThrow(/--category is required/);

      expect(() => {
        execSync(`node ${cliPath} memory update some-id "new content"`, {
          env,
          cwd: projectDir,
          stdio: 'pipe',
        });
      }).toThrow(/--category is required/);
    });

    it('fails naming the cause when inference cannot produce a category', () => {
      const env = { ...process.env, NEURON_DB_PATH: tempDbPath, NEURON_MOCK_EMBEDDER: 'true' };
      // No fallback configured — the hard-error path.
      fs.writeFileSync(
        path.join(projectDir, 'neuron.yaml'),
        `version: "1.0"\ncategories:\n  learning:\n    description: Rules\n`
      );

      expect(() => {
        execSync(`node ${cliPath} memory add "Content nothing can file"`, {
          env,
          cwd: projectDir,
          stdio: 'pipe',
        });
      }).toThrow(/category inference found no category close enough/);
    });
  });

  /**
   * One root cause, four symptoms: argv boundaries were discarded. Unquoted
   * content arrives as several bare words, and every one of these paths used to
   * keep the first and drop the rest while exiting 0. The store then held a
   * one-word memory that looked deliberate — 26% of the reference store was
   * destroyed this way before anyone noticed.
   */
  describe('argv boundary handling', () => {
    const cliPath = () => path.join(process.cwd(), 'dist/cli.js');
    const envFor = () => ({
      ...process.env,
      NEURON_DB_PATH: tempDbPath,
      NEURON_MOCK_EMBEDDER: 'true',
    });
    const rowCount = (): number => {
      if (!fs.existsSync(tempDbPath)) return 0;
      const db = openDatabase(tempDbPath);
      const n = (db.prepare('SELECT COUNT(*) AS c FROM memories').get() as any).c;
      db.close();
      return n;
    };

    it('refuses an unquoted add rather than storing only the first word', () => {
      expect(() => {
        execSync(
          `node ${cliPath()} memory add --category learning Fix for ONNX crash pin onnxruntime`,
          { env: envFor(), stdio: 'pipe' }
        );
      }).toThrow(/expects a single content argument.*got 6 bare arguments/s);

      // The whole point: a refused write must not be a partial write.
      expect(rowCount()).toBe(0);
    });

    it('refuses an unquoted update rather than overwriting with one word', () => {
      const added = JSON.parse(
        execSync(`node ${cliPath()} memory add "original content" --category learning`, {
          env: envFor(),
        }).toString()
      );

      expect(() => {
        execSync(
          `node ${cliPath()} memory update ${added.id} --category learning Fix the crash by pinning`,
          { env: envFor(), stdio: 'pipe' }
        );
      }).toThrow(/expects an id and a single content argument/);

      const db = openDatabase(tempDbPath);
      const row = db.prepare('SELECT content FROM memories WHERE id = ?').get(added.id) as any;
      db.close();
      expect(row.content).toBe('original content');
    });

    it('joins an unquoted query instead of silently searching one word', () => {
      execSync(
        `node ${cliPath()} memory add "tree sitter grammar caching at init time" --category learning`,
        { env: envFor() }
      );
      const out = JSON.parse(
        execSync(`node ${cliPath()} memory query tree sitter grammar caching`, {
          env: envFor(),
        }).toString()
      );
      expect(out.query).toBe('tree sitter grammar caching');
    });

    it('rejects an unknown flag instead of swallowing it as a positional', () => {
      // `--tag` used to land in positionals and be discarded, so the entry was
      // written with no tags at all while reporting success.
      expect(() => {
        execSync(`node ${cliPath()} memory add "content" --category learning --tag onnx`, {
          env: envFor(),
          stdio: 'pipe',
        });
      }).toThrow(/unknown option '--tag'[\s\S]*Did you mean '--tags'/);

      expect(rowCount()).toBe(0);
    });

    it('prints help for `memory add --help` instead of storing "--help"', () => {
      const out = execSync(`node ${cliPath()} memory add --category learning --help`, {
        env: envFor(),
      }).toString();

      expect(out).toMatch(/Usage: neuron memory/);
      expect(rowCount()).toBe(0);
    });

    it('accepts dash-leading content after the `--` end-of-flags marker', () => {
      const res = JSON.parse(
        execSync(`node ${cliPath()} memory add --category learning -- "--dash-leading content"`, {
          env: envFor(),
        }).toString()
      );
      expect(res.status).toBe('created');

      const db = openDatabase(tempDbPath);
      const row = db.prepare('SELECT content FROM memories WHERE id = ?').get(res.id) as any;
      db.close();
      expect(row.content).toBe('--dash-leading content');
    });
  });
});
