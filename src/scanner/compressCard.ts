/**
 * Compresses a full architecture blueprint card down to a target character
 * budget for injection, without touching the stored card `neuron scan
 * --diff` reads (ticket 27, following 25/26).
 *
 * `parseBaselineBlueprint` (`diff.ts`) — the only consumer that needs the
 * card to be *complete* — parses exactly two things off each component
 * line: the file path and its `Exports:` list. The purpose/prose text after
 * the colon is never read by drift detection at all, so it's the first and
 * only thing this function drops; nothing here can desync `scan --diff`.
 *
 * Degrades in a fixed order, structurally rather than by truncating raw
 * text at an arbitrary byte offset (25's problem: whichever module happened
 * to be first in the document was the only one that ever survived):
 *   1. Header (purpose, dependency contract, subsystem map) — always kept
 *      whole; it's small and it's the highest-value, most-stable part.
 *   2. Per module, in order: heading + every file line with purpose text
 *      stripped (file + exports only).
 *   3. If a module's full file list still doesn't fit, as many file lines
 *      as fit for that module, then every module after it is omitted.
 *
 * A fixed budget is reserved for the omission note up front, before laying
 * out any module — never computed after the fact — so a cut is never
 * silent: either everything fits and no note is needed, or something was
 * cut and the note announcing that is guaranteed room to appear.
 */

interface ParsedModule {
  heading: string;
  fileLines: string[]; // already purpose-stripped: "- **`file`** (Exports: `a, b`)"
}

function parseForCompression(markdown: string): { header: string; modules: ParsedModule[] } {
  const lines = markdown.split('\n');
  const headerLines: string[] = [];
  const modules: ParsedModule[] = [];
  let current: ParsedModule | null = null;
  let inHeader = true;

  for (const line of lines) {
    const modMatch = line.match(/^###\s+🧩\s+.+\(`[^`]+`\)/);
    if (modMatch) {
      inHeader = false;
      current = { heading: line, fileLines: [] };
      modules.push(current);
      continue;
    }
    if (inHeader) {
      headerLines.push(line);
      continue;
    }
    if (!current) continue;

    const fileMatch = line.match(/^-\s+\*\*`([^`]+)`\*\*(?:\s+\(Exports:\s+`([^`]+)`\))?/);
    if (fileMatch) {
      const exportsStr = fileMatch[2] ? ` (Exports: \`${fileMatch[2]}\`)` : '';
      current.fileLines.push(`- **\`${fileMatch[1]}\`**${exportsStr}`);
    }
    // Module purpose sentences and the "**Key Components...**" label are
    // regenerated fresh below, not carried over — both are either
    // boilerplate or already implied by the heading.
  }

  return { header: headerLines.join('\n').replace(/\n{3,}/g, '\n\n').trimEnd(), modules };
}

// Sized for the worst case: both clauses present, large counts (e.g. "999
// file(s) ... and 999 more subsystem(s) entirely ...") is ~185 chars; kept
// well clear of that so the note is never itself the thing that gets cut.
const OMISSION_NOTE_RESERVE = 220;
const CUT_MARKER = '\n...[truncated]';

function buildFull(header: string, modules: ParsedModule[]): string {
  const label = '**Key Components & Export Contracts:**';
  const sections = modules.map(mod => [mod.heading, '', label, ...mod.fileLines].join('\n'));
  return [header, ...sections].join('\n\n');
}

export function compressArchitectureCard(markdown: string, cap: number): string {
  if (cap <= 0) return '';
  if (markdown.length <= cap) return markdown;

  const { header, modules } = parseForCompression(markdown);
  const label = '**Key Components & Export Contracts:**';

  // Everything fits once purpose text is stripped: no cut, no note needed.
  const full = buildFull(header, modules);
  if (full.length <= cap) return full;

  // Something will be cut — reserve room for the note that says so before
  // laying out anything, rather than trying to append it after the fact.
  const budget = Math.max(0, cap - OMISSION_NOTE_RESERVE);

  const headerChunk = header.length <= budget ? header : header.slice(0, Math.max(0, budget - CUT_MARKER.length)) + CUT_MARKER;
  if (header.length > budget) {
    // Header alone exhausts the budget (e.g. unstructured content with no
    // recognizable module headings) — nothing left for any module.
    const result = `${headerChunk}\n\n_(content omitted to fit the injection budget — see the full card in \`.neuron/\`.)_`;
    return result.length <= cap ? result : result.slice(0, cap);
  }

  const parts: string[] = [headerChunk];
  let used = headerChunk.length;
  let fullyOmittedModules = 0;
  let filesOmittedInLastModule = 0;
  let cut = false;

  for (let i = 0; i < modules.length; i++) {
    if (cut) {
      fullyOmittedModules += 1;
      continue;
    }

    const mod = modules[i];
    const fullBody = [mod.heading, '', label, ...mod.fileLines].join('\n');
    const joinCost = 2; // '\n\n' between sections

    if (used + joinCost + fullBody.length <= budget) {
      parts.push(fullBody);
      used += joinCost + fullBody.length;
      continue;
    }

    cut = true;

    // Try heading + as many file lines as fit before giving up on this module too.
    const headingBlock = [mod.heading, '', label].join('\n');
    if (used + joinCost + headingBlock.length > budget) {
      fullyOmittedModules += 1;
      continue;
    }

    const includedFiles: string[] = [];
    let runningLen = headingBlock.length;
    for (const fl of mod.fileLines) {
      const lineCost = fl.length + 1; // + newline
      if (used + joinCost + runningLen + lineCost > budget) break;
      includedFiles.push(fl);
      runningLen += lineCost;
    }
    parts.push([mod.heading, '', label, ...includedFiles].join('\n'));
    used += joinCost + runningLen;
    filesOmittedInLastModule = mod.fileLines.length - includedFiles.length;
  }

  if (cut) {
    const clauses: string[] = [];
    if (filesOmittedInLastModule > 0) clauses.push(`${filesOmittedInLastModule} file(s) in the last subsystem shown`);
    if (fullyOmittedModules > 0) clauses.push(`${fullyOmittedModules} more subsystem(s) entirely`);
    parts.push(
      `_(Omitted to fit the injection budget: ${clauses.join(' and ')} — see the full card in \`.neuron/\` for the complete blueprint.)_`
    );
  }

  const result = parts.join('\n\n');
  return result.length <= cap ? result : result.slice(0, cap);
}
