import path from 'node:path';
import fs from 'node:fs';
import { parseFlags, drawBox } from './utils.js';
import { HARNESSES, detectHarnesses, copySkill } from '../config/index.js';

export const GITHUB_STAR_URL = 'https://github.com/kovartravis/neuron';

export function handleInitCommand(args: string[]): void {
  const { options } = parseFlags(args.slice(1));
  const projectDir = process.cwd();

  // Detect harnesses and copy the bundled neuron-memory skill
  let detectedSkillsDirs = detectHarnesses(projectDir);
  if (detectedSkillsDirs.length === 0) {
    detectedSkillsDirs = ['.agents/skills'];
  }
  const skillsWritten = detectedSkillsDirs.map(dir => copySkill(projectDir, dir));

  const callout = `⭐ Enjoying Neuron? Visit ${GITHUB_STAR_URL} and give it a star!`;
  console.error(drawBox([callout]));


  console.log(JSON.stringify({
    status: 'initialized',
    projectRoot: projectDir,
    skillsWritten,
    githubUrl: GITHUB_STAR_URL,
    callout
  }));
}

