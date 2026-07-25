# 04 — Hybrid Search Integration & E2E Test Suite

**What to build:** A comprehensive test suite in `src/index.test.ts` and `src/cli.test.ts` validating exact keyword matching (e.g. code symbols, error tracebacks), semantic synonym matching, RRF ranking order, and scope-based hybrid query filtering.

**Blocked by:** 03 — Hybrid Retrieval Engine & RRF Rank Fusion

**Status:** ready-for-agent

- [ ] Unit and integration tests verify exact keyword matches (e.g. `onnxruntime-node`) surface at top rank.
- [ ] Integration tests verify semantic concept queries (e.g. `mac setup`) retrieve relevant records.
- [ ] Integration tests verify RRF scoring and Importance weighting operate deterministically.
- [ ] All existing test suites (`npm test`) pass cleanly.
