import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import path from 'node:path';
import fs from 'node:fs';
import { recordHintFired, recordToolUse, readHintEvents } from './hintFollowLog.js';

describe('hint-follow log (src/harnesses/hintFollowLog.ts)', () => {
  const tempRoot = path.join(process.cwd(), 'src/__tests__/temp-hint-follow-log');
  const projectRoot = '/fake/project/hint-follow-test';

  beforeEach(() => {
    fs.rmSync(tempRoot, { recursive: true, force: true });
    fs.mkdirSync(tempRoot, { recursive: true });
    process.env.NEURON_HOOK_CACHE_DIR = tempRoot;
  });

  afterAll(() => {
    delete process.env.NEURON_HOOK_CACHE_DIR;
    fs.rmSync(tempRoot, { recursive: true, force: true });
  });

  it('returns no events when nothing has been recorded yet', () => {
    expect(readHintEvents(projectRoot)).toEqual([]);
  });

  it('records a fired event', () => {
    recordHintFired(projectRoot, 'session-1', 'neuron memory query "x" --limit 5');
    const events = readHintEvents(projectRoot);
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({
      type: 'fired',
      sessionId: 'session-1',
      command: 'neuron memory query "x" --limit 5',
    });
    expect(events[0].at).toBeTruthy();
  });

  it('records a query-run event when the Bash command matches neuron memory query', () => {
    recordToolUse(projectRoot, 'session-1', 'neuron memory query "x" --limit 5');
    const events = readHintEvents(projectRoot);
    expect(events).toHaveLength(1);
    expect(events[0].type).toBe('query-run');
  });

  it('ignores a Bash command that is not a neuron memory query', () => {
    recordToolUse(projectRoot, 'session-1', 'git status');
    expect(readHintEvents(projectRoot)).toEqual([]);
  });

  it('ignores a command that merely mentions "neuron memory query" as text, without invoking it', () => {
    // Regression: found live when this ticket's own smoke test — piping an
    // echoed JSON payload into `neuron hook ... post-tool-use` — tripped a
    // false positive on its own quoted command string.
    recordToolUse(
      projectRoot,
      'session-1',
      `echo '{"tool_input":{"command":"neuron memory query \\"x\\" --limit 5"}}' | neuron hook claude-code post-tool-use`
    );
    expect(readHintEvents(projectRoot)).toEqual([]);
  });

  it('still matches a real invocation chained after another command', () => {
    recordToolUse(projectRoot, 'session-1', 'cd /repo && neuron memory query "x" --limit 5');
    const events = readHintEvents(projectRoot);
    expect(events).toHaveLength(1);
    expect(events[0].type).toBe('query-run');
  });

  it('ignores prose inside a quoted argument that happens to sit right after a separator-like substring', () => {
    // Regression: found live — a real `neuron memory add "<text describing
    // 'cd /repo && neuron memory query ...' as an example>"` call matched
    // the separator-anchored pattern because the anchor position landed
    // inside the quoted content, not at the shell's top level.
    recordToolUse(
      projectRoot,
      'session-1',
      'neuron memory add --category learning "a real invocation like \'cd /repo && neuron memory query x\' still matches" --importance 4'
    );
    expect(readHintEvents(projectRoot)).toEqual([]);
  });

  it('appends both event types in call order, oldest first', () => {
    recordHintFired(projectRoot, 'session-1', 'neuron memory query "x" --limit 5');
    recordToolUse(projectRoot, 'session-1', 'neuron memory query "x" --limit 5');
    const events = readHintEvents(projectRoot);
    expect(events.map(e => e.type)).toEqual(['fired', 'query-run']);
  });

  it('keeps events isolated per project root', () => {
    recordHintFired(projectRoot, 'session-1', 'neuron memory query "x" --limit 5');
    recordHintFired('/fake/project/other', 'session-1', 'neuron memory query "y" --limit 3');
    expect(readHintEvents(projectRoot)).toHaveLength(1);
    expect(readHintEvents('/fake/project/other')).toHaveLength(1);
  });

  it('trims the oldest events once the cap is exceeded', () => {
    for (let i = 0; i < 2005; i++) {
      recordToolUse(projectRoot, 'session-1', `neuron memory query "q${i}" --limit 1`);
    }
    const events = readHintEvents(projectRoot);
    expect(events).toHaveLength(2000);
    expect(events[0].command).toContain('q5');
    expect(events[events.length - 1].command).toContain('q2004');
  });
});
