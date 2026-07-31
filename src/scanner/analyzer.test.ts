import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import path from 'node:path';
import fs from 'node:fs';
import { scanProjectTopology } from './analyzer.js';

describe('Scanner Engine: scanProjectTopology', () => {
  const tempProjectDir = path.join(process.cwd(), 'src/__tests__/temp-scanner-test');

  beforeAll(() => {
    fs.mkdirSync(path.join(tempProjectDir, 'src'), { recursive: true });
    fs.writeFileSync(
      path.join(tempProjectDir, 'package.json'),
      JSON.stringify({
        name: 'sample-project',
        version: '1.0.0',
        dependencies: { express: '^4.18.0' },
        devDependencies: { typescript: '^5.0.0' }
      }, null, 2),
      'utf8'
    );
    fs.writeFileSync(
      path.join(tempProjectDir, 'src', 'index.ts'),
      `export class ServerApp {\n  start() {}\n}\nexport function main() {}\n`,
      'utf8'
    );
  });

  afterAll(() => {
    if (fs.existsSync(tempProjectDir)) {
      fs.rmSync(tempProjectDir, { recursive: true, force: true });
    }
  });

  it('scans project manifest, deep dependency graph, and directory topology', async () => {
    const result = await scanProjectTopology(tempProjectDir, { depth: 2 });

    expect(result.project).toBe('temp-scanner-test');
    expect(result.projectRoot).toBe(tempProjectDir);
    expect(result.manifest.dependencies).toContain('express');
    expect(result.manifest.techStack).toContain('typescript');
    expect(result.topology.some(t => t.path === 'src')).toBe(true);
    expect(result.symbols.some(s => s.name === 'ServerApp' && s.kind === 'class')).toBe(true);

    // Deep Scan assertions
    expect(result.dependencyGraph).toBeDefined();
    expect(result.architectureMarkdown).toContain('Subsystem Dependency Map');
  });
});

