/**
 * Converts a natural language query string into a safe SQLite FTS5 MATCH expression.
 *
 * ## Why stopwords are dropped
 *
 * The keyword leg is fused with the semantic leg by Reciprocal Rank Fusion,
 * which rewards a document's *rank position* in each list rather than how well
 * it actually matched. Because terms are joined with `OR`, a document matching a
 * single common word enters the FTS ranking at all — and if it is the only match,
 * it enters at rank 1 and collects the full RRF contribution.
 *
 * Observed: the query "what payment provider do we use" ranked a document about
 * a Rust auth daemon above the correct billing document, because `"do"`, `"we"`
 * and `"use"` were searchable terms. Noise words give noise a guaranteed seat.
 *
 * Dropping them means an all-stopword query produces an empty expression, which
 * the caller treats as "no keyword leg" and answers semantically — the correct
 * degradation, and far better than a MATCH that hits every row.
 */

/**
 * Standard English stopwords, plus the FTS5 operator words (`and`/`or`/`not`),
 * which are never useful as literal search terms and only survive today because
 * quoting neutralizes them.
 *
 * Deliberately excludes domain-meaningful short words like `git`, `db`, `ci`.
 */
const STOPWORDS = new Set([
  'a', 'about', 'above', 'after', 'again', 'against', 'all', 'am', 'an', 'and',
  'any', 'are', 'as', 'at', 'be', 'because', 'been', 'before', 'being', 'below',
  'between', 'both', 'but', 'by', 'can', 'did', 'do', 'does', 'doing', 'down',
  'during', 'each', 'few', 'for', 'from', 'further', 'had', 'has', 'have',
  'having', 'he', 'her', 'here', 'hers', 'herself', 'him', 'himself', 'his',
  'how', 'i', 'if', 'in', 'into', 'is', 'it', 'its', 'itself', 'just', 'me',
  'more', 'most', 'my', 'myself', 'no', 'nor', 'not', 'now', 'of', 'off', 'on',
  'once', 'only', 'or', 'other', 'ought', 'our', 'ours', 'ourselves', 'out',
  'over', 'own', 'same', 'she', 'should', 'so', 'some', 'such', 'than', 'that',
  'the', 'their', 'theirs', 'them', 'themselves', 'then', 'there', 'these',
  'they', 'this', 'those', 'through', 'to', 'too', 'under', 'until', 'up',
  'very', 'was', 'we', 'were', 'what', 'when', 'where', 'which', 'while', 'who',
  'whom', 'why', 'will', 'with', 'would', 'you', 'your', 'yours', 'yourself',
  'yourselves',
]);

/** Exposed so callers and tests can reason about what gets dropped. */
export function isStopword(token: string): boolean {
  return STOPWORDS.has(token.toLowerCase());
}

/**
 * Example: `"vitest config crash"` → `'"vitest"* OR "config"* OR "crash"*'`
 *
 * Returns an empty string when the query has no alphanumeric words, or when
 * every word is a stopword — both mean "no usable keyword leg".
 */
export function cleanFtsQuery(queryText: string): string {
  const words = queryText.match(/[a-zA-Z0-9]+/g);
  if (!words || words.length === 0) return '';

  const seen = new Set<string>();
  const terms: string[] = [];
  for (const word of words) {
    const lower = word.toLowerCase();
    if (isStopword(lower)) continue;
    // Repeats add nothing to an OR expression but do add query cost.
    if (seen.has(lower)) continue;
    seen.add(lower);
    terms.push(`"${word}"*`);
  }

  return terms.join(' OR ');
}
