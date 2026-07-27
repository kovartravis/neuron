# 0002: Dynamic Category Dashboard & Generic Memory REST Endpoints

We decided to update the Neuron local dashboard UI and backend HTTP server to dynamically support any number $N$ of user-defined memory categories defined in `neuron.yaml` and SQLite.

## Context
Originally, the local dashboard and backend server (`src/ui/server.ts` & `src/ui/html.ts`) hardcoded a 2-column view specifically for `learnings` and `history`. As `@kovartravis/neuron` evolved to support arbitrary user-defined memory categories (e.g. `decisions`, `snippets`, `architecture`), the hardcoded 2-column dashboard was unable to display or search entries in new categories.

## Decision
1. **Dynamic Backend API (`/api/status` & `/api/memories`)**:
   - `/api/status`: Dynamically computes category entry counts across SQLite and returns an array of category metadata: `{ categories: [{ name, count, description }] }`.
   - `/api/memories?category=<cat>&q=<query>&limit=<limit>`: Generic endpoint serving search and pagination across any category.
   - Backward Compatibility: Retain `/api/learnings` and `/api/history` endpoints as backward-compatible wrappers over `/api/memories`.

2. **Dynamic Category Tab Layout**:
   - Replace fixed 2-column grid with a dynamic category navigation bar (`All`, `learning`, `history`, `decisions`, ...).
   - Global Search: Provide a single top search bar that searches across all categories or filters by the currently active tab category.
   - Reusable Modal: Replace fixed modals with a dynamic modal capable of displaying full lists for any selected category.
