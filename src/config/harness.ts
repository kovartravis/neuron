import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import harnessesData from './harnesses.json' with { type: 'json' };

export interface AgentHarness {
  name: string;
  base: string;
  /**
   * A narrower, harness-specific marker to check instead of `base`'s bare
   * directory existence (ticket 31, neuron-2.4.0). Only `github` needs this:
   * `.github/` is created for reasons that have nothing to do with Copilot
   * (CI workflows, issue templates), so bare-directory detection there was a
   * false-positive trap. `.claude/`/`.codex/`/`.cursor/` have no comparable
   * unrelated-creator convention, so they keep the plain `base` check.
   */
  marker?: string;
  mdFile: string;
  skills: string;
}

export const HARNESSES: AgentHarness[] = harnessesData as AgentHarness[];

/**
 * True if `h`'s marker (or bare `base` dir, for harnesses with no narrower
 * marker) is present, OR if neuron already onboarded this harness in an
 * earlier run — checked via the harness-specific skill file `copySkill`
 * writes, so a project already wired for a harness keeps getting refreshed
 * even if its marker file was later removed.
 */
export function isHarnessPresent(projectDir: string, h: AgentHarness): boolean {
  if (fs.existsSync(path.join(projectDir, h.marker ?? h.base))) return true;
  return fs.existsSync(path.join(projectDir, h.skills, 'neuron-memory', 'SKILL.md'));
}

export function detectHarnesses(projectDir: string): string[] {
  return HARNESSES
    .filter(h => isHarnessPresent(projectDir, h))
    .map(h => h.skills);
}

export function copySkill(projectDir: string, skillsRelDir: string): string {
  const skillSrc = path.join(
    path.dirname(fileURLToPath(import.meta.url)),
    '../../.claude/skills/neuron-memory/SKILL.md'
  );
  const destDir = path.join(projectDir, skillsRelDir, 'neuron-memory');
  fs.mkdirSync(destDir, { recursive: true });
  const destPath = path.join(destDir, 'SKILL.md');
  fs.copyFileSync(skillSrc, destPath);
  return destPath;
}
