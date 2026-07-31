import path from 'node:path';
import fs from 'node:fs';
import crypto from 'node:crypto';
import { createRequire } from 'node:module';
import envPaths from 'env-paths';

const require = createRequire(import.meta.url);

function applyCrossPlatformShims() {
  if (process.platform === 'android') {
    try {
      const ort = require('onnxruntime-web');
      if (ort && ort.env && ort.env.wasm) {
        ort.env.wasm.numThreads = 1;
        const distDir = path.dirname(require.resolve('onnxruntime-web'));
        ort.env.wasm.wasmPaths = distDir + '/';
      }
      const resolvedOrt = require.resolve('onnxruntime-node');
      (require.cache as any)[resolvedOrt] = { id: resolvedOrt, filename: resolvedOrt, loaded: true, exports: ort };
    } catch (e) {}

    try {
      const resolvedSharp = require.resolve('sharp');
      (require.cache as any)[resolvedSharp] = { id: resolvedSharp, filename: resolvedSharp, loaded: true, exports: {} };
    } catch (e) {}
  }
}

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

  private async getGenerator(onProgress?: (progress: { phase: string; percent?: number }) => void) {
    if (this.generator) return this.generator;
    if (this.isInitializing) {
      while (this.isInitializing) {
        await new Promise(r => setTimeout(r, 100));
      }
      return this.generator;
    }
    this.isInitializing = true;
    try {
      applyCrossPlatformShims();
      const { pipeline, env } = await import('@huggingface/transformers');
      const appPaths = envPaths('neuron', { suffix: '' });
      env.cacheDir = path.join(appPaths.data, 'models');
      env.useFSCache = true;

      onProgress?.({ phase: 'Loading ONNX summarizer model (Qwen1.5-0.5B)' });

      this.generator = await pipeline('text-generation', 'Xenova/Qwen1.5-0.5B-Chat', {
        dtype: 'q4',
        progress_callback: (info: any) => {
          if (info.status === 'progress' && info.total) {
            const pct = Math.round((info.loaded / info.total) * 100);
            const fileLabel = info.file ? ` (${info.file})` : '';
            onProgress?.({ phase: `Loading ONNX model${fileLabel} ${pct}%` });
          } else if (info.status === 'downloading' || info.status === 'initiate') {
            const fileLabel = info.file ? ` (${info.file})` : '';
            onProgress?.({ phase: `Downloading ONNX model${fileLabel}` });
          } else if (info.status === 'ready' || info.status === 'done') {
            onProgress?.({ phase: `ONNX model loaded` });
          }
        }
      });
    } catch (e) {
      this.generator = null;
    } finally {
      this.isInitializing = false;
    }
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
            if (cleaned && cleaned.length > 5 && !/^(?:system|user|assistant)\b/i.test(cleaned)) {
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
          const prompt = `<|im_start|>system\nSummarize the primary purpose of this code file in 1 concise sentence.\n<|im_end|>\n<|im_start|>user\nFile: ${filePath}\nCode:\n${content.slice(0, 1000)}\n<|im_end|>\n<|im_start|>assistant\n`;
          const output = await generator(prompt, { max_new_tokens: 60, return_full_text: false });
          if (output && output[0] && output[0].generated_text) {
            const generatedText: string = output[0].generated_text;
            const assistantAnswer = this.sanitizeSummary(generatedText);
            if (assistantAnswer && assistantAnswer.length > 10) {
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


