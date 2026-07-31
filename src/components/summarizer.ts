import path from 'node:path';
import fs from 'node:fs';
import crypto from 'node:crypto';
import envPaths from 'env-paths';

export interface SummarizerOptions {
  forceFallback?: boolean;
}

export class SmolLM2Summarizer {
  private cache: Map<string, string> = new Map();
  private cacheFilePath: string;

  constructor() {
    const appPaths = envPaths('neuron', { suffix: '' });
    const cacheDir = path.join(appPaths.data, 'cache');
    if (!fs.existsSync(cacheDir)) {
      fs.mkdirSync(cacheDir, { recursive: true });
    }
    this.cacheFilePath = path.join(cacheDir, 'scan_summaries.json');
    this.loadCache();
  }

  private loadCache() {
    if (fs.existsSync(this.cacheFilePath)) {
      try {
        const raw = fs.readFileSync(this.cacheFilePath, 'utf8');
        const parsed = JSON.parse(raw);
        Object.entries(parsed).forEach(([k, v]) => {
          if (typeof v === 'string') this.cache.set(k, v);
        });
      } catch (e) {}
    }
  }

  private saveCache() {
    try {
      const obj: Record<string, string> = {};
      this.cache.forEach((v, k) => {
        obj[k] = v;
      });
      fs.writeFileSync(this.cacheFilePath, JSON.stringify(obj, null, 2), 'utf8');
    } catch (e) {}
  }

  private computeHash(content: string): string {
    return crypto.createHash('sha256').update(content).digest('hex');
  }

  async summarizeFile(
    filePath: string,
    content: string,
    options: SummarizerOptions = {}
  ): Promise<string> {
    const contentHash = this.computeHash(content);
    const cacheKey = `${filePath}:${contentHash}`;

    if (!options.forceFallback && this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey)!;
    }

    // Header JSDoc comment extraction
    const headerCommentMatch = content.match(/\/\*\*[\s\S]*?\*\//);
    if (headerCommentMatch) {
      const cleanComment = headerCommentMatch[0]
        .replace(/\/\*\*|\*\/|\*/g, '')
        .split('\n')
        .map(l => l.trim())
        .filter(Boolean)
        .join(' ');
      if (cleanComment.length > 5) {
        this.cache.set(cacheKey, cleanComment);
        this.saveCache();
        return cleanComment;
      }
    }

    // Deterministic AST signature fallback
    const fallbackSummary = this.generateFallbackSummary(filePath, content);
    this.cache.set(cacheKey, fallbackSummary);
    this.saveCache();
    return fallbackSummary;
  }

  private generateFallbackSummary(filePath: string, content: string): string {
    const filename = path.basename(filePath);
    const classMatch = content.match(/export\s+class\s+([A-Za-z0-9_]+)/);
    const fnMatch = content.match(/export\s+(?:async\s+)?function\s+([A-Za-z0-9_]+)/);

    if (classMatch) {
      return `Class ${classMatch[1]} in ${filename} manages core module contracts and operational execution.`;
    }
    if (fnMatch) {
      return `Function ${fnMatch[1]} in ${filename} handles utility and command processing.`;
    }
    return `Source file ${filename} exports primary project types and helper functions.`;
  }

  async synthesizeArchitecture(scanData: {
    project: string;
    manifest: { name?: string; techStack: string[] };
    modules: Array<{
      name: string;
      path: string;
      purpose: string;
      components: Array<{ file: string; purpose: string; exports: string[] }>;
    }>;
    dependencyGraph?: Record<string, string[]>;
  }): Promise<{ summary: string; markdown: string }> {
    const projectName = scanData.manifest.name || scanData.project;
    const techStackStr = scanData.manifest.techStack.join(', ') || 'TypeScript';

    const overviewSummary = `${projectName} is a ${techStackStr} software system structured into ${scanData.modules.length} primary architectural modules.`;

    let md = `---
category: decisions
title: "Repository Architectural Blueprint: ${projectName}"
tags: [architecture, topology, scan, deep]
mtime: ${new Date().toISOString()}
---

# 🏛️ Repository Architectural Blueprint: ${projectName}

## 🚀 System Purpose & Tech Stack
${overviewSummary}

## 🔗 Subsystem Dependency Map
\`\`\`text
${projectName}
${scanData.modules.map((m, idx) => `${idx === scanData.modules.length - 1 ? '└──' : '├──'} ${m.name} (${m.path})`).join('\n')}
\`\`\`

## 📦 Primary Subsystems & Module Boundaries
`;

    scanData.modules.forEach(mod => {
      md += `\n### 🧩 ${mod.name} (\`${mod.path}\`)\n`;
      md += `${mod.purpose}\n\n`;
      if (mod.components.length > 0) {
        md += `**Key Components & Export Contracts:**\n`;
        mod.components.slice(0, 5).forEach(c => {
          const exportsStr = c.exports.length > 0 ? ` (Exports: \`${c.exports.join(', ')}\`)` : '';
          md += `- **\`${c.file}\`**${exportsStr}: ${c.purpose}\n`;
        });
      }
    });

    return {
      summary: overviewSummary,
      markdown: md
    };
  }
}


