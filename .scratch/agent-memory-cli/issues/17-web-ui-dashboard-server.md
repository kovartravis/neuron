# 17 — Web UI Dashboard & Local Server (`neuron ui`)

**What to build:** Add a `neuron ui` command that launches a local web server (serving a modern dark-mode dashboard) to inspect, browse, add, edit, and delete database records (`learnings` and `history`) directly in a user-friendly browser interface.

**Blocked by:** 01 — CLI Commands & Schema, 02 — Storage Model & Caching

**Status:** resolved

- [ ] Add `handleUiCommand` (`src/commands/ui.ts`) with configurable `--port` flag (defaulting to 3333).
- [ ] Implement lightweight Node.js HTTP server (`src/ui/server.ts`) serving REST API endpoints and static assets.
- [ ] Build responsive dark-mode frontend with glassmorphism layout, tab navigation, and live database search/filters.
- [ ] Support CRUD operations for `learnings` and `history` entries with tag chips and scope badges.
