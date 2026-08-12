import { describe, it, expect, beforeEach, afterAll, afterEach } from 'vitest';
import path from 'node:path';
import fs from 'node:fs';
import { CursorAdapter } from './cursor.js';
import { deriveFidelity } from './types.js';

describe('CursorAdapter (src/harnesses/cursor.ts)', () => {
  const tempRoot = path.join(process.cwd(), 'src/__tests__/temp-cursor-adapter');
  let projectDir: string;
  const adapter = new CursorAdapter();

  beforeEach(() => {
    projectDir = path.join(tempRoot, `proj-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    fs.mkdirSync(path.join(projectDir, '.cursor'), { recursive: true });
    process.env.NEURON_HOOK_CACHE_DIR = path.join(tempRoot, 'hook-cache');
  });

  afterAll(() => {
    delete process.env.NEURON_HOOK_CACHE_DIR;
    fs.rmSync(tempRoot, { recursive: true, force: true });
  });

  const hooksPath = () => path.join(projectDir, '.cursor', 'hooks.json');

  it('detects a Cursor-eligible project by the .cursor marker', () => {
    expect(adapter.detect(projectDir)).toBe(true);
    expect(adapter.detect(path.join(tempRoot, 'no-such-dir'))).toBe(false);
  });

  it('reports best-effort fidelity: session-start injects with a known fail-open posture but unknown payload cap/timeout', () => {
    const capability = adapter.capability();
    expect(capability['session-start'].injects).toBe(true);
    expect(capability['session-start'].failurePosture).toBe('fail-open');
    expect(capability['session-start'].payloadCapChars).toBe('unknown');
    expect(capability['session-start'].timeoutMs).toBe('unknown');
    expect(capability['pre-prompt'].injects).toBe(false);
    expect(capability['context-reset'].injects).toBe(false);
    expect(capability['pre-command'].injects).toBe(false);
    expect(deriveFidelity(capability)).toBe('best-effort');
  });

  it('installs hooks for session-start and context-reset, leaving pre-prompt and pre-command untouched', async () => {
    const result = await adapter.install(projectDir, { target: 'project-committed' });
    expect(result.points).toEqual({
      'session-start': 'written',
      'pre-prompt': 'unchanged',
      'context-reset': 'written',
      'pre-command': 'unchanged',
    });

    const file = JSON.parse(fs.readFileSync(hooksPath(), 'utf8'));
    // Documented as part of Cursor's own schema (unlike Copilot's), so neuron
    // sets it on a file it creates fresh.
    expect(file.version).toBe(1);
    // Flat array per event, each entry a single command string — no
    // matcher-group wrapping, unlike Claude Code/Codex.
    expect(file.hooks.sessionStart).toEqual([
      { type: 'command', command: 'neuron hook cursor session-start', timeout: 20 },
    ]);
    expect(file.hooks.preCompact).toEqual([
      { type: 'command', command: 'neuron hook cursor context-reset', timeout: 5 },
    ]);
    expect(file.hooks.beforeSubmitPrompt).toBeUndefined();
  });

  it('is idempotent: a second install with identical content reports unchanged and does not duplicate entries', async () => {
    await adapter.install(projectDir, { target: 'project-committed' });
    const second = await adapter.install(projectDir, { target: 'project-committed' });
    expect(second.points).toEqual({
      'session-start': 'unchanged',
      'pre-prompt': 'unchanged',
      'context-reset': 'unchanged',
      'pre-command': 'unchanged',
    });

    const file = JSON.parse(fs.readFileSync(hooksPath(), 'utf8'));
    expect(file.hooks.sessionStart.length).toBe(1);
    expect(file.hooks.preCompact.length).toBe(1);
  });

  it('never touches a user\'s own pre-existing hooks or version field, including other events', async () => {
    fs.mkdirSync(path.dirname(hooksPath()), { recursive: true });
    fs.writeFileSync(
      hooksPath(),
      JSON.stringify({
        version: 2,
        hooks: {
          sessionStart: [{ type: 'command', command: 'echo hi', timeout: 10 }],
          postToolUse: [{ type: 'command', command: 'my-custom-hook.sh' }],
        },
      })
    );

    await adapter.install(projectDir, { target: 'project-committed' });

    const file = JSON.parse(fs.readFileSync(hooksPath(), 'utf8'));
    expect(file.version).toBe(2); // pre-existing version left exactly as the user set it
    expect(file.hooks.sessionStart).toHaveLength(2);
    expect(file.hooks.sessionStart[0].command).toBe('echo hi');
    expect(file.hooks.sessionStart[1].command).toBe('neuron hook cursor session-start');
    expect(file.hooks.postToolUse).toEqual([{ type: 'command', command: 'my-custom-hook.sh' }]);
  });

  it('keeps a conflicting neuron entry by default under the "ask" policy with no prompt available', async () => {
    await adapter.install(projectDir, { target: 'project-committed' });
    const file = JSON.parse(fs.readFileSync(hooksPath(), 'utf8'));
    file.hooks.preCompact[0].timeout = 999;
    fs.writeFileSync(hooksPath(), JSON.stringify(file));

    const result = await adapter.install(projectDir, { target: 'project-committed' });
    expect(result.points['context-reset']).toBe('kept-existing');

    const after = JSON.parse(fs.readFileSync(hooksPath(), 'utf8'));
    expect(after.hooks.preCompact[0].timeout).toBe(999);
  });

  it('overwrites a conflicting neuron entry when the overwrite policy says so', async () => {
    await adapter.install(projectDir, { target: 'project-committed' });
    const file = JSON.parse(fs.readFileSync(hooksPath(), 'utf8'));
    file.hooks.preCompact[0].timeout = 999;
    fs.writeFileSync(hooksPath(), JSON.stringify(file));

    const result = await adapter.install(projectDir, { target: 'project-committed', overwrite: 'overwrite' });
    expect(result.points['context-reset']).toBe('written');

    const after = JSON.parse(fs.readFileSync(hooksPath(), 'utf8'));
    expect(after.hooks.preCompact[0].timeout).toBe(5);
  });

  it('asks via onConflict when a conflicting entry exists and the ask policy is explicit', async () => {
    await adapter.install(projectDir, { target: 'project-committed' });
    const file = JSON.parse(fs.readFileSync(hooksPath(), 'utf8'));
    file.hooks.sessionStart[0].timeout = 999;
    fs.writeFileSync(hooksPath(), JSON.stringify(file));

    let asked = false;
    const result = await adapter.install(projectDir, {
      target: 'project-committed',
      overwrite: 'ask',
      onConflict: async info => {
        asked = true;
        expect(info.point).toBe('session-start');
        return true;
      },
    });
    expect(asked).toBe(true);
    expect(result.points['session-start']).toBe('written');
  });

  it('refuses to clobber a hooks file that is not valid JSON', async () => {
    fs.mkdirSync(path.dirname(hooksPath()), { recursive: true });
    fs.writeFileSync(hooksPath(), '{ not valid json');
    await expect(adapter.install(projectDir, { target: 'project-committed' })).rejects.toThrow(/not valid JSON/);
  });

  it('uninstall removes only neuron\'s own entries, leaving user hooks and the version field intact', async () => {
    fs.mkdirSync(path.dirname(hooksPath()), { recursive: true });
    fs.writeFileSync(
      hooksPath(),
      JSON.stringify({
        version: 1,
        hooks: { sessionStart: [{ type: 'command', command: 'echo hi', timeout: 10 }] },
      })
    );
    await adapter.install(projectDir, { target: 'project-committed' });

    const result = await adapter.uninstall(projectDir);
    expect(result.removed).toHaveLength(1);
    expect(result.removed[0].removedCount).toBe(2); // session-start + context-reset

    const file = JSON.parse(fs.readFileSync(hooksPath(), 'utf8'));
    expect(file.version).toBe(1);
    expect(file.hooks.sessionStart).toEqual([{ type: 'command', command: 'echo hi', timeout: 10 }]);
    expect(file.hooks.preCompact).toBeUndefined();
  });

  it('uninstall on a project with no hooks installed is a safe no-op', async () => {
    const result = await adapter.uninstall(projectDir);
    expect(result.removed).toEqual([]);
  });

  it('verify reports registration and firing evidence for session-start and context-reset, and never-registered for pre-prompt', async () => {
    const before = adapter.verify(projectDir);
    expect(before['session-start'].registered).toBe(false);
    expect(before['pre-prompt'].registered).toBe(false);
    expect(before['context-reset'].registered).toBe(false);

    await adapter.install(projectDir, { target: 'project-committed' });
    const afterInstall = adapter.verify(projectDir);
    expect(afterInstall['session-start'].registered).toBe(true);
    expect(afterInstall['session-start'].targetPath).toBe(hooksPath());
    expect(afterInstall['context-reset'].registered).toBe(true);
    // Never wired, so never registered — even after a real install.
    expect(afterInstall['pre-prompt'].registered).toBe(false);

    const { recordFired } = await import('./hookState.js');
    recordFired(projectDir, adapter.id, 'session-start');
    const afterFire = adapter.verify(projectDir);
    expect(afterFire['session-start'].fireCount).toBe(1);
    expect(afterFire['session-start'].lastFiredAt).toBeDefined();
  });

  it('collapses project-local into the same file project-committed uses, with a warning', async () => {
    const originalWrite = process.stderr.write.bind(process.stderr);
    let warned = '';
    // @ts-expect-error test spy
    process.stderr.write = (chunk: string) => { warned += chunk; return true; };
    try {
      const result = await adapter.install(projectDir, { target: 'project-local' });
      expect(result.targetPath).toBe(hooksPath());
    } finally {
      process.stderr.write = originalWrite;
    }
    expect(warned).toContain('no documented gitignored project-level hooks scope');
    expect(fs.existsSync(hooksPath())).toBe(true);
  });

  describe('user-global target', () => {
    let fakeHome: string;
    const originalHome = process.env.HOME;

    beforeEach(() => {
      fakeHome = path.join(tempRoot, `home-${Date.now()}-${Math.random().toString(36).slice(2)}`);
      fs.mkdirSync(fakeHome, { recursive: true });
      process.env.HOME = fakeHome;
    });

    afterEach(() => {
      process.env.HOME = originalHome;
    });

    it('writes to ~/.cursor/hooks.json when the target is user-global', async () => {
      const result = await adapter.install(projectDir, { target: 'user-global' });
      const expectedPath = path.join(fakeHome, '.cursor', 'hooks.json');
      expect(result.targetPath).toBe(expectedPath);
      expect(fs.existsSync(expectedPath)).toBe(true);
    });
  });
});
