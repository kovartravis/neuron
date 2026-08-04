import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import fs from 'node:fs';

describe('CLI Command: hook', () => {
  const tempDbDir = path.join(process.cwd(), 'src/__tests__/temp-hook');
  const cliPath = path.join(process.cwd(), 'dist/cli.js');
  let tempDbPath: string;
  let projectDir: string;

  beforeAll(() => {
    fs.mkdirSync(tempDbDir, { recursive: true });
  });

  beforeEach(() => {
    tempDbPath = path.join(tempDbDir, `test-hook-${Date.now()}-${Math.random().toString(36).slice(2)}.sqlite`);
    projectDir = path.join(tempDbDir, `proj-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    fs.mkdirSync(projectDir, { recursive: true });
    fs.writeFileSync(path.join(projectDir, 'package.json'), '{}');
  });

  afterAll(() => {
    fs.rmSync(tempDbDir, { recursive: true, force: true });
  });

  function env(extra: Record<string, string> = {}) {
    return {
      ...process.env,
      NEURON_DB_PATH: tempDbPath,
      NEURON_MOCK_EMBEDDER: 'true',
      NEURON_HOOK_CACHE_DIR: path.join(projectDir, '.hook-cache'),
      ...extra,
    };
  }

  function run(args: string[], stdin: string) {
    return spawnSync('node', [cliPath, ...args], { cwd: projectDir, env: env(), input: stdin });
  }

  it('exits 0 and prints nothing on session-start against an empty store', () => {
    const result = run(['hook', 'claude-code', 'session-start'], JSON.stringify({ session_id: 's1' }));
    expect(result.status).toBe(0);
    expect(result.stdout.toString().trim()).toBe('');
  });

  it('injects the architecture card via SessionStart hookSpecificOutput when one exists', () => {
    execAdd('Repository Architectural Blueprint: 3 modules, 12 exports.', 'architecture');
    const result = run(['hook', 'claude-code', 'session-start'], JSON.stringify({ session_id: 's1' }));
    expect(result.status).toBe(0);
    const parsed = JSON.parse(result.stdout.toString().trim());
    expect(parsed.hookSpecificOutput.hookEventName).toBe('SessionStart');
    expect(parsed.hookSpecificOutput.additionalContext).toContain('Repository Architectural Blueprint');
  });

  it('injects relevant results via UserPromptSubmit for pre-prompt', () => {
    execAdd('Use the Repository Pattern for database access in this codebase', 'learning');
    const result = run(
      ['hook', 'claude-code', 'pre-prompt'],
      JSON.stringify({ session_id: 's1', prompt: 'how should I access the database here' })
    );
    expect(result.status).toBe(0);
    const parsed = JSON.parse(result.stdout.toString().trim());
    expect(parsed.hookSpecificOutput.hookEventName).toBe('UserPromptSubmit');
    expect(parsed.hookSpecificOutput.additionalContext).toContain('Repository Pattern');
  });

  it('deduplicates pre-prompt injection within the same session via the ledger', () => {
    execAdd('Use the Repository Pattern for database access in this codebase', 'learning');
    const stdin = JSON.stringify({ session_id: 'dedupe-session', prompt: 'database access pattern' });

    const first = run(['hook', 'claude-code', 'pre-prompt'], stdin);
    expect(first.stdout.toString().trim()).not.toBe('');

    const second = run(['hook', 'claude-code', 'pre-prompt'], stdin);
    expect(second.status).toBe(0);
    expect(second.stdout.toString().trim()).toBe('');
  });

  it('context-reset clears the ledger so a previously-injected entry reappears', () => {
    execAdd('Use the Repository Pattern for database access in this codebase', 'learning');
    const stdin = JSON.stringify({ session_id: 'reset-session', prompt: 'database access pattern' });

    expect(run(['hook', 'claude-code', 'pre-prompt'], stdin).stdout.toString().trim()).not.toBe('');
    expect(run(['hook', 'claude-code', 'pre-prompt'], stdin).stdout.toString().trim()).toBe('');

    const resetResult = run(['hook', 'claude-code', 'context-reset'], JSON.stringify({ session_id: 'reset-session' }));
    expect(resetResult.status).toBe(0);

    expect(run(['hook', 'claude-code', 'pre-prompt'], stdin).stdout.toString().trim()).not.toBe('');
  });

  it('degrades silently (exit 0, empty stdout) on malformed stdin rather than crashing', () => {
    const result = run(['hook', 'claude-code', 'pre-prompt'], 'not json at all {{{');
    expect(result.status).toBe(0);
    expect(result.stdout.toString().trim()).toBe('');
  });

  it('degrades silently when the prompt field is missing entirely', () => {
    const result = run(['hook', 'claude-code', 'pre-prompt'], JSON.stringify({ session_id: 's1' }));
    expect(result.status).toBe(0);
    expect(result.stdout.toString().trim()).toBe('');
  });

  it('is a no-op for an unrecognised harness or lifecycle point rather than erroring', () => {
    const result = run(['hook', 'not-a-real-harness', 'session-start'], '{}');
    expect(result.status).toBe(0);
    expect(result.stdout.toString().trim()).toBe('');
  });

  it('never exits with code 2 (which would block the prompt on UserPromptSubmit)', () => {
    // A store that cannot be reached (bogus DB path) forces the query to fail
    // internally; the hook must still degrade to exit 0, never exit 2.
    const result = spawnSync('node', [cliPath, 'hook', 'claude-code', 'pre-prompt'], {
      cwd: projectDir,
      env: env({ NEURON_DB_PATH: '/nonexistent/deeply/nested/path/db.sqlite' }),
      input: JSON.stringify({ session_id: 's1', prompt: 'anything' }),
    });
    expect(result.status).toBe(0);
  });

  function execAdd(content: string, category: string) {
    spawnSync(
      'node',
      [cliPath, 'memory', 'add', content, '--category', category, '--importance', '5'],
      { cwd: projectDir, env: env() }
    );
  }
});
