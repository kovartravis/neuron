/**
 * Converts a natural language query string into a safe SQLite FTS5 MATCH expression.
 * Each alphanumeric word is quoted and suffixed with a wildcard, joined with OR.
 *
 * Example: "vitest config crash" → '"vitest"* OR "config"* OR "crash"*'
 * Returns an empty string if no alphanumeric words are found.
 */
export function cleanFtsQuery(queryText: string): string {
  const words = queryText.match(/[a-zA-Z0-9]+/g);
  if (!words || words.length === 0) return '';
  return words.map(w => `"${w}"*`).join(' OR ');
}
