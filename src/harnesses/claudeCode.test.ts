import { describe, it, expect, beforeEach, afterAll, afterEach } from 'vitest';
import path from 'node:path';
import fs from 'node:fs';
import { ClaudeCodeAdapter } from './claudeCode.js';
import { deriveFidelity } from './types.js';

describe('ClaudeCodeAdapter (src/harnesses/claudeCode.ts)', () => {
  const tempRoot = path.join(process.cwd(), 'src/__tests__/temp-claude-adapter');
  let projectDir: string;
  const adapter = new ClaudeCodeAdapter();

  beforeEach(() => {
    projectDir = path.join(tempRoot, `proj-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    fs.mkdirSync(path.join(projectDir, '.claude'), { recursive: true });
    process.env.NEURON_HOOK_CACHE_DIR = path.join(tempRoot, 'hook-cache');
  });

  afterAll(() => {
    delete process.env.NEURON_HOOK_CACHE_DIR;
    fs.rmSync(tempRoot, { recursive: true, force: true });
  });

  const settingsPath = () => path.join(projectDir, '.claude', 'settings.json');

  it('detects a Claude Code project by the .claude marker', () => {
    expect(adapter.detect(projectDir)).toBe(true);
    expect(adapter.detect(path.join(tempRoot, 'no-such-dir'))).toBe(false);
  });

  it('reports deterministic fidelity for session-start, pre-prompt, and pre-command', () => {
    const capability = adapter.capability();
    expect(capability['session-start'].injects).toBe(true);
    expect(capability['pre-prompt'].injects).toBe(true);
    expect(capability['context-reset'].injects).toBe(false);
    expect(capability['pre-command'].injects).toBe(true);
    expect(deriveFidelity(capability)).toBe('deterministic');
  });

  it('installs hooks for all four lifecycle points into a fresh settings.json', async () => {
    const result = await adapter.install(projectDir, { target: 'project-committed' });
    expect(result.points).toEqual({
      'session-start': 'written',
      'pre-prompt': 'written',
      'context-reset': 'written',
      'pre-command': 'written',
    });

    const settings = JSON.parse(fs.readFileSync(settingsPath(), 'utf8'));
    expect(settings.hooks.SessionStart[0].hooks[0]).toEqual({
      type: 'command',
      command: 'neuron',
      args: ['hook', 'claude-code', 'session-start'],
      timeout: 20,
    });
    expect(settings.hooks.UserPromptSubmit[0].hooks[0].args).toEqual(['hook', 'claude-code', 'pre-prompt']);
    expect(settings.hooks.PreCompact[0].hooks[0].args).toEqual(['hook', 'claude-code', 'context-reset']);
    expect(settings.hooks.PreToolUse[0].hooks[0].args).toEqual(['hook', 'claude-code', 'pre-command']);
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

    const settings = JSON.parse(fs.readFileSync(settingsPath(), 'utf8'));
    expect(settings.hooks.SessionStart.length).toBe(1);
    expect(settings.hooks.UserPromptSubmit.length).toBe(1);
  });

  it('never touches a user\'s own pre-existing hooks in the same file', async () => {
    fs.writeFileSync(
      settingsPath(),
      JSON.stringify({
        someOtherSetting: true,
        hooks: {
          UserPromptSubmit: [{ matcher: 'Bash', hooks: [{ type: 'command', command: 'my-custom-hook.sh' }] }],
        },
      })
    );

    await adapter.install(projectDir, { target: 'project-committed' });

    const settings = JSON.parse(fs.readFileSync(settingsPath(), 'utf8'));
    expect(settings.someOtherSetting).toBe(true);
    expect(settings.hooks.UserPromptSubmit).toHaveLength(2);
    expect(settings.hooks.UserPromptSubmit[0].hooks[0].command).toBe('my-custom-hook.sh');
    expect(settings.hooks.UserPromptSubmit[1].hooks[0].command).toBe('neuron');
  });

  it('keeps a conflicting neuron entry by default under the "ask" policy with no prompt available', async () => {
    await adapter.install(projectDir, { target: 'project-committed' });
    // Simulate an older version's entry: different timeout.
    const settings = JSON.parse(fs.readFileSync(settingsPath(), 'utf8'));
    settings.hooks.SessionStart[0].hooks[0].timeout = 999;
    fs.writeFileSync(settingsPath(), JSON.stringify(settings));

    const result = await adapter.install(projectDir, { target: 'project-committed' });
    expect(result.points['session-start']).toBe('kept-existing');

    const after = JSON.parse(fs.readFileSync(settingsPath(), 'utf8'));
    expect(after.hooks.SessionStart[0].hooks[0].timeout).toBe(999);
  });

  it('overwrites a conflicting neuron entry when the overwrite policy says so', async () => {
    await adapter.install(projectDir, { target: 'project-committed' });
    const settings = JSON.parse(fs.readFileSync(settingsPath(), 'utf8'));
    settings.hooks.SessionStart[0].hooks[0].timeout = 999;
    fs.writeFileSync(settingsPath(), JSON.stringify(settings));

    const result = await adapter.install(projectDir, { target: 'project-committed', overwrite: 'overwrite' });
    expect(result.points['session-start']).toBe('written');

    const after = JSON.parse(fs.readFileSync(settingsPath(), 'utf8'));
    expect(after.hooks.SessionStart[0].hooks[0].timeout).toBe(20);
  });

  it('asks via onConflict when a conflicting entry exists and the ask policy is explicit', async () => {
    await adapter.install(projectDir, { target: 'project-committed' });
    const settings = JSON.parse(fs.readFileSync(settingsPath(), 'utf8'));
    settings.hooks.SessionStart[0].hooks[0].timeout = 999;
    fs.writeFileSync(settingsPath(), JSON.stringify(settings));

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

  it('refuses to clobber a settings.json that is not valid JSON', async () => {
    fs.writeFileSync(settingsPath(), '{ not valid json');
    await expect(adapter.install(projectDir, { target: 'project-committed' })).rejects.toThrow(/not valid JSON/);
  });

  it('uninstall removes only neuron\'s own entries, leaving user hooks and other keys intact', async () => {
    fs.writeFileSync(
      settingsPath(),
      JSON.stringify({
        someOtherSetting: true,
        hooks: { UserPromptSubmit: [{ matcher: 'Bash', hooks: [{ type: 'command', command: 'my-custom-hook.sh' }] }] },
      })
    );
    await adapter.install(projectDir, { target: 'project-committed' });

    const result = await adapter.uninstall(projectDir);
    expect(result.removed).toHaveLength(1);
    expect(result.removed[0].removedCount).toBe(4);

    const settings = JSON.parse(fs.readFileSync(settingsPath(), 'utf8'));
    expect(settings.someOtherSetting).toBe(true);
    expect(settings.hooks.UserPromptSubmit).toHaveLength(1);
    expect(settings.hooks.UserPromptSubmit[0].hooks[0].command).toBe('my-custom-hook.sh');
    expect(settings.hooks.SessionStart).toBeUndefined();
    expect(settings.hooks.PreCompact).toBeUndefined();
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
    expect(afterInstall['session-start'].targetPath).toBe(settingsPath());
    expect(afterInstall['session-start'].fireCount).toBe(0);

    const { recordFired } = await import('./hookState.js');
    recordFired(projectDir, adapter.id, 'session-start');
    const afterFire = adapter.verify(projectDir);
    expect(afterFire['session-start'].fireCount).toBe(1);
    expect(afterFire['session-start'].lastFiredAt).toBeDefined();
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

    it('writes to ~/.claude/settings.json when the target is user-global', async () => {
      const result = await adapter.install(projectDir, { target: 'user-global' });
      const expectedPath = path.join(fakeHome, '.claude', 'settings.json');
      expect(result.targetPath).toBe(expectedPath);
      expect(fs.existsSync(expectedPath)).toBe(true);
    });
  });
});
