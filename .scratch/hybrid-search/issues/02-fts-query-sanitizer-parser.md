# 02 — FTS Query Sanitizer & Parser Utility

**What to build:** A dedicated query parsing utility function (`cleanFtsQuery`) that cleans punctuation, tokenizes search input, and constructs safe FTS `OR` expressions with wildcard prefixes (e.g. `"vitest"* OR "crash"*`) to guarantee valid SQLite FTS query syntax without throwing syntax errors.

**Blocked by:** None — can start immediately.

**Status:** resolved

- [ ] `cleanFtsQuery(queryText)` returns an escaped, OR-joined string with wildcard prefixes.
- [ ] Punctuation and invalid FTS operators are sanitized to prevent SQLite MATCH syntax errors.
- [ ] Returns an empty string gracefully if the query text contains no alphanumeric words.
