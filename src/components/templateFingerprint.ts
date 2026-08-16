/**
 * Ticket 6 (neuron-2.4.2) / Ticket 10's answer: a closed set of known,
 * deterministic content templates this repo's own write paths generate,
 * stripped from a candidate pair before it reaches the near-duplicate
 * reranker gate — so shared scaffolding stops contributing to the score at
 * all, regardless of bar. Not category-scoped (the map's own non-goals rule
 * out category-name branching): each pattern matches on the literal
 * boilerplate text itself, wherever it appears, and leaves everything else
 * untouched. A new template shape needs a new pattern here, the same
 * tradeoff as any other closed enum (mirrors `commitRef`'s field-type floor,
 * Ticket 5).
 */
const KNOWN_TEMPLATES: RegExp[] = [
  // `synthesizeArchitecture`'s per-module card heading + the analyzer's
  // fixed fallback purpose sentence (src/scanner/analyzer.ts) — identical
  // across every module but the interpolated name/path, which is exactly
  // what drove Ticket 7's 17 `architecture` false positives.
  /###\s+🧩\s+.+?\s+\(`[^`]+`\)\n+Primary\s+\S+\s+module containing core application capabilities\./g,

  // The wayfinder skill's recurring session-pickup opener, e.g.
  // "Wayfinder pickup on Map — neuron 2.4.2: ...", "Wayfinder pickup
  // session on the neuron-2.4.0 map: ...", or the commit-message-derived
  // "wayfinder(neuron-2.4.0): ..." — drove ~106 of Ticket 7's 214 `history`
  // false positives (same narrative shell, different ticket described).
  /^wayfinder\([^)]*\):\s*|^Wayfinder pickup(?:\s+session)?\s+on\s+.+?:\s*/i,
];

/**
 * Strips every known template match from `content`, leaving the
 * substantive text that actually varies between entries. Never called on
 * stored content or on the embeddings used to widen the candidate pool
 * (Ticket 10 scoped this to "before it reaches the reranker" only) — only
 * on the text handed to the reranker for scoring.
 */
export function stripKnownTemplates(content: string): string {
  let stripped = content;
  for (const pattern of KNOWN_TEMPLATES) {
    stripped = stripped.replace(pattern, '');
  }
  return stripped.trim();
}
