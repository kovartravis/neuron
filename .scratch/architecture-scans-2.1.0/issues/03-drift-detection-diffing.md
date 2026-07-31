Type: task
Status: unclaimed
Blocked by: 01, 02

# 03 — Architectural Drift Detection & Diffing (`2.1.0-rc3`)

## Goal

Detect structural changes, un-documented modules, or dependency shifts since the last scan.

## Requirements

1. Implement `neuron scan --diff` / `--check` to compare current AST topology against stored memory cards.
2. Output a structured diff report showing new, modified, or deleted modules and exports.
3. Emit warnings in `neuron status` or `neuron exec` when architectural drift is detected.
4. Add unit and integration tests for diffing logic in `src/scanner/diff.test.ts`.

## Deliverables

- [ ] `src/scanner/diff.ts`
- [ ] `src/scanner/diff.test.ts`
- [ ] `package.json` version bump to `2.1.0-rc3`
