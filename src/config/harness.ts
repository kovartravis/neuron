import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import harnessesData from './harnesses.json' with { type: 'json' };

export interface AgentHarness {
  name: string;
  base: string;
  mdFile: string;
  skills: string;
}

export const HARNESSES: AgentHarness[] = harnessesData as AgentHarness[];

export function detectHarnesses(projectDir: string): string[] {
  return HARNESSES
    .filter(h => fs.existsSync(path.join(projectDir, h.base)))
    .map(h => h.skills);
}

export function copySkill(projectDir: string, skillsRelDir: string): string {
  const skillSrc = path.join(
    path.dirname(fileURLToPath(import.meta.url)),
    '../../.agents/skills/neuron-memory/SKILL.md'
  );
  const destDir = path.join(projectDir, skillsRelDir, 'neuron-memory');
  fs.mkdirSync(destDir, { recursive: true });
  const destPath = path.join(destDir, 'SKILL.md');
  fs.copyFileSync(skillSrc, destPath);
  return destPath;
}
