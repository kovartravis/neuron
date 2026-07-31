# Neuron 2.0.0 Stable Release Checklist & Release Notes

## 🚀 Overview

`@kovartravis/neuron` version `2.0.0` marks the first official stable major release of the offline, local-first agentic memory store for AI coding assistants.

---

## ✨ Release Highlights & Capabilities

1. **Native `.neuron/*.md` File Storage Engine (`md-only`)**:
   - Stores memories in clean, git-friendly Category Markdown files (`.neuron/learning.md`, `.neuron/history.md`, `.neuron/decisions.md`).
   - Dynamic in-memory vector search powered by `TransformersEmbedder` with zero `.sqlite` disk overhead.

2. **Hybrid Search & Rank Aggregation (RRF)**:
   - Combines semantic vector similarity with SQLite FTS5 full-text keyword matching using Reciprocal Rank Fusion.

3. **Cross-Platform Resilience (`node:sqlite` Fallback)**:
   - Automatic fallback to Node.js native `node:sqlite` when native C++ bindings for `better-sqlite3` are absent (Android/Termux, minimal containers).

4. **Agent Harness Detection & Auto-Setup (`neuron init`)**:
   - Detects `.agents/`, `.claude/`, `.cursor/`, `.github/`, and `.codex/` harness paths and installs the `neuron-memory` skill.
   - Includes a user callout and direct GitHub repository link: [https://github.com/kovartravis/neuron](https://github.com/kovartravis/neuron).

5. **User Feedback Linker (`neuron feedback`)**:
   - Interactive CLI command to generate pre-filled GitHub Issue submission links (`https://github.com/kovartravis/neuron/issues/new`) with options for `--type` (`bug`, `feature`, `general`) and `--title`.

6. **Local Dark-Mode Web UI (`neuron ui`)**:
   - Interactive local dashboard UI for inspecting, searching, and managing memory categories visually.

---

## 📋 Release Checklist

- [x] All 130+ unit, integration, and E2E test suites passing green across engines.
- [x] Shebang line fixed and tested across Linux, macOS, and Termux (`termux-fix-shebang`).
- [x] Version updated in `package.json` from `2.0.0-rc5` to `2.0.0`.
- [x] Documentation updated across `README.md`, `CONTEXT.md`, and `AGENTS.md`.
- [x] GitHub star callout added to `neuron init`.
- [x] `neuron feedback` mechanism built and tested.
