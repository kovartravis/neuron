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

export const MEMORY_STORE_BLOCK = `## Memory Store Protocol (@kovartravis/neuron)

CRITICAL: You MUST follow this 4-step memory loop on EVERY task. Failure to execute these steps is an unacceptable protocol violation.

1. FIRST ACTION (Mandatory Step 1):
   BEFORE viewing files, editing code, or taking any action, your VERY FIRST tool call MUST be to query the memory store for context:
   \`neuron learn query "<task topic or goal>"\`

2. COMMAND EXECUTION (Mandatory Step 2):
   NEVER run raw shell commands for builds, tests, or git operations directly. You MUST wrap them with \`neuron exec\`:
   \`neuron exec -- <command>\`

3. FAILURE-FIX RECORDING (Mandatory Step 3):
   Whenever a command, build, or test fails and you fix it, you MUST immediately record the resolution before moving on:
   \`neuron learn add "Fix for <error>: <verified root cause and fix>" --tags failure-fix,<topic> --importance 4\`

4. SESSION CONCLUSION (Mandatory Step 4):
   NEVER finish your turn or declare a task complete without logging the history entry:
   \`neuron history add "<summary of work completed>" --tags <topic> --task-id <ticket-id>\`
`;
