import path from 'node:path';
import fs from 'node:fs';
import { parseFlags, updateMarkdownFile, detectHarnesses, copySkill, MEMORY_STORE_BLOCK } from './utils.js';

export function handleInitCommand(args: string[]): void {
  const { options } = parseFlags(args.slice(1));
  const projectDir = process.cwd();

  let targetFile = options.file;
  if (!targetFile) {
    if (fs.existsSync(path.join(projectDir, 'CLAUDE.md'))) {
      targetFile = 'CLAUDE.md';
    } else if (fs.existsSync(path.join(projectDir, 'AGENTS.md'))) {
      targetFile = 'AGENTS.md';
    } else {
      targetFile = 'AGENTS.md';
    }
  }

  const filePath = path.join(projectDir, targetFile);
  updateMarkdownFile(filePath, 'Memory Store', MEMORY_STORE_BLOCK);

  // Detect harnesses and copy the bundled neuron-memory skill
  let detectedSkillsDirs = detectHarnesses(projectDir);
  if (detectedSkillsDirs.length === 0) {
    detectedSkillsDirs = ['.agents/skills'];
  }
  const skillsWritten = detectedSkillsDirs.map(dir => copySkill(projectDir, dir));

  console.log(JSON.stringify({
    status: 'initialized',
    file: targetFile,
    projectRoot: projectDir,
    skillsWritten
  }));
}
