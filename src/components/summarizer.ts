import path from 'node:path';
import fs from 'node:fs';
import crypto from 'node:crypto';
import envPaths from 'env-paths';
import { fidelityFromComponents, formatFidelitySection } from '../scanner/fidelity.js';
import { getTextGenerator } from './generator.js';

export interface SummarizerOptions {
  forceFallback?: boolean;
  onProgress?: (progress: { phase: string; percent?: number }) => void;
}

export class SmolLM2Summarizer {
  private cache: Map<string, string> = new Map();
  private cacheFilePath: string;
  private generator: any = null;
  private isInitializing: boolean = false;

  constructor() {
    const appPaths = envPaths('neuron', { suffix: '' });
    const cacheDir = path.join(appPaths.data, 'cache');
    if (!fs.existsSync(cacheDir)) {
      fs.mkdirSync(cacheDir, { recursive: true });
    }
    this.cacheFilePath = path.join(cacheDir, 'scan_summaries.json');
    this.loadCache();
  }

  public sanitizeSummary(text: string): string {
    if (!text) return '';
    let clean = text;

    if (clean.includes('<|im_start|>assistant')) {
      clean = clean.split('<|im_start|>assistant').pop() || clean;
    }

    clean = clean
      .replace(/<\|im_start\|>(?:system|user|assistant)?/gi, '')
      .replace(/<\|im_end\|>/gi, '')
      .replace(/^\s*(?:system|user|assistant)\b\s*/gi, '')
      .replace(/Summarize the primary purpose of this code file in 1 concise sentence\.?/gi, '')
      .replace(/File:\s*[^\n]+\s*Code:\s*/gi, '')
      .trim();

    return clean;
  }

  /**
   * Delegates to the process-wide loader so a scan and write-side enrichment
   * running in the same process share one ~3.2s model load rather than paying
   * for it twice.
   */
  private async getGenerator(onProgress?: (progress: { phase: string; percent?: number }) => void) {
    if (this.generator) return this.generator;
    this.generator = await getTextGenerator(onProgress);
    return this.generator;
  }

  async preloadModel(onProgress?: (progress: { phase: string; percent?: number }) => void): Promise<void> {
    if (process.env.NODE_ENV === 'test') return;
    await this.getGenerator(onProgress);
  }

  private loadCache() {
    if (fs.existsSync(this.cacheFilePath)) {
      try {
        const raw = fs.readFileSync(this.cacheFilePath, 'utf8');
        const parsed = JSON.parse(raw);
        Object.entries(parsed).forEach(([k, v]) => {
          if (typeof v === 'string') {
            const cleaned = this.sanitizeSummary(v);
            if (
              cleaned &&
              cleaned.length > 5 &&
              !/^(?:system|user|assistant)\b/i.test(cleaned) &&
              !/[\u4e00-\u9fa5]/.test(cleaned)
            ) {
              this.cache.set(k, cleaned);
            }
          }
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
      const cached = this.cache.get(cacheKey)!;
      const sanitizedCached = this.sanitizeSummary(cached);
      if (sanitizedCached && sanitizedCached.length > 5 && !/^(?:system|user|assistant)\b/i.test(sanitizedCached)) {
        return sanitizedCached;
      }
    }

    if (!options.forceFallback && process.env.NODE_ENV !== 'test') {
      try {
        const generator = await this.getGenerator(options.onProgress);
        if (generator) {
          const prompt = `<|im_start|>system\nSummarize the primary purpose of this code file in 1 concise English sentence. Respond ONLY in English. Do not use Chinese characters.\n<|im_end|>\n<|im_start|>user\nFile: ${filePath}\nCode:\n${content.slice(0, 1000)}\n<|im_end|>\n<|im_start|>assistant\n`;
          const output = await generator(prompt, { max_new_tokens: 60, return_full_text: false });
          if (output && output[0] && output[0].generated_text) {
            const generatedText: string = output[0].generated_text;
            const assistantAnswer = this.sanitizeSummary(generatedText);
            if (
              assistantAnswer &&
              assistantAnswer.length > 10 &&
              !/[\u4e00-\u9fa5]/.test(assistantAnswer)
            ) {
              this.cache.set(cacheKey, assistantAnswer);
              this.saveCache();
              return assistantAnswer;
            }
          }
        }
      } catch (e) {}
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

    // Extract method names
    const methodNames: string[] = [];
    const methodMatches = content.matchAll(/(?:async\s+)?([A-Za-z0-9_]+)\s*\(([^)]*)\)/g);
    for (const m of methodMatches) {
      if (!['if', 'for', 'while', 'switch', 'catch', 'function', 'constructor'].includes(m[1])) {
        methodNames.push(`${m[1]}()`);
      }
    }
    const uniqueMethods = Array.from(new Set(methodNames)).slice(0, 4);
    const methodStr = uniqueMethods.length > 0 ? ` (Methods: ${uniqueMethods.join(', ')})` : '';

    if (classMatch) {
      return `Class ${classMatch[1]} in ${filename}${methodStr} manages module operations and interface contracts.`;
    }
    if (fnMatch) {
      return `Function ${fnMatch[1]} in ${filename}${methodStr} handles utility and command processing.`;
    }
    return `Source file ${filename}${methodStr} exports primary project types and helper functions.`;
  }


  async synthesizeArchitecture(scanData: {
    project: string;
    manifest: {
      name?: string;
      techStack: string[];
      dependencies?: string[];
      devDependencies?: string[];
    };
    modules: Array<{
      name: string;
      path: string;
      purpose: string;
      components: Array<{ file: string; purpose: string; exports: string[]; fidelity?: string }>;
    }>;
    dependencyGraph?: Record<string, string[]>;
  }, options?: { category?: string }): Promise<{ summary: string; markdown: string }> {
    const projectName = scanData.manifest.name || scanData.project;
    const techStackStr = scanData.manifest.techStack.join(', ') || 'TypeScript';
    const category = options?.category || 'architecture';

    const overviewSummary = `${projectName} is a ${techStackStr} software system structured into ${scanData.modules.length} primary architectural modules.`;

    // Merged runtime + dev dependency contract, recorded so `neuron scan --diff`
    // can detect dependency shifts against this card. Must round-trip exactly
    // through parseBaselineBlueprint(), so keep the format and ordering stable.
    const allDependencies = [
      ...(scanData.manifest.dependencies || []),
      ...(scanData.manifest.devDependencies || [])
    ].sort();

    let md = `---
category: ${category}
title: "Repository Architectural Blueprint: ${projectName}"
tags: [architecture, topology, scan, deep]
mtime: ${new Date().toISOString()}
---

# 🏛️ Repository Architectural Blueprint: ${projectName}

## 🚀 System Purpose & Tech Stack
${overviewSummary}

${formatFidelitySection(fidelityFromComponents(scanData.modules.flatMap(m => m.components)))}
## 🧾 Dependency Contract
${allDependencies.length > 0 ? allDependencies.map(d => `- \`${d}\``).join('\n') : '_No declared dependencies._'}

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
        // Record every component: the card is the drift baseline, so any
        // component omitted here reads as a permanently "added" export on
        // every subsequent `scan --diff` and never converges.
        mod.components.forEach(c => {
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


