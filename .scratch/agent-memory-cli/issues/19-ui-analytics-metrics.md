# 19 — Web UI Analytics & Scope Promotion Dashboard

**What to build:** Build an interactive analytics dashboard in the Web UI that visualizes memory store statistics, learning importance distribution, scope breakdowns, query activity, and scope promotion/demotion history.

**Blocked by:** 17 — Web UI Dashboard & Local Server (`neuron ui`)

**Status:** todo

- [ ] Implement `GET /api/analytics` endpoint delivering aggregated database metrics (total learnings, total history logs, active scopes, vector index status).
- [ ] Render visual stat cards, importance distribution charts, and scope breakdown gauges (global vs project vs custom).
- [ ] Display rolling 30-day scope promotion and demotion activity logs.
- [ ] Show top queried tags and learning access frequency metrics.
