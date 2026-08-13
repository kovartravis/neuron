import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { HARNESSES, isHarnessPresent, detectHarnesses } from './harness.js';

describe('harness detection (ticket 31, neuron-2.4.0)', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'neuron-t31-harness-'));
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  const github = () => HARNESSES.find(h => h.name === 'github')!;
  const claude = () => HARNESSES.find(h => h.name === 'claude')!;

  it('does not treat a bare .github/ dir as Copilot present (avoids the CI/issue-template false positive)', () => {
    fs.mkdirSync(path.join(tempDir, '.github', 'workflows'), { recursive: true });
    fs.writeFileSync(path.join(tempDir, '.github', 'workflows', 'ci.yml'), 'name: ci\n');

    expect(isHarnessPresent(tempDir, github())).toBe(false);
    expect(detectHarnesses(tempDir)).not.toContain('.github/skills');
  });

  it('treats .github/copilot-instructions.md as real evidence of Copilot use', () => {
    fs.mkdirSync(path.join(tempDir, '.github'), { recursive: true });
    fs.writeFileSync(path.join(tempDir, '.github', 'copilot-instructions.md'), '# instructions\n');

    expect(isHarnessPresent(tempDir, github())).toBe(true);
    expect(detectHarnesses(tempDir)).toContain('.github/skills');
  });

  it('still reports present once neuron already onboarded the harness, even without the marker file', () => {
    fs.mkdirSync(path.join(tempDir, '.github', 'skills', 'neuron-memory'), { recursive: true });
    fs.writeFileSync(path.join(tempDir, '.github', 'skills', 'neuron-memory', 'SKILL.md'), '# skill\n');

    expect(isHarnessPresent(tempDir, github())).toBe(true);
  });

  it('leaves bare-base detection unchanged for harnesses with no narrower marker (e.g. claude)', () => {
    fs.mkdirSync(path.join(tempDir, '.claude'), { recursive: true });

    expect(isHarnessPresent(tempDir, claude())).toBe(true);
    expect(detectHarnesses(tempDir)).toContain('.claude/skills');
  });

  it('reports absent when nothing matches at all', () => {
    expect(isHarnessPresent(tempDir, github())).toBe(false);
    expect(isHarnessPresent(tempDir, claude())).toBe(false);
    expect(detectHarnesses(tempDir)).toEqual([]);
  });
});
