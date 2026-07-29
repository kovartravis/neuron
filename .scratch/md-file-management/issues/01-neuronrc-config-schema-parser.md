# 01 — `neuron.yaml` Configuration Schema & Parser

**Type:** spec / feature ticket  
**Status:** resolved  
**Blocked by:** None

## Description

Implement the `neuron.yaml` configuration loader and Zod schema parser for `neuron`.

## Requirements

- Define Zod schema for `neuron.yaml` configuration covering `storage.mode` (`vector-only`, `md-only`, `dual`, `split`), `storage.path`, `categories`, and `pullRules`.
- Add project-level discovery logic walking up CWD to find `neuron.yaml` or `neuron.yml`.
- Provide default configuration fallback when absent (defaulting to `storage.mode = "vector-only"` and `storage.path = ".neuron"` for 100% backwards compatibility).
- Return typed configuration objects with normalized paths relative to project root.

## Verification Checklist

- [x] Unit tests for parsing valid, partial, and malformed `neuron.yaml` files (`src/config/neuronYaml.test.ts`).
- [x] Fallback behavior test when no `neuron.yaml` file exists.
- [x] Path resolution test for nested relative markdown targets.
