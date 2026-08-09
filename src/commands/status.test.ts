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
});
