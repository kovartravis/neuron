# 05 — CLI Config & Sync Subcommands & E2E Test Suite

**Type:** feature ticket  
**Status:** ready-for-agent  
**Blocked by:** 04-markdown-vector-sync-engine.md

## Description

Expose `.neuronrc` configuration management and sync operations via CLI subcommands, and provide full E2E test coverage.

## Requirements

- Add `neuron config` command to output active resolved `.neuronrc` configuration and validate syntax.
- Add `neuron sync` command to manually trigger bidirectional sync between `.md` files and vector DB.
- Update `neuron status` to display active storage mode and tracked `.md` files.
- End-to-end integration test suite exercising CLI commands with real `.neuronrc` configurations.

## Verification Checklist

- [ ] `neuron config` CLI output matches active config.
- [ ] `neuron sync` triggers full vector resync from `.md` files.
- [ ] `neuron status` correctly reports `.neuronrc` state.
- [ ] Full E2E CLI test suite passing in Vitest.
