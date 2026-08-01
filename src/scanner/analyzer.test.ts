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

  it('scans every language the parser supports, not just the JS/TS core', async () => {
    // Regression: the traversal filter was narrower than TreeSitterScanner's
    // grammar list, so .tsx/.jsx/.cpp/.cs/.swift/.rb/.php files were dropped
    // before ever reaching the parser — invisible to scan and drift alike.
    const polyDir = path.join(tempProjectDir, 'poly');
    fs.mkdirSync(polyDir, { recursive: true });

    const samples: Record<string, string> = {
      'widget.tsx': 'export class Widget {}\n',
      'legacy.jsx': 'export class Legacy {}\n',
      'engine.cpp': 'class CppEngine {\npublic:\n  void run() {}\n};\n',
      'engine.hpp': 'class CppHeader {};\n',
      'service.cs': 'public class CsharpService {}\n',
      'model.swift': 'class SwiftModel {}\n',
      'helper.rb': 'class RubyHelper\nend\n',
      'handler.php': '<?php\nclass PhpHandler {}\n',
    };
    for (const [name, content] of Object.entries(samples)) {
      fs.writeFileSync(path.join(polyDir, name), content, 'utf8');
    }

    const result = await scanProjectTopology(tempProjectDir, { depth: 3 });
    const scannedFiles = result.modules.flatMap(m => m.components.map(c => path.basename(c.file)));

    for (const name of Object.keys(samples)) {
      expect(scannedFiles).toContain(name);
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

  it('emits progress updates via onProgress callback', async () => {
    const progressEvents: Array<{ phase: string; percent: number }> = [];

    await scanProjectTopology(tempProjectDir, {
      depth: 2,
      onProgress: (p) => {
        progressEvents.push({ phase: p.phase, percent: p.percent });
      }
    });

    expect(progressEvents.length).toBeGreaterThan(0);
    expect(progressEvents[0].percent).toBeLessThanOrEqual(10);
    expect(progressEvents[progressEvents.length - 1].percent).toBe(100);
    expect(progressEvents.some(e => e.phase.includes('Analyzing files') || e.phase.includes('Scanning topology'))).toBe(true);
  });
});


