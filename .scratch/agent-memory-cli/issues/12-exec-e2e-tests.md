# 12 — End-to-End Test Suite for `exec` & Memory Feedback

**What to build:** End-to-end and unit test coverage in `src/cli.test.ts` asserting `neuron exec` functionality, output stream isolation (`stderr` for learnings vs `stdout` for command output), relevance threshold filtering, child exit code pass-through, and closed-loop feedback capture.

**Blocked by:** 09 — `neuron exec` CLI Core & Stderr Banner, 11 — Skill & Harness Closed-Loop Feedback Integration

**Status:** resolved

- [x] Test `neuron exec` outputs matching learnings to `stderr` and preserves clean `stdout`.
- [x] Test `neuron exec` filters out low-relevance learnings (`score < 0.35`).
- [x] Test child exit code pass-through (non-zero exit code on failure).
- [x] Test end-to-end failure fix recording workflow.
