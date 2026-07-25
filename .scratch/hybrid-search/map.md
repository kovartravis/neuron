## Destination

A complete implementation of true hybrid search using SQLite FTS5 external content tables, an OR-query sanitizer, Reciprocal Rank Fusion (RRF) rank aggregation ($k = 60$), and linear importance weighting.

## Notes

- Feature set: FTS5 schema v4 migration, triggers, cleanFtsQuery utility, RRF hybrid query engine, integration tests.
- ADR: `docs/adr/0001-hybrid-search-rrf.md`
- Glossary: `CONTEXT.md`

## Decisions so far

- [FTS5 Schema Migration & Triggers](.scratch/hybrid-search/issues/01-fts5-schema-migration-triggers.md)
- [FTS Query Sanitizer & Parser Utility](.scratch/hybrid-search/issues/02-fts-query-sanitizer-parser.md)
- [Hybrid Retrieval Engine & RRF Rank Fusion](.scratch/hybrid-search/issues/03-hybrid-retrieval-rrf-engine.md)
- [Hybrid Search Integration & E2E Test Suite](.scratch/hybrid-search/issues/04-hybrid-search-test-suite.md)

## Frontier

- [FTS5 Schema Migration & Triggers](.scratch/hybrid-search/issues/01-fts5-schema-migration-triggers.md)
- [FTS Query Sanitizer & Parser Utility](.scratch/hybrid-search/issues/02-fts-query-sanitizer-parser.md)
