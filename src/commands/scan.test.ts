import { describe, it, expect } from 'vitest';
import { execSync } from 'node:child_process';
import path from 'node:path';

describe('CLI Command: scan', () => {
  const cliPath = path.join(process.cwd(), 'dist/cli.js');

  it('executes neuron scan --dry-run --json and returns structured JSON payload to stdout', () => {
    const stdout = execSync(`node ${cliPath} scan --dry-run --json`).toString();
    const result = JSON.parse(stdout);

    expect(result.project).toBe('neuron');
    expect(result.projectRoot).toBe(process.cwd());
    expect(result.manifest.techStack).toContain('typescript');
    expect(Array.isArray(result.topology)).toBe(true);
    expect(Array.isArray(result.modules)).toBe(true);
    expect(result.architectureSummary.length).toBeGreaterThan(10);
  });

  it('executes neuron scan --dry-run and returns structured Markdown blueprint card', () => {
    const stdout = execSync(`node ${cliPath} scan --dry-run`).toString();

    expect(stdout).toContain('# 🏛️ Repository Architectural Blueprint:');
    expect(stdout).toContain('category: decisions');
    expect(stdout).toContain('Primary Subsystems');
  });
});

