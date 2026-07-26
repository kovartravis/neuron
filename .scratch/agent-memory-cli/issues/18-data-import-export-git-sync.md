# 18 — Memory Import/Export & Git Sync (Push & Pull)

**What to build:** Add data export/import capabilities (JSON and Markdown) and integrated Git synchronization (Push & Pull) to both the `neuron` CLI and the Web UI.

**Blocked by:** 17 — Web UI Dashboard & Local Server (`neuron ui`)

**Status:** todo

- [ ] Implement `neuron export` / `GET /api/export` to export database entries to portable JSON or Markdown bundles.
- [ ] Implement `neuron import` / `POST /api/import` to ingest external JSON memory packages.
- [ ] Add Git Sync endpoints (`POST /api/git/push` and `POST /api/git/pull`) to allow users to push and pull memory updates to remote Git repositories from the Web UI.
- [ ] Provide live terminal feedback output in the Web UI during Git sync operations.
