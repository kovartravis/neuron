# Changelog

All notable changes to `@kovartravis/neuron` will be documented in this file.

## [2.0.0] - 2026-07-31

### Added
- **Stable 2.0.0 Major Release**: Official release of offline agent memory store CLI and SDK.
- **GitHub Star Callout**: Added GitHub repository callout banner and `githubUrl` property to `neuron init`.
- **User Feedback Command**: Added `neuron feedback [message]` command with `--type` and `--title` flags to generate pre-filled GitHub issue creation URLs.
- **Native Markdown Storage Engine (`md-only`)**: In-memory vector embedding search over `.neuron/*.md` files with timestamp cache invalidation and zero `.sqlite` disk footprint.
- **Hybrid Search & Rank Aggregation**: Reciprocal Rank Fusion (RRF) combining vector embeddings and SQLite FTS5 keyword indexing.
- **Cross-Platform `node:sqlite` Fallback**: Automatic fallback when native `better-sqlite3` bindings are unavailable.
- **Local Dashboard UI (`neuron ui`)**: Dark-mode web interface for real-time memory management.
- **Bi-Directional Markdown Sync (`neuron sync`)**: Direct synchronization between Markdown memory files and SQLite vector DB.
