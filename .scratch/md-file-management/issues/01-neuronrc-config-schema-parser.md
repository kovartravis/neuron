# 01 — `.neuronrc` Configuration Schema & Parser

**Type:** spec / feature ticket  
**Status:** ready-for-agent  
**Blocked by:** None

## Description

Implement the `.neuronrc` configuration loader and schema parser for `neuron`.

## Requirements

- Define Zod schema for `.neuronrc` configuration covering `storage.mode` (`vector-only`, `md-only`, `dual`, `split`), `learn` routing rules, `history` targets, and `sync` options.
- Add project-level discovery logic walking up CWD to find `.neuronrc`.
- Provide default configuration fallback when `.neuronrc` is absent (defaulting to `storage.mode = "vector-only"` for backwards compatibility).
- Return typed configuration objects with normalized paths relative to project root.

## Verification Checklist

- [ ] Unit tests for parsing valid, partial, and malformed `.neuronrc` files.
- [ ] Fallback behavior test when no `.neuronrc` file exists.
- [ ] Path resolution test for nested relative markdown targets.
