## Destination

A complete technical specification (`.scratch/saas-features/spec.md`) detailing the updated schema (SQLite and PostgreSQL), the hybrid retrieval scoring algorithm, the history decay policy, and the scoped auto-promotion rules.

## Notes

- Feature set: Importance-based hybrid search, database adapter (PostgreSQL/Supabase support), team scopes (`people`, `project`, `global`), history decay, and auto-promotion.
- Skills: `/domain-modeling`, `/grilling`.

## Decisions so far

*(No decisions resolved yet)*

## Not yet specified

- **Multi-tenant isolation**: Access control rules and connection routing for multiple teams on a single database.
- **SaaS API / Auth integration**: How the CLI authenticates against a SaaS backend to retrieve Postgres credentials securely.
- **Web Dashboard**: Scopes and analytics view for team learnings.
