## What this changes

<!-- One or two sentences. Link the issue or tracker entry it resolves, if any. -->

## Why

<!-- The problem or motivation, in terms a user of neuron would recognize. -->

## How to verify

<!-- Commands a reviewer can run. `npm test` is assumed; list anything beyond it. -->

## Checklist

- [ ] `npm test` passes locally
- [ ] Behavior changes are covered by a test
- [ ] User-facing changes are reflected in `docs/COMMANDS.md` and the matching page under `site/src/content/docs/docs/`
- [ ] `CHANGELOG.md` has an entry under the next version (skip for pure refactors)
- [ ] If module boundaries or public exports changed: `neuron scan` re-run and `.neuron/architecture.md` diff reviewed
