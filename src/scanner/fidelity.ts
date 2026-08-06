/**
 * Parser fidelity: how a blueprint card's symbols were obtained, and whether
 * two cards can be meaningfully compared at all.
 *
 * A drift report is a comparison between two measurements. If the two were
 * taken with different instruments, their difference is not drift — it is an
 * artefact of the instrument change. Recording fidelity on the card is what
 * lets `neuron scan --diff` tell those apart instead of reporting hundreds of
 * phantom export changes the moment a user upgrades.
 */

/**
 * Bumped whenever symbol extraction changes shape, *including* changes to the
 * regex fallback.
 *
 * Generation 1 is the 2.1.0 line-oriented regex scanner. Generation 2 is the
 * 2.2.0 Tree-Sitter rewrite, which also dropped the bare-`name(args)` heuristic
 * from the regex fallback — so a 2.1.0 regex card and a 2.2.0 regex-degraded
 * file are incomparable too, not just regex against AST.
 */
export const SCANNER_GENERATION = 2;

/**
 * How a card records fidelity: the parser that produced most files, plus only
 * the files that deviate.
 *
 * Storing a default with exceptions rather than a label per component keeps the
 * card compact — it is vector-indexed, and repeating the same token on every
 * component line degrades its embedding. A bare "mixed" label would not work:
 * mixed-because-Go and mixed-because-Rust would compare equal while being
 * genuinely incomparable.
 */
export interface FidelityDescriptor {
  /** e.g. `ast/2`. Applies to every file not named in `exceptions`. */
  default: string;
  /** Files whose fidelity differs from the default, keyed by path. */
  exceptions: Record<string, string>;
}

/**
 * What a card with no fidelity section means.
 *
 * Absence positively identifies a pre-2.2.0 card rather than leaving fidelity
 * unknown: nothing before 2.2.0 could write the section, and everything before
 * 2.2.0 used the generation-1 regex scanner.
 */
export const LEGACY_FIDELITY: FidelityDescriptor = Object.freeze({
  default: 'regex/1',
  exceptions: {},
}) as FidelityDescriptor;

export const FIDELITY_HEADING = '## 🔬 Parser Fidelity';

/** Stamps a parser name with the generation that produced it. */
export function descriptorFor(parser: string): string {
  return `${parser}/${SCANNER_GENERATION}`;
}

/**
 * Derives a card's fidelity from the per-file fidelity the scan recorded.
 *
 * The dominant value becomes the default and everything else is an exception,
 * so a homogeneous scan — the common case — costs one line.
 */
export function fidelityFromComponents(
  components: Array<{ file: string; fidelity?: string }>
): FidelityDescriptor {
  const perFile = new Map<string, string>();
  const counts = new Map<string, number>();

  for (const component of components) {
    // A component with no recorded fidelity predates per-file labelling; treat
    // it as the current default rather than inventing a third state.
    const descriptor = descriptorFor(component.fidelity ?? 'ast');
    perFile.set(component.file, descriptor);
    counts.set(descriptor, (counts.get(descriptor) ?? 0) + 1);
  }

  let dominant = descriptorFor('ast');
  let best = -1;
  // Ties resolve by descriptor name so the card is stable across scans.
  for (const [descriptor, count] of [...counts].sort((a, b) => a[0].localeCompare(b[0]))) {
    if (count > best) {
      best = count;
      dominant = descriptor;
    }
  }

  const exceptions: Record<string, string> = {};
  for (const [file, descriptor] of perFile) {
    if (descriptor !== dominant) exceptions[file] = descriptor;
  }

  return { default: dominant, exceptions };
}

/**
 * Whether two cards were produced by the same instrument, and can therefore be
 * subtracted from one another.
 *
 * Comparison is all-or-nothing and includes the exception map, not just the
 * default: two scans that are both "mostly ast" but degraded on *different*
 * files disagree about those files' symbols, so their difference is an artefact
 * rather than drift.
 */
export function areComparable(a: FidelityDescriptor, b: FidelityDescriptor): boolean {
  if (a.default !== b.default) return false;

  const aFiles = Object.keys(a.exceptions).sort();
  const bFiles = Object.keys(b.exceptions).sort();
  if (aFiles.length !== bFiles.length) return false;

  return aFiles.every((file, i) => bFiles[i] === file && a.exceptions[file] === b.exceptions[file]);
}

/** Human-readable reason a file fell back, keyed by descriptor. */
function degradationNote(descriptor: string): string {
  return descriptor.startsWith('regex') ? ' (no grammar available)' : '';
}

/** Renders the card section that `parseFidelitySection` reads back. */
export function formatFidelitySection(fidelity: FidelityDescriptor): string {
  let md = `${FIDELITY_HEADING}\n`;
  md += `Default: \`${fidelity.default}\`\n`;

  const files = Object.keys(fidelity.exceptions).sort();
  if (files.length > 0) {
    md += `Degraded:\n`;
    for (const file of files) {
      const descriptor = fidelity.exceptions[file];
      md += `- \`${file}\` — \`${descriptor}\`${degradationNote(descriptor)}\n`;
    }
  }

  return md;
}

/**
 * Reads the fidelity section out of a card body.
 *
 * Returns null when the card has no section at all, so the caller can
 * distinguish "absent" from "present but empty" — only the former means legacy.
 */
export function parseFidelitySection(markdownContent: string): FidelityDescriptor | null {
  const lines = markdownContent.split('\n');
  let inSection = false;
  let found = false;
  let defaultFidelity = '';
  const exceptions: Record<string, string> = {};

  for (const line of lines) {
    if (line.startsWith('## ')) {
      inSection = line.trim() === FIDELITY_HEADING;
      if (inSection) found = true;
      continue;
    }
    if (!inSection) continue;

    const defaultMatch = line.match(/^Default:\s*`([^`]+)`/);
    if (defaultMatch) {
      defaultFidelity = defaultMatch[1].trim();
      continue;
    }

    // - `path/to/file.go` — `regex/2` (grammar unavailable)
    const exceptionMatch = line.match(/^-\s+`([^`]+)`\s*[—-]\s*`([^`]+)`/);
    if (exceptionMatch) {
      exceptions[exceptionMatch[1].trim()] = exceptionMatch[2].trim();
    }
  }

  if (!found) return null;
  return { default: defaultFidelity || LEGACY_FIDELITY.default, exceptions };
}
