import { describe, it, expect, beforeEach, afterAll, afterEach } from 'vitest';
import path from 'node:path';
import fs from 'node:fs';
import { CodexAdapter } from './codex.js';
import { deriveFidelity } from './types.js';

describe('CodexAdapter (src/harnesses/codex.ts)', () => {
  const tempRoot = path.join(process.cwd(), 'src/__tests__/temp-codex-adapter');
  let projectDir: string;
  const adapter = new CodexAdapter();

  beforeEach(() => {
    projectDir = path.join(tempRoot, `proj-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    fs.mkdirSync(path.join(projectDir, '.codex'), { recursive: true });
    process.env.NEURON_HOOK_CACHE_DIR = path.join(tempRoot, 'hook-cache');
  });

  afterAll(() => {
    delete process.env.NEURON_HOOK_CACHE_DIR;
    fs.rmSync(tempRoot, { recursive: true, force: true });
  });

  const hooksPath = () => path.join(projectDir, '.codex', 'hooks.json');

  it('detects a Codex project by the .codex marker', () => {
    expect(adapter.detect(projectDir)).toBe(true);
    expect(adapter.detect(path.join(tempRoot, 'no-such-dir'))).toBe(false);
  });

  it('reports deterministic fidelity for session-start, pre-prompt, pre-command, and pre-stop', () => {
    const capability = adapter.capability();
    expect(capability['session-start'].injects).toBe(true);
    expect(capability['pre-prompt'].injects).toBe(true);
    expect(capability['context-reset'].injects).toBe(false);
    expect(capability['pre-command'].injects).toBe(true);
    expect(capability['pre-stop'].injects).toBe(true);
    expect(deriveFidelity(capability)).toBe('deterministic');
  });

  it('installs hooks for all five lifecycle points into a fresh hooks.json', async () => {
    const result = await adapter.install(projectDir, { target: 'project-committed' });
    expect(result.points).toEqual({
      'session-start': 'written',
      'pre-prompt': 'written',
      'context-reset': 'written',
      'pre-command': 'written',
      'pre-stop': 'written',
    });

    const file = JSON.parse(fs.readFileSync(hooksPath(), 'utf8'));
    expect(file.hooks.SessionStart[0].hooks[0]).toEqual({
      type: 'command',
      command: 'neuron hook codex session-start',
      timeout: 20,
    });
    expect(file.hooks.UserPromptSubmit[0].hooks[0].command).toBe('neuron hook codex pre-prompt');
    expect(file.hooks.PreCompact[0].hooks[0].command).toBe('neuron hook codex context-reset');
    expect(file.hooks.PreToolUse[0].hooks[0].command).toBe('neuron hook codex pre-command');
    expect(file.hooks.Stop[0].hooks[0].command).toBe('neuron hook codex pre-stop');
    // No `args` field — Codex's schema documents a single command string, not Claude Code's command+args split.
    expect(file.hooks.SessionStart[0].hooks[0].args).toBeUndefined();
  });

  it('is idempotent: a second install with identical content reports unchanged and does not duplicate entries', async () => {
    await adapter.install(projectDir, { target: 'project-committed' });
    const second = await adapter.install(projectDir, { target: 'project-committed' });
    expect(second.points).toEqual({
      'session-start': 'unchanged',
      'pre-prompt': 'unchanged',
      'context-reset': 'unchanged',
      'pre-command': 'unchanged',
      'pre-stop': 'unchanged',
    });

    const file = JSON.parse(fs.readFileSync(hooksPath(), 'utf8'));
    expect(file.hooks.SessionStart.length).toBe(1);
    expect(file.hooks.UserPromptSubmit.length).toBe(1);
    expect(file.hooks.Stop.length).toBe(1);
  });

  it('never touches a user\'s own pre-existing hooks in the same file', async () => {
    fs.mkdirSync(path.dirname(hooksPath()), { recursive: true });
    fs.writeFileSync(
      hooksPath(),
      JSON.stringify({
        someOtherSetting: true,
        hooks: {
          UserPromptSubmit: [{ matcher: 'Bash', hooks: [{ type: 'command', command: 'my-custom-hook.sh' }] }],
        },
      })
    );

    await adapter.install(projectDir, { target: 'project-committed' });

    const file = JSON.parse(fs.readFileSync(hooksPath(), 'utf8'));
    expect(file.someOtherSetting).toBe(true);
    expect(file.hooks.UserPromptSubmit).toHaveLength(2);
    expect(file.hooks.UserPromptSubmit[0].hooks[0].command).toBe('my-custom-hook.sh');
    expect(file.hooks.UserPromptSubmit[1].hooks[0].command).toBe('neuron hook codex pre-prompt');
  });

  it('keeps a conflicting neuron entry by default under the "ask" policy with no prompt available', async () => {
    await adapter.install(projectDir, { target: 'project-committed' });
    const file = JSON.parse(fs.readFileSync(hooksPath(), 'utf8'));
    file.hooks.SessionStart[0].hooks[0].timeout = 999;
    fs.writeFileSync(hooksPath(), JSON.stringify(file));

    const result = await adapter.install(projectDir, { target: 'project-committed' });
    expect(result.points['session-start']).toBe('kept-existing');

    const after = JSON.parse(fs.readFileSync(hooksPath(), 'utf8'));
    expect(after.hooks.SessionStart[0].hooks[0].timeout).toBe(999);
  });

  it('overwrites a conflicting neuron entry when the overwrite policy says so', async () => {
    await adapter.install(projectDir, { target: 'project-committed' });
    const file = JSON.parse(fs.readFileSync(hooksPath(), 'utf8'));
    file.hooks.SessionStart[0].hooks[0].timeout = 999;
    fs.writeFileSync(hooksPath(), JSON.stringify(file));

    const result = await adapter.install(projectDir, { target: 'project-committed', overwrite: 'overwrite' });
    expect(result.points['session-start']).toBe('written');

    const after = JSON.parse(fs.readFileSync(hooksPath(), 'utf8'));
    expect(after.hooks.SessionStart[0].hooks[0].timeout).toBe(20);
  });

  it('asks via onConflict when a conflicting entry exists and the ask policy is explicit', async () => {
    await adapter.install(projectDir, { target: 'project-committed' });
    const file = JSON.parse(fs.readFileSync(hooksPath(), 'utf8'));
    file.hooks.SessionStart[0].hooks[0].timeout = 999;
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

  it('refuses to clobber a hooks.json that is not valid JSON', async () => {
    fs.mkdirSync(path.dirname(hooksPath()), { recursive: true });
    fs.writeFileSync(hooksPath(), '{ not valid json');
    await expect(adapter.install(projectDir, { target: 'project-committed' })).rejects.toThrow(/not valid JSON/);
  });

  it('uninstall removes only neuron\'s own entries, leaving user hooks and other keys intact', async () => {
    fs.mkdirSync(path.dirname(hooksPath()), { recursive: true });
    fs.writeFileSync(
      hooksPath(),
      JSON.stringify({
        someOtherSetting: true,
        hooks: { UserPromptSubmit: [{ matcher: 'Bash', hooks: [{ type: 'command', command: 'my-custom-hook.sh' }] }] },
      })
    );
    await adapter.install(projectDir, { target: 'project-committed' });

    const result = await adapter.uninstall(projectDir);
    expect(result.removed).toHaveLength(1);
    expect(result.removed[0].removedCount).toBe(5);

    const file = JSON.parse(fs.readFileSync(hooksPath(), 'utf8'));
    expect(file.someOtherSetting).toBe(true);
    expect(file.hooks.UserPromptSubmit).toHaveLength(1);
    expect(file.hooks.UserPromptSubmit[0].hooks[0].command).toBe('my-custom-hook.sh');
    expect(file.hooks.SessionStart).toBeUndefined();
    expect(file.hooks.PreCompact).toBeUndefined();
    expect(file.hooks.Stop).toBeUndefined();
  });

  it('uninstall on a project with no hooks installed is a safe no-op', async () => {
    const result = await adapter.uninstall(projectDir);
    expect(result.removed).toEqual([]);
  });

  it('verify reports registration and firing evidence per lifecycle point', async () => {
    const before = adapter.verify(projectDir);
    expect(before['session-start'].registered).toBe(false);
    expect(before['session-start'].fireCount).toBe(0);

    await adapter.install(projectDir, { target: 'project-committed' });
    const afterInstall = adapter.verify(projectDir);
    expect(afterInstall['session-start'].registered).toBe(true);
    expect(afterInstall['session-start'].targetPath).toBe(hooksPath());
    expect(afterInstall['session-start'].fireCount).toBe(0);

    const { recordFired } = await import('./hookState.js');
    recordFired(projectDir, adapter.id, 'session-start');
    const afterFire = adapter.verify(projectDir);
    expect(afterFire['session-start'].fireCount).toBe(1);
    expect(afterFire['session-start'].lastFiredAt).toBeDefined();
  });

  it('collapses project-local into the same hooks.json project-committed uses, with a warning', async () => {
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

    it('writes to ~/.codex/hooks.json when the target is user-global', async () => {
      const result = await adapter.install(projectDir, { target: 'user-global' });
      const expectedPath = path.join(fakeHome, '.codex', 'hooks.json');
      expect(result.targetPath).toBe(expectedPath);
      expect(fs.existsSync(expectedPath)).toBe(true);
    });
  });
});
