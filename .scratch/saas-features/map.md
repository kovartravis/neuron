## Destination

A complete technical specification (`.scratch/saas-features/spec.md`) detailing the updated schema (SQLite and PostgreSQL), the hybrid retrieval scoring algorithm, the history decay policy, and the scoped auto-promotion rules.

## Notes

- Feature set: Importance-based hybrid search, database adapter (PostgreSQL/Supabase support), team scopes (`people`, `project`, `global`), history decay, and auto-promotion.
- Skills: `/domain-modeling`, `/grilling`.

## Decisions so far

- [Database Schema & Adapter Specification](.scratch/saas-features/issues/01-db-schema-postgres.md) — Unified SQLite/Postgres schema supporting importance ranking (1-5), dynamic user/project/global scopes, query semantic logging, and DatabaseAdapter interface.
- [Hybrid Search Scoring Formula](.scratch/saas-features/issues/02-hybrid-retrieval.md) — Linear Interpolation formula with 75% weight on semantic similarity and 25% weight on normalized 1-5 importance rating.
- [History Decay & Compaction Specification](.scratch/saas-features/issues/03-history-decay-compaction.md) — 30-day default expiration for low-importance history (importance <= 2), indefinite preservation of high importance entries, and cursor-based consolidation via last_consolidated_rowid watermark.
- [Scoped Auto-Promotion & Demotion Specification](.scratch/saas-features/issues/04-scoped-auto-promotion.md) — Rolling 30-day query frequency tracking (cosine similarity >= 0.80) triggering promotion/demotion between people, project, and global scopes, with manual scope locking protection.



## Not yet specified

- **Multi-tenant isolation**: Access control rules and connection routing for multiple teams on a single database.
- **SaaS API / Auth integration**: How the CLI authenticates against a SaaS backend to retrieve Postgres credentials securely.
- **Web Dashboard**: Scopes and analytics view for team learnings.
