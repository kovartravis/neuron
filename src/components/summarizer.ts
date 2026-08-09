import { fidelityFromComponents, formatFidelitySection } from '../scanner/fidelity.js';
import { getTextGenerator } from './generator.js';

export class SmolLM2Summarizer {
  private generator: any = null;

  /**
   * Delegates to the process-wide loader so write-side enrichment (which
   * calls `getTextGenerator()` directly, `enricher.ts`) and anything else
   * warming the model in the same process share one load rather than paying
   * for it twice. Kept on this class only because `neuron init` already
   * calls `preloadModel()` here to warm enrichment's model ahead of time
   * (ticket 26 removed this class's own use of it \u2014 per-file architecture
   * summaries are deterministic now, not model-generated).
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

  /**
   * Per-file purpose text for the architecture card. Deterministic only
   * (ticket 26): a local 0.5B model previously generated this via a prompt
   * per file, which was both the card's dominant cost (~50,000 of a real
   * ~53,000-character card) and its main quality problem \u2014 real examples
   * from this repo's own store included garbled and non-English output.
   * Falls back through JSDoc-comment extraction, then an AST-signature
   * description; no model call, no cache (both existed only to amortize the
   * removed model call \u2014 a deterministic string computation doesn't need
   * either).
   */
  summarizeFile(filePath: string, content: string): string {
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
        return cleanComment;
      }
    }

    // Deterministic AST signature fallback
    return this.generateFallbackSummary(content);
  }

  /**
   * Terse by design: the caller (`synthesizeArchitecture`) already renders
   * the filename as the entry's bold header and the export list separately
   * (`Exports: ...`), so repeating either here is pure redundancy — this
   * only adds what isn't already shown, the method signatures.
   */
  private generateFallbackSummary(content: string): string {
    const classMatch = content.match(/export\s+class\s+([A-Za-z0-9_]+)/);
    const fnMatch = content.match(/export\s+(?:async\s+)?function\s+([A-Za-z0-9_]+)/);

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
      return `Class ${classMatch[1]}${methodStr}.`;
    }
    if (fnMatch) {
      return `Function ${fnMatch[1]}${methodStr}.`;
    }
    return uniqueMethods.length > 0 ? `Methods: ${uniqueMethods.join(', ')}.` : 'No exported symbols detected.';
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
  }): Promise<{ summary: string; markdown: string }> {
    const projectName = scanData.manifest.name || scanData.project;
    const techStackStr = scanData.manifest.techStack.join(', ') || 'TypeScript';

    const overviewSummary = `${projectName} is a ${techStackStr} software system structured into ${scanData.modules.length} primary architectural modules.`;

    // Merged runtime + dev dependency contract, recorded so `neuron scan --diff`
    // can detect dependency shifts against this card. Must round-trip exactly
    // through parseBaselineBlueprint(), so keep the format and ordering stable.
    const allDependencies = [
      ...(scanData.manifest.dependencies || []),
      ...(scanData.manifest.devDependencies || [])
    ].sort();

    let md = `# 🏛️ Repository Architectural Blueprint: ${projectName}

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


