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
    // Own project root, so config discovery stops here instead of walking up
    // into the neuron repo's own neuron.yaml (ticket 42).
    const projectDir = path.join(tempDbDir, `proj-basic-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    fs.mkdirSync(projectDir, { recursive: true });
    fs.writeFileSync(path.join(projectDir, 'package.json'), '{}');

    // 1. Add entry to custom category "decisions"
    const addStdout = execSync(
      `node ${cliPath} memory add "Use SQLite WAL mode for concurrency" --category decisions --tags adr,db --importance 4`,
      { env, cwd: projectDir }
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
      { env, cwd: projectDir }
    ).toString();
    const queryRes = JSON.parse(queryStdout);
    expect(queryRes.results.length).toBeGreaterThanOrEqual(1);
    const walMatch = queryRes.results.find((r: any) => r.content.includes('Use SQLite WAL mode for concurrency'));
    expect(walMatch).toBeDefined();
    expect(walMatch.category).toBe('decisions');
    // `rejected` (ticket 41 / ADR 0012) reports the relevance gate's rejected
    // count, so an empty `results` is distinguishable from an empty store.
    expect(typeof queryRes.rejected).toBe('number');

    // 3. List entries in category "decisions"
    const listStdout = execSync(
      `node ${cliPath} memory list --category decisions`,
      { env, cwd: projectDir }
    ).toString();
    const listRes = JSON.parse(listStdout);
    expect(listRes.length).toBeGreaterThanOrEqual(1);

    // 4. Update entry in category "decisions"
    const updateStdout = execSync(
      `node ${cliPath} memory update ${added.id} "Use SQLite WAL mode with 5s busy timeout" --category decisions`,
      { env, cwd: projectDir }
    ).toString();
    const updateRes = JSON.parse(updateStdout);
    expect(updateRes.status).toBe('updated');

    // 5. Delete entry
    const deleteStdout = execSync(
      `node ${cliPath} memory delete ${added.id} --category decisions`,
      { env, cwd: projectDir }
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
    let projectDir: string;

    // Own project root, so config discovery stops here instead of walking up
    // into the neuron repo's own neuron.yaml (ticket 42).
    beforeEach(() => {
      projectDir = path.join(tempDbDir, `proj-argv-${Date.now()}-${Math.random().toString(36).slice(2)}`);
      fs.mkdirSync(projectDir, { recursive: true });
      fs.writeFileSync(path.join(projectDir, 'package.json'), '{}');
    });

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
          { env: envFor(), cwd: projectDir, stdio: 'pipe' }
        );
      }).toThrow(/expects a single content argument.*got 6 bare arguments/s);

      // The whole point: a refused write must not be a partial write.
      expect(rowCount()).toBe(0);
    });

    it('refuses an unquoted update rather than overwriting with one word', () => {
      const added = JSON.parse(
        execSync(`node ${cliPath()} memory add "original content" --category learning`, {
          env: envFor(),
          cwd: projectDir,
        }).toString()
      );

      expect(() => {
        execSync(
          `node ${cliPath()} memory update ${added.id} --category learning Fix the crash by pinning`,
          { env: envFor(), cwd: projectDir, stdio: 'pipe' }
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
        { env: envFor(), cwd: projectDir }
      );
      const out = JSON.parse(
        execSync(`node ${cliPath()} memory query tree sitter grammar caching`, {
          env: envFor(),
          cwd: projectDir,
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
          cwd: projectDir,
          stdio: 'pipe',
        });
      }).toThrow(/unknown option '--tag'[\s\S]*Did you mean '--tags'/);

      expect(rowCount()).toBe(0);
    });

    it('prints help for `memory add --help` instead of storing "--help"', () => {
      const out = execSync(`node ${cliPath()} memory add --category learning --help`, {
        env: envFor(),
        cwd: projectDir,
      }).toString();

      expect(out).toMatch(/Usage: neuron memory/);
      expect(rowCount()).toBe(0);
    });

    it('accepts dash-leading content after the `--` end-of-flags marker', () => {
      const res = JSON.parse(
        execSync(`node ${cliPath()} memory add --category learning -- "--dash-leading content"`, {
          env: envFor(),
          cwd: projectDir,
        }).toString()
      );
      expect(res.status).toBe('created');

      const db = openDatabase(tempDbPath);
      const row = db.prepare('SELECT content FROM memories WHERE id = ?').get(res.id) as any;
      db.close();
      expect(row.content).toBe('--dash-leading content');
    });
  });

  /**
   * `--category` is required on delete/update but was never part of the SQL
   * predicate, so it validated nothing: any id could be deleted or overwritten
   * regardless of its real category, and the required flag was pure ceremony.
   * `list --categories` had the same shape of bug on the read side — it parsed
   * successfully and filtered nothing.
   */
  describe('category enforcement', () => {
    const cliPath = () => path.join(process.cwd(), 'dist/cli.js');
    let projectDir: string;

    // Own project root, so config discovery stops here instead of walking up
    // into the neuron repo's own neuron.yaml (ticket 42).
    beforeEach(() => {
      projectDir = path.join(tempDbDir, `proj-enforce-${Date.now()}-${Math.random().toString(36).slice(2)}`);
      fs.mkdirSync(projectDir, { recursive: true });
      fs.writeFileSync(path.join(projectDir, 'package.json'), '{}');
    });

    const envFor = () => ({
      ...process.env,
      NEURON_DB_PATH: tempDbPath,
      NEURON_MOCK_EMBEDDER: 'true',
    });
    const addEntry = (content: string, category: string): { id: string } =>
      JSON.parse(
        execSync(`node ${cliPath()} memory add "${content}" --category ${category}`, {
          env: envFor(),
          cwd: projectDir,
        }).toString()
      );

    it('list --categories filters instead of returning every category', () => {
      addEntry('a learning entry', 'learning');
      addEntry('a history entry', 'history');

      const out = JSON.parse(
        execSync(`node ${cliPath()} memory list --categories learning --limit 100`, {
          env: envFor(),
          cwd: projectDir,
        }).toString()
      );

      expect(out.every((r: any) => r.category === 'learning')).toBe(true);
    });

    it('refuses to delete when --category does not match the entry', () => {
      const entry = addEntry('a history entry', 'history');

      const out = JSON.parse(
        execSync(`node ${cliPath()} memory delete ${entry.id} --category learning`, {
          env: envFor(),
          cwd: projectDir,
        }).toString()
      );
      expect(out.status).toBe('not_found');

      const db = openDatabase(tempDbPath);
      const row = db.prepare('SELECT id FROM memories WHERE id = ?').get(entry.id);
      db.close();
      expect(row).toBeDefined();
    });

    it('deletes when --category matches', () => {
      const entry = addEntry('a history entry', 'history');

      const out = JSON.parse(
        execSync(`node ${cliPath()} memory delete ${entry.id} --category history`, {
          env: envFor(),
          cwd: projectDir,
        }).toString()
      );
      expect(out.status).toBe('deleted');
    });

    it('refuses to update when --category does not match the entry, leaving content untouched', () => {
      const entry = addEntry('original content', 'learning');

      const out = JSON.parse(
        execSync(`node ${cliPath()} memory update ${entry.id} "overwritten" --category history`, {
          env: envFor(),
          cwd: projectDir,
        }).toString()
      );
      expect(out.status).toBe('not_found');

      const db = openDatabase(tempDbPath);
      const row = db.prepare('SELECT content FROM memories WHERE id = ?').get(entry.id) as any;
      db.close();
      expect(row.content).toBe('original content');
    });

    it('updates when --category matches', () => {
      const entry = addEntry('original content', 'learning');

      const out = JSON.parse(
        execSync(`node ${cliPath()} memory update ${entry.id} "updated content" --category learning`, {
          env: envFor(),
          cwd: projectDir,
        }).toString()
      );
      expect(out.status).toBe('updated');

      const db = openDatabase(tempDbPath);
      const row = db.prepare('SELECT content FROM memories WHERE id = ?').get(entry.id) as any;
      db.close();
      expect(row.content).toBe('updated content');
    });
  });

  /**
   * `list --frontier` (neuron-2.4.0 ticket 41's session): the wayfinder
   * frontier per docs/agents/issue-tracker.md, computed in the CLI instead of
   * by hand every wayfinder session with a throwaway script.
   */
  describe('list --where / --refs-satisfy', () => {
    const cliPath = () => path.join(process.cwd(), 'dist/cli.js');
    let projectDir: string;

    beforeEach(() => {
      projectDir = path.join(tempDbDir, `proj-filter-${Date.now()}-${Math.random().toString(36).slice(2)}`);
      fs.mkdirSync(projectDir, { recursive: true });
      fs.writeFileSync(path.join(projectDir, 'package.json'), '{}');
      fs.writeFileSync(
        path.join(projectDir, 'neuron.yaml'),
        [
          'version: "1.0"',
          'categories:',
          '  tickets:',
          '    fields:',
          '      status:',
          '        type: enum',
          '        values: [unclaimed, claimed, resolved]',
          '        default: unclaimed',
          '      kind:',
          '        type: enum',
          '        values: [task, map]',
          '      blockedBy:',
          '        type: string',
          '      map:',
          '        type: string',
          '  deploys:',
          '    fields:',
          '      state:',
          '        type: enum',
          '        values: [queued, done]',
          '        default: queued',
          '      dependsOn:',
          '        type: string',
          '  other:',
          '    description: unrelated category, no declared fields',
          'pullRules:',
          '  default:',
          '    categories: [tickets]',
          '',
        ].join('\n')
      );
    });

    const envFor = () => ({
      ...process.env,
      NEURON_DB_PATH: tempDbPath,
      NEURON_MOCK_EMBEDDER: 'true',
    });
    const addTicket = (content: string, status: string, blockedBy?: string): { id: string } =>
      JSON.parse(
        execSync(
          `node ${cliPath()} memory add "${content}" --category tickets --status ${status}` +
            (blockedBy ? ` --blocked-by "${blockedBy}"` : ''),
          { env: envFor(), cwd: projectDir }
        ).toString()
      );
    // Exercises the exact composed invocation a wayfinder-style frontier would use, but the
    // command itself has no idea "frontier" exists — it's two generic filters composed.
    const frontier = (extra = ''): any[] =>
      JSON.parse(
        execSync(
          `node ${cliPath()} memory list --category tickets --where "status=unclaimed" --refs-satisfy "blockedBy:status=resolved" ${extra}`,
          { env: envFor(), cwd: projectDir }
        ).toString()
      );

    it('includes an unclaimed, unblocked ticket', () => {
      const a = addTicket('Ticket A', 'unclaimed');
      const ids = frontier().map((e: any) => e.id);
      expect(ids).toContain(a.id);
    });

    it('excludes a claimed ticket and a resolved ticket', () => {
      const claimed = addTicket('Ticket claimed', 'claimed');
      const resolved = addTicket('Ticket resolved', 'resolved');
      const ids = frontier().map((e: any) => e.id);
      expect(ids).not.toContain(claimed.id);
      expect(ids).not.toContain(resolved.id);
    });

    it('excludes an unclaimed ticket blocked by an unresolved ticket, includes it once that blocker resolves', () => {
      const blocker = addTicket('Blocker', 'unclaimed');
      const blocked = addTicket('Blocked', 'unclaimed', blocker.id);

      let ids = frontier().map((e: any) => e.id);
      expect(ids).toContain(blocker.id);
      expect(ids).not.toContain(blocked.id);

      execSync(`node ${cliPath()} memory update ${blocker.id} "Blocker" --category tickets --status resolved`, {
        env: envFor(),
        cwd: projectDir,
      });

      ids = frontier().map((e: any) => e.id);
      expect(ids).not.toContain(blocker.id); // now resolved, not unclaimed
      expect(ids).toContain(blocked.id);
    });

    it('keeps a ticket blocked when blockedBy names an id with no matching entry (dangling reference)', () => {
      const dangling = addTicket('Dangling blockedBy', 'unclaimed', 'no-such-id-ever-written');
      const ids = frontier().map((e: any) => e.id);
      expect(ids).not.toContain(dangling.id);
    });

    it('an unclaimed ticket blocked by two ids is only unblocked once both resolve', () => {
      const b1 = addTicket('Blocker one', 'unclaimed');
      const b2 = addTicket('Blocker two', 'unclaimed');
      const blocked = addTicket('Blocked by two', 'unclaimed', `${b1.id},${b2.id}`);

      execSync(`node ${cliPath()} memory update ${b1.id} "Blocker one" --category tickets --status resolved`, {
        env: envFor(),
        cwd: projectDir,
      });
      expect(frontier().map((e: any) => e.id)).not.toContain(blocked.id);

      execSync(`node ${cliPath()} memory update ${b2.id} "Blocker two" --category tickets --status resolved`, {
        env: envFor(),
        cwd: projectDir,
      });
      expect(frontier().map((e: any) => e.id)).toContain(blocked.id);
    });

    it('--limit caps the result without breaking correctness', () => {
      addTicket('Ticket 1', 'unclaimed');
      addTicket('Ticket 2', 'unclaimed');
      addTicket('Ticket 3', 'unclaimed');
      expect(frontier('--limit 2')).toHaveLength(2);
      expect(frontier()).toHaveLength(3);
    });

    it('--where alone (no --refs-satisfy) needs no single-category restriction', () => {
      addTicket('Ticket A', 'unclaimed');
      addTicket('Ticket B', 'claimed');
      const out = JSON.parse(
        execSync(`node ${cliPath()} memory list --category tickets --where "status=claimed"`, {
          env: envFor(),
          cwd: projectDir,
        }).toString()
      );
      expect(out).toHaveLength(1);
      expect(out[0].fields.status).toBe('claimed');
    });

    it('rejects --refs-satisfy with no --category (ambiguous which category to resolve ids against)', () => {
      expect(() => {
        execSync(`node ${cliPath()} memory list --refs-satisfy "blockedBy:status=resolved"`, {
          env: envFor(),
          cwd: projectDir,
          stdio: 'pipe',
        });
      }).toThrow(/requires exactly one --category/);
    });

    it('rejects a malformed --where clause', () => {
      expect(() => {
        execSync(`node ${cliPath()} memory list --category tickets --where "not-a-clause"`, {
          env: envFor(),
          cwd: projectDir,
          stdio: 'pipe',
        });
      }).toThrow(/--where expects/);
    });

    it('rejects a malformed --refs-satisfy clause', () => {
      expect(() => {
        execSync(`node ${cliPath()} memory list --category tickets --refs-satisfy "blockedBy-no-colon-or-equals"`, {
          env: envFor(),
          cwd: projectDir,
          stdio: 'pipe',
        });
      }).toThrow(/--refs-satisfy expects/);
    });

    // Proves this is a general filter, not a wayfinder-specific "frontier"
    // feature — a completely different category, with different field names
    // and different enum values, composes the exact same way.
    it('is schema-agnostic: the same two flags work for an unrelated deploys/dependsOn/state schema', () => {
      const addDeploy = (content: string, state: string, dependsOn?: string): { id: string } =>
        JSON.parse(
          execSync(
            `node ${cliPath()} memory add "${content}" --category deploys --state ${state}` +
              (dependsOn ? ` --depends-on "${dependsOn}"` : ''),
            { env: envFor(), cwd: projectDir }
          ).toString()
        );
      const readyDeploys = (): any[] =>
        JSON.parse(
          execSync(
            `node ${cliPath()} memory list --category deploys --where "state=queued" --refs-satisfy "dependsOn:state=done"`,
            { env: envFor(), cwd: projectDir }
          ).toString()
        );

      const migration = addDeploy('Run DB migration', 'done');
      const stillMigrating = addDeploy('Run schema backfill', 'queued');
      const stillWaiting = addDeploy('Deploy app server', 'queued', stillMigrating.id);
      const readyBecauseDone = addDeploy('Deploy cache warmer', 'queued', migration.id);
      const readyNow = addDeploy('Deploy static assets', 'queued');

      const ids = readyDeploys().map((e: any) => e.id);
      expect(ids).toContain(readyNow.id);
      expect(ids).toContain(readyBecauseDone.id); // depends on an already-'done' entry
      expect(ids).toContain(stillMigrating.id); // 'queued' with no dependency at all — ready
      expect(ids).not.toContain(stillWaiting.id); // depends on stillMigrating, which is still 'queued'
      expect(ids).not.toContain(migration.id); // state is 'done', not 'queued'
    });

    /**
     * Ticket 45: `--where` used to accept exactly one clause (`args[++i]`,
     * last-flag-wins), so a per-map frontier query (`status=X` AND `map=Y`)
     * had no way to compose in one `list` call. Repeated `--where` now ANDs.
     */
    describe('compound --where (ticket 45)', () => {
      const addTicketWithMap = (content: string, status: string, map: string, blockedBy?: string): { id: string } =>
        JSON.parse(
          execSync(
            `node ${cliPath()} memory add "${content}" --category tickets --status ${status} --map ${map}` +
              (blockedBy ? ` --blocked-by "${blockedBy}"` : ''),
            { env: envFor(), cwd: projectDir }
          ).toString()
        );

      it('ANDs two --where occurrences instead of the second silently winning', () => {
        const mapA = 'map-a-11111111-1111-1111-1111-111111111111';
        const mapB = 'map-b-22222222-2222-2222-2222-222222222222';
        const inA = addTicketWithMap('Ticket on map A', 'unclaimed', mapA);
        const inB = addTicketWithMap('Ticket on map B', 'unclaimed', mapB);

        const scopedToA = JSON.parse(
          execSync(
            `node ${cliPath()} memory list --category tickets --where "status=unclaimed" --where "map=${mapA}"`,
            { env: envFor(), cwd: projectDir }
          ).toString()
        );
        const ids = scopedToA.map((e: any) => e.id);
        expect(ids).toContain(inA.id);
        expect(ids).not.toContain(inB.id);
      });

      it('composes a real per-map frontier: status=unclaimed AND map=<id> AND blockedBy satisfied', () => {
        const thisMap = 'map-c-33333333-3333-3333-3333-333333333333';
        const otherMap = 'map-d-44444444-4444-4444-4444-444444444444';
        const blocker = addTicketWithMap('Blocker', 'unclaimed', thisMap);
        const blocked = addTicketWithMap('Blocked', 'unclaimed', thisMap, blocker.id);
        const readyOnThisMap = addTicketWithMap('Ready', 'unclaimed', thisMap);
        const readyOnOtherMap = addTicketWithMap('Ready elsewhere', 'unclaimed', otherMap);
        const claimedOnThisMap = addTicketWithMap('Claimed', 'claimed', thisMap);

        const perMapFrontier = (): any[] =>
          JSON.parse(
            execSync(
              `node ${cliPath()} memory list --category tickets --where "status=unclaimed" --where "map=${thisMap}" --refs-satisfy "blockedBy:status=resolved"`,
              { env: envFor(), cwd: projectDir }
            ).toString()
          );

        let ids = perMapFrontier().map((e: any) => e.id);
        expect(ids).toContain(blocker.id);
        expect(ids).toContain(readyOnThisMap.id);
        expect(ids).not.toContain(blocked.id); // blocker unresolved
        expect(ids).not.toContain(readyOnOtherMap.id); // wrong map
        expect(ids).not.toContain(claimedOnThisMap.id); // not unclaimed

        execSync(`node ${cliPath()} memory update ${blocker.id} "Blocker" --category tickets --status resolved`, {
          env: envFor(),
          cwd: projectDir,
        });
        ids = perMapFrontier().map((e: any) => e.id);
        expect(ids).toContain(blocked.id); // blocker now resolved
      });

      it('supports field!=value negation, e.g. excluding map entries from a global frontier', () => {
        const map1 = addTicketWithMap('placeholder', 'unclaimed', 'irrelevant'); // real child, kind unset
        execSync(
          `node ${cliPath()} memory add "A real map" --category tickets --kind map`,
          { env: envFor(), cwd: projectDir }
        );

        const out = JSON.parse(
          execSync(`node ${cliPath()} memory list --category tickets --where "kind!=map"`, {
            env: envFor(),
            cwd: projectDir,
          }).toString()
        );
        const ids = out.map((e: any) => e.id);
        expect(ids).toContain(map1.id);
        expect(out.every((e: any) => e.fields.kind !== 'map')).toBe(true);
      });
    });
  });

  /**
   * Ticket 45: single-entry fetch by id — the escape hatch that used to mean
   * pulling the whole category via `list --json` and filtering client-side.
   */
  describe('memory get', () => {
    const cliPath = () => path.join(process.cwd(), 'dist/cli.js');
    let projectDir: string;

    beforeEach(() => {
      projectDir = path.join(tempDbDir, `proj-get-${Date.now()}-${Math.random().toString(36).slice(2)}`);
      fs.mkdirSync(projectDir, { recursive: true });
      fs.writeFileSync(path.join(projectDir, 'package.json'), '{}');
    });

    const envFor = () => ({
      ...process.env,
      NEURON_DB_PATH: tempDbPath,
      NEURON_MOCK_EMBEDDER: 'true',
    });

    it('round-trips a known id, matching the equivalent list --json entry exactly', () => {
      const added = JSON.parse(
        execSync(`node ${cliPath()} memory add "A real entry" --category learning --importance 4`, {
          env: envFor(),
          cwd: projectDir,
        }).toString()
      );

      const got = JSON.parse(
        execSync(`node ${cliPath()} memory get ${added.id}`, { env: envFor(), cwd: projectDir }).toString()
      );
      const listed = JSON.parse(
        execSync(`node ${cliPath()} memory list --category learning --limit 100`, {
          env: envFor(),
          cwd: projectDir,
        }).toString()
      ).find((e: any) => e.id === added.id);

      expect(got).toEqual(listed);
      expect(got.content).toBe('A real entry');
    });

    it('reports not_found for an id that does not exist', () => {
      const out = JSON.parse(
        execSync(`node ${cliPath()} memory get some-nonexistent-id`, {
          env: envFor(),
          cwd: projectDir,
        }).toString()
      );
      expect(out).toEqual({ status: 'not_found', id: 'some-nonexistent-id' });
    });

    it('reports not_found when --category does not match the entry, without requiring --category to match', () => {
      const added = JSON.parse(
        execSync(`node ${cliPath()} memory add "content" --category history`, {
          env: envFor(),
          cwd: projectDir,
        }).toString()
      );

      // No --category at all: found regardless.
      const gotNoCategory = JSON.parse(
        execSync(`node ${cliPath()} memory get ${added.id}`, { env: envFor(), cwd: projectDir }).toString()
      );
      expect(gotNoCategory.id).toBe(added.id);

      // Wrong --category: not_found, even though the id is real.
      const gotWrongCategory = JSON.parse(
        execSync(`node ${cliPath()} memory get ${added.id} --category learning`, {
          env: envFor(),
          cwd: projectDir,
        }).toString()
      );
      expect(gotWrongCategory).toEqual({ status: 'not_found', id: added.id });

      // Right --category: found.
      const gotRightCategory = JSON.parse(
        execSync(`node ${cliPath()} memory get ${added.id} --category history`, {
          env: envFor(),
          cwd: projectDir,
        }).toString()
      );
      expect(gotRightCategory.id).toBe(added.id);
    });

    it('refuses an unquoted extra argument the same way delete does', () => {
      expect(() => {
        execSync(`node ${cliPath()} memory get some-id extra-word`, {
          env: envFor(),
          cwd: projectDir,
          stdio: 'pipe',
        });
      }).toThrow(/expects a single id argument.*got 2 bare arguments/s);
    });
  });
});
