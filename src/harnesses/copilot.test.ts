import { describe, it, expect, beforeEach, afterAll, afterEach } from 'vitest';
import path from 'node:path';
import fs from 'node:fs';
import { CopilotAdapter } from './copilot.js';
import { deriveFidelity } from './types.js';

describe('CopilotAdapter (src/harnesses/copilot.ts)', () => {
  const tempRoot = path.join(process.cwd(), 'src/__tests__/temp-copilot-adapter');
  let projectDir: string;
  const adapter = new CopilotAdapter();

  beforeEach(() => {
    projectDir = path.join(tempRoot, `proj-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    fs.mkdirSync(path.join(projectDir, '.github'), { recursive: true });
    process.env.NEURON_HOOK_CACHE_DIR = path.join(tempRoot, 'hook-cache');
  });

  afterAll(() => {
    delete process.env.NEURON_HOOK_CACHE_DIR;
    fs.rmSync(tempRoot, { recursive: true, force: true });
  });

  const hooksPath = () => path.join(projectDir, '.github', 'hooks', 'neuron.json');

  it('detects a Copilot-eligible project by the .github marker', () => {
    expect(adapter.detect(projectDir)).toBe(true);
    expect(adapter.detect(path.join(tempRoot, 'no-such-dir'))).toBe(false);
  });

  it('reports best-effort fidelity: only session-start injects, and even it has undocumented failure/payload behaviour', () => {
    const capability = adapter.capability();
    expect(capability['session-start'].injects).toBe(true);
    expect(capability['session-start'].failurePosture).toBe('unknown');
    expect(capability['session-start'].payloadCapChars).toBe('unknown');
    expect(capability['pre-prompt'].injects).toBe(false);
    expect(capability['context-reset'].injects).toBe(false);
    expect(capability['pre-command'].injects).toBe(false);
    expect(deriveFidelity(capability)).toBe('best-effort');
  });

  it('installs a hook for session-start only, leaving pre-prompt, context-reset, and pre-command untouched', async () => {
    const result = await adapter.install(projectDir, { target: 'project-committed' });
    expect(result.points).toEqual({
      'session-start': 'written',
      'pre-prompt': 'unchanged',
      'context-reset': 'unchanged',
      'pre-command': 'unchanged',
    });

    const file = JSON.parse(fs.readFileSync(hooksPath(), 'utf8'));
    expect(file.version).toBeUndefined(); // neuron never invents a version field that isn't already present
    // Flat array per event — no matcher-group wrapping, unlike Claude Code/Codex.
    expect(file.hooks.sessionStart).toEqual([
      { type: 'command', command: 'neuron hook copilot session-start', timeoutSec: 20 },
    ]);
    expect(file.hooks.userPromptSubmitted).toBeUndefined();
    expect(file.hooks.PreCompact).toBeUndefined();
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
  });

  it('never touches a user\'s own pre-existing hooks in the same file, including other events', async () => {
    fs.mkdirSync(path.dirname(hooksPath()), { recursive: true });
    fs.writeFileSync(
      hooksPath(),
      JSON.stringify({
        version: 1,
        hooks: {
          sessionStart: [{ type: 'command', command: 'echo hi', timeoutSec: 10 }],
          postToolUse: [{ type: 'command', command: 'my-custom-hook.sh' }],
        },
      })
    );

    await adapter.install(projectDir, { target: 'project-committed' });

    const file = JSON.parse(fs.readFileSync(hooksPath(), 'utf8'));
    expect(file.version).toBe(1);
    expect(file.hooks.sessionStart).toHaveLength(2);
    expect(file.hooks.sessionStart[0].command).toBe('echo hi');
    expect(file.hooks.sessionStart[1].command).toBe('neuron hook copilot session-start');
    expect(file.hooks.postToolUse).toEqual([{ type: 'command', command: 'my-custom-hook.sh' }]);
  });

  it('keeps a conflicting neuron entry by default under the "ask" policy with no prompt available', async () => {
    await adapter.install(projectDir, { target: 'project-committed' });
    const file = JSON.parse(fs.readFileSync(hooksPath(), 'utf8'));
    file.hooks.sessionStart[0].timeoutSec = 999;
    fs.writeFileSync(hooksPath(), JSON.stringify(file));

    const result = await adapter.install(projectDir, { target: 'project-committed' });
    expect(result.points['session-start']).toBe('kept-existing');

    const after = JSON.parse(fs.readFileSync(hooksPath(), 'utf8'));
    expect(after.hooks.sessionStart[0].timeoutSec).toBe(999);
  });

  it('overwrites a conflicting neuron entry when the overwrite policy says so', async () => {
    await adapter.install(projectDir, { target: 'project-committed' });
    const file = JSON.parse(fs.readFileSync(hooksPath(), 'utf8'));
    file.hooks.sessionStart[0].timeoutSec = 999;
    fs.writeFileSync(hooksPath(), JSON.stringify(file));

    const result = await adapter.install(projectDir, { target: 'project-committed', overwrite: 'overwrite' });
    expect(result.points['session-start']).toBe('written');

    const after = JSON.parse(fs.readFileSync(hooksPath(), 'utf8'));
    expect(after.hooks.sessionStart[0].timeoutSec).toBe(20);
  });

  it('asks via onConflict when a conflicting entry exists and the ask policy is explicit', async () => {
    await adapter.install(projectDir, { target: 'project-committed' });
    const file = JSON.parse(fs.readFileSync(hooksPath(), 'utf8'));
    file.hooks.sessionStart[0].timeoutSec = 999;
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

  it('uninstall removes only neuron\'s own entry, leaving user hooks and other keys intact', async () => {
    fs.mkdirSync(path.dirname(hooksPath()), { recursive: true });
    fs.writeFileSync(
      hooksPath(),
      JSON.stringify({
        version: 1,
        hooks: { sessionStart: [{ type: 'command', command: 'echo hi', timeoutSec: 10 }] },
      })
    );
    await adapter.install(projectDir, { target: 'project-committed' });

    const result = await adapter.uninstall(projectDir);
    expect(result.removed).toHaveLength(1);
    expect(result.removed[0].removedCount).toBe(1);

    const file = JSON.parse(fs.readFileSync(hooksPath(), 'utf8'));
    expect(file.version).toBe(1);
    expect(file.hooks.sessionStart).toEqual([{ type: 'command', command: 'echo hi', timeoutSec: 10 }]);
  });

  it('uninstall on a project with no hooks installed is a safe no-op', async () => {
    const result = await adapter.uninstall(projectDir);
    expect(result.removed).toEqual([]);
  });

  it('verify reports registration and firing evidence for session-start, and never-registered for the unwired points', async () => {
    const before = adapter.verify(projectDir);
    expect(before['session-start'].registered).toBe(false);
    expect(before['pre-prompt'].registered).toBe(false);
    expect(before['context-reset'].registered).toBe(false);

    await adapter.install(projectDir, { target: 'project-committed' });
    const afterInstall = adapter.verify(projectDir);
    expect(afterInstall['session-start'].registered).toBe(true);
    expect(afterInstall['session-start'].targetPath).toBe(hooksPath());
    // Never wired, so never registered — even after a real install.
    expect(afterInstall['pre-prompt'].registered).toBe(false);
    expect(afterInstall['context-reset'].registered).toBe(false);

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

    it('writes to ~/.copilot/hooks/neuron.json when the target is user-global', async () => {
      const result = await adapter.install(projectDir, { target: 'user-global' });
      const expectedPath = path.join(fakeHome, '.copilot', 'hooks', 'neuron.json');
      expect(result.targetPath).toBe(expectedPath);
      expect(fs.existsSync(expectedPath)).toBe(true);
    });
  });
});
