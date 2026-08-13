import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { execSync } from 'node:child_process';
import path from 'node:path';
import fs from 'node:fs';

describe('CLI Command: status', () => {
  const tempDbDir = path.join(process.cwd(), 'src/__tests__/temp-status');
  let tempDbPath: string;

  beforeAll(() => {
    fs.mkdirSync(tempDbDir, { recursive: true });
  });

  beforeEach(() => {
    tempDbPath = path.join(tempDbDir, `test-status-${Date.now()}-${Math.random().toString(36).slice(2)}.sqlite`);
  });

  afterAll(() => {
    if (fs.existsSync(tempDbDir)) {
      fs.rmSync(tempDbDir, { recursive: true, force: true });
    }
  });

  it('should run "status" command and return status JSON', () => {
    const cliPath = path.join(process.cwd(), 'dist/cli.js');

    // NEURON_HOOK_CACHE_DIR isolates recallCost's ledger scan (ticket 07) from
    // this repo's own real, dogfooded hook cache (ticket 42's pattern) —
    // without it, status would summarize live session data from this very
    // conversation and the assertions below would be non-deterministic.
    const stdout = execSync(`node ${cliPath} status`, {
      env: {
        ...process.env,
        NEURON_DB_PATH: tempDbPath,
        NEURON_HOOK_CACHE_DIR: path.join(tempDbDir, 'hook-cache'),
      }
    }).toString();

    const status = JSON.parse(stdout);
    expect(status.db).toBe('ready');
    expect(status.project).toBeDefined();
    expect(status.projectRoot).toBe(process.cwd());
    expect(status.recallCost.epochCharBudget).toBe(18000);
    expect(status.recallCost.sessionsObserved).toBe(0);
  });

  describe('--check / --repair (ticket 13 / ADR 0013)', () => {
    const cliPath = path.join(process.cwd(), 'dist/cli.js');

    function makeProjectDir(): string {
      const dir = path.join(tempDbDir, `proj-check-repair-${Date.now()}-${Math.random().toString(36).slice(2)}`);
      fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(path.join(dir, 'package.json'), '{}');
      return dir;
    }

    const YAML_TICKET_NOT_REQUIRED = `version: "1.0"
storage:
  mode: vector
categories:
  decisions:
    description: ADRs
    fields:
      ticket:
        type: string
pullRules:
  default:
    categories: [decisions]
`;

    const YAML_TICKET_REQUIRED_NO_DEFAULT = `version: "1.0"
storage:
  mode: vector
categories:
  decisions:
    description: ADRs
    fields:
      ticket:
        type: string
        required: true
pullRules:
  default:
    categories: [decisions]
`;

    const YAML_TICKET_REQUIRED_WITH_DEFAULT = `version: "1.0"
storage:
  mode: vector
categories:
  decisions:
    description: ADRs
    fields:
      ticket:
        type: string
        required: true
        default: UNSET
pullRules:
  default:
    categories: [decisions]
`;

    it('reports a pre-existing entry once its field is declared required, and exits 1', () => {
      const projectDir = makeProjectDir();
      const dbPath = path.join(projectDir, 'store.sqlite');
      const env = { ...process.env, NEURON_DB_PATH: dbPath, NEURON_MOCK_EMBEDDER: 'true' };

      fs.writeFileSync(path.join(projectDir, 'neuron.yaml'), YAML_TICKET_NOT_REQUIRED);
      const addStdout = execSync(
        `node ${cliPath} memory add "An ADR filed before ticket was required" --category decisions`,
        { env, cwd: projectDir }
      ).toString();
      const created = JSON.parse(addStdout);

      fs.writeFileSync(path.join(projectDir, 'neuron.yaml'), YAML_TICKET_REQUIRED_NO_DEFAULT);

      let stdout: string;
      let status = 0;
      try {
        stdout = execSync(`node ${cliPath} status --check`, { env, cwd: projectDir }).toString();
      } catch (err: any) {
        stdout = err.stdout.toString();
        status = err.status;
      }

      const report = JSON.parse(stdout);
      expect(report.compliant).toBe(false);
      expect(report.violations).toEqual([
        { id: created.id, category: 'decisions', missingRequiredFields: ['ticket'] },
      ]);
      expect(status).toBe(1);
    });

    it('repairs a missing required field via its configured default and exits 0', () => {
      const projectDir = makeProjectDir();
      const dbPath = path.join(projectDir, 'store.sqlite');
      const env = { ...process.env, NEURON_DB_PATH: dbPath, NEURON_MOCK_EMBEDDER: 'true' };

      fs.writeFileSync(path.join(projectDir, 'neuron.yaml'), YAML_TICKET_NOT_REQUIRED);
      const addStdout = execSync(
        `node ${cliPath} memory add "An ADR filed before ticket existed" --category decisions`,
        { env, cwd: projectDir }
      ).toString();
      const created = JSON.parse(addStdout);

      fs.writeFileSync(path.join(projectDir, 'neuron.yaml'), YAML_TICKET_REQUIRED_WITH_DEFAULT);

      const repairStdout = execSync(`node ${cliPath} status --repair`, { env, cwd: projectDir }).toString();
      const report = JSON.parse(repairStdout);
      expect(report.repaired).toEqual([
        { id: created.id, category: 'decisions', applied: { ticket: 'UNSET' }, unresolved: [] },
      ]);

      const checkStdout = execSync(`node ${cliPath} status --check`, { env, cwd: projectDir }).toString();
      expect(JSON.parse(checkStdout).compliant).toBe(true);
    });
  });

  describe('undeclared categories (ADR 0017)', () => {
    const cliPath = path.join(process.cwd(), 'dist/cli.js');

    function makeProjectDir(): string {
      const dir = path.join(tempDbDir, `proj-undeclared-cat-${Date.now()}-${Math.random().toString(36).slice(2)}`);
      fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(path.join(dir, 'package.json'), '{}');
      return dir;
    }

    const YAML_NO_SNIPPETS = `version: "1.0"
storage:
  mode: vector
categories:
  learning:
    description: Agent conventions
pullRules:
  default:
    categories: [learning]
`;

    it('auto-declares an undeclared category on its first write, and --check reports none left', () => {
      const projectDir = makeProjectDir();
      const dbPath = path.join(projectDir, 'store.sqlite');
      const env = { ...process.env, NEURON_DB_PATH: dbPath, NEURON_MOCK_EMBEDDER: 'true' };

      fs.writeFileSync(path.join(projectDir, 'neuron.yaml'), YAML_NO_SNIPPETS);
      execSync(
        `node ${cliPath} memory add "a reusable snippet" --category snippets`,
        { env, cwd: projectDir }
      );

      const onDisk = fs.readFileSync(path.join(projectDir, 'neuron.yaml'), 'utf8');
      expect(onDisk).toContain('snippets: {}');
      expect(onDisk).toContain('description: Agent conventions');

      const checkStdout = execSync(`node ${cliPath} status --check`, { env, cwd: projectDir }).toString();
      const report = JSON.parse(checkStdout);
      expect(report.compliant).toBe(true);
      expect(report.undeclaredCategories).toEqual([]);
    });

    it('--check reports, and --repair declares, a category with rows from before the config declared it', () => {
      const projectDir = makeProjectDir();
      const dbPath = path.join(projectDir, 'store.sqlite');
      const env = { ...process.env, NEURON_DB_PATH: dbPath, NEURON_MOCK_EMBEDDER: 'true' };

      // Write against a config that doesn't yet mention "legacy" as declared,
      // via an explicit --category override (ADR 0017 Decision 4's trusted
      // human-override path) — this auto-declares it immediately, so to get
      // a *pre-existing undeclared* category (simulating a pre-upgrade
      // store), write it, then strip it back out of neuron.yaml by hand.
      fs.writeFileSync(path.join(projectDir, 'neuron.yaml'), YAML_NO_SNIPPETS);
      execSync(
        `node ${cliPath} memory add "a pre-upgrade row" --category legacy`,
        { env, cwd: projectDir }
      );
      fs.writeFileSync(path.join(projectDir, 'neuron.yaml'), YAML_NO_SNIPPETS);

      let stdout: string;
      let status = 0;
      try {
        stdout = execSync(`node ${cliPath} status --check`, { env, cwd: projectDir }).toString();
      } catch (err: any) {
        stdout = err.stdout.toString();
        status = err.status;
      }
      const report = JSON.parse(stdout);
      expect(report.compliant).toBe(false);
      expect(report.undeclaredCategories).toEqual(['legacy']);
      expect(status).toBe(1);

      const repairStdout = execSync(`node ${cliPath} status --repair`, { env, cwd: projectDir }).toString();
      expect(JSON.parse(repairStdout).declaredCategories).toEqual(['legacy']);

      const onDisk = fs.readFileSync(path.join(projectDir, 'neuron.yaml'), 'utf8');
      expect(onDisk).toContain('legacy: {}');
    });
  });

  describe('binary version mismatch (ticket 33 / F2)', () => {
    const cliPath = path.join(process.cwd(), 'dist/cli.js');
    const realVersion = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'package.json'), 'utf8')).version;

    function makeProjectDir(pkg: Record<string, unknown>): string {
      const dir = path.join(tempDbDir, `proj-binver-${Date.now()}-${Math.random().toString(36).slice(2)}`);
      fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(path.join(dir, 'package.json'), JSON.stringify(pkg));
      return dir;
    }

    // A "stale global install" fixture: a full copy of this repo's real
    // dist/ under a fake package root nested inside the repo (so Node's
    // module resolution still finds the real node_modules by walking up),
    // with only package.json's version overwritten — reproducing an
    // un-rebuilt `npm link`/stale `npm install -g`.
    function makeStaleBinary(version: string): string {
      const pkgRoot = path.join(tempDbDir, `stale-install-${Date.now()}-${Math.random().toString(36).slice(2)}`);
      fs.mkdirSync(pkgRoot, { recursive: true });
      fs.cpSync(path.join(process.cwd(), 'dist'), path.join(pkgRoot, 'dist'), { recursive: true });
      fs.writeFileSync(
        path.join(pkgRoot, 'package.json'),
        JSON.stringify({ name: '@kovartravis/neuron', version, type: 'module' })
      );
      return path.join(pkgRoot, 'dist', 'cli.js');
    }

    it('reports a mismatch and exits 1 when the resolved-from-PATH binary is stale', () => {
      const projectDir = makeProjectDir({ name: '@kovartravis/neuron', version: realVersion });
      const dbPath = path.join(projectDir, 'store.sqlite');
      const env = { ...process.env, NEURON_DB_PATH: dbPath, NEURON_MOCK_EMBEDDER: 'true' };
      const staleBinaryPath = makeStaleBinary('0.0.1-stale');

      let stdout: string;
      let status = 0;
      try {
        stdout = execSync(`node ${staleBinaryPath} status --check`, { env, cwd: projectDir }).toString();
      } catch (err: any) {
        stdout = err.stdout.toString();
        status = err.status;
      }

      const report = JSON.parse(stdout);
      expect(report.compliant).toBe(false);
      expect(report.binaryVersionMismatch).toEqual({
        cwdVersion: realVersion,
        runningVersion: '0.0.1-stale',
        runningPath: fs.realpathSync(staleBinaryPath),
      });
      expect(status).toBe(1);
    });

    it('is compliant when the running binary matches this project\'s own version', () => {
      const projectDir = makeProjectDir({ name: '@kovartravis/neuron', version: realVersion });
      const dbPath = path.join(projectDir, 'store.sqlite');
      const env = { ...process.env, NEURON_DB_PATH: dbPath, NEURON_MOCK_EMBEDDER: 'true' };

      const stdout = execSync(`node ${cliPath} status --check`, { env, cwd: projectDir }).toString();
      const report = JSON.parse(stdout);
      expect(report.compliant).toBe(true);
      expect(report.binaryVersionMismatch).toBeNull();
    });

    it('never fires for a project that is not neuron\'s own source tree, even against a stale binary', () => {
      const projectDir = makeProjectDir({ name: 'some-consumer-app', version: '1.0.0' });
      const dbPath = path.join(projectDir, 'store.sqlite');
      const env = { ...process.env, NEURON_DB_PATH: dbPath, NEURON_MOCK_EMBEDDER: 'true' };
      const staleBinaryPath = makeStaleBinary('0.0.1-stale');

      const stdout = execSync(`node ${staleBinaryPath} status --check`, { env, cwd: projectDir }).toString();
      const report = JSON.parse(stdout);
      expect(report.compliant).toBe(true);
      expect(report.binaryVersionMismatch).toBeNull();
    });
  });
});
