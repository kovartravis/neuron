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
    
    const stdout = execSync(`node ${cliPath} status`, {
      env: {
        ...process.env,
        NEURON_DB_PATH: tempDbPath,
      }
    }).toString();

    const status = JSON.parse(stdout);
    expect(status.db).toBe('ready');
    expect(status.project).toBeDefined();
    expect(status.projectRoot).toBe(process.cwd());
  });
});
