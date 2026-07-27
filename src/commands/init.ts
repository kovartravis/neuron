import path from 'node:path';
import fs from 'node:fs';
import { parseFlags } from './utils.js';
import { HARNESSES, detectHarnesses, copySkill } from '../config/index.js';

export function handleInitCommand(args: string[]): void {
  const { options } = parseFlags(args.slice(1));
  const projectDir = process.cwd();

  // Detect harnesses and copy the bundled neuron-memory skill
  let detectedSkillsDirs = detectHarnesses(projectDir);
  if (detectedSkillsDirs.length === 0) {
    detectedSkillsDirs = ['.agents/skills'];
  }
  const skillsWritten = detectedSkillsDirs.map(dir => copySkill(projectDir, dir));

  console.log(JSON.stringify({
    status: 'initialized',
    projectRoot: projectDir,
    skillsWritten
  }));
}
