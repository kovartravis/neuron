# Contributing to neuron

Thanks for looking. neuron is small enough that one person can hold the whole
thing in their head, and the project would like to keep it that way — so the
bar for a contribution is "does this make the tool better for someone using a
coding agent every day," not "is this a lot of code."

Good first contributions, roughly in order of how much they help:

1. **A bug report with a reproduction.** `neuron feedback --type bug "..."`
   opens a pre-filled issue form. The reproduction is what makes it
   fixable.
2. **A harness or editor you use that neuron doesn't fit yet**, with what
   hook points it exposes. The adapter model (`src/harnesses/`, ADR 0014)
   is designed so a new harness is one file plus tests.
3. **A doc page that was wrong or missing** when you tried to do something.
4. **Code.** See below.

## Setup

```bash
git clone https://github.com/kovartravis/neuron.git
cd neuron
npm ci
npm test          # builds with tsc, then runs the vitest suite (~2 min cold, faster warm)
```

Requirements: Node.js >= 22.13. The first test run downloads a few small ONNX
models (embedder, reranker, NLI classifier) into a per-user cache; later runs
are offline.

Useful loops:

```bash
npm run build && node dist/cli.js --help          # run your local build
npx vitest run src/commands/memory.test.ts        # one file
npm run test:watch                                # watch mode
npm run test:e2e                                  # slow: real ONNX + summarizer pipeline
cd site && npm ci && npm run dev                  # docs site + homepage at localhost:4321/neuron/
```

## Repository map

| Path | What lives there |
|---|---|
| `src/cli.ts`, `src/commands/` | CLI entry and one module per subcommand |
| `src/index.ts` | `NeuronMemory` — the store; every write goes through `transact()` |
| `src/storage/` | markdown adapter, SQLite index, and the router that keeps them reconciled |
| `src/harnesses/` | per-harness adapters (Claude Code, Codex CLI, Copilot CLI, Cursor) |
| `src/scanner/` | Tree-Sitter architecture scan and drift detection |
| `src/components/` | embedder, reranker, NLI classifier, summarizer, enrichment |
| `src/config/` | `neuron.yaml` schema, protocol-block generator, scaffolding |
| `docs/adr/` | architecture decision records — read the relevant one before changing a boundary |
| `docs/COMMANDS.md` | the canonical CLI / config reference; the site's reference pages mirror it |
| `site/` | Astro + Starlight docs site and homepage |
| `benchmarks/` | re-runnable A/B harnesses behind every number in the README |
| `.neuron/` | this repo's own memory store — it dogfoods itself |

`CONTEXT.md` is the glossary. If a term in a PR discussion isn't in it, it
probably should be.

## Making a change

- **Tests live next to the code** (`foo.ts` / `foo.test.ts`). A behavior
  change comes with a test that would have failed before it.
- **Every write path goes through `NeuronMemory.transact()`.** Schema
  enforcement, enrichment, supersession and category auto-declaration all
  hang off that one seam — don't add a second one.
- **Storage stays markdown-first** (ADR 0011). SQLite is a rebuildable index;
  anything that makes the `.md` files no longer the record needs an ADR, not
  just a PR.
- **New CLI flags are documented twice**: `docs/COMMANDS.md` and the matching
  page under `site/src/content/docs/docs/`. `neuron memory --help` derives
  declared-field flags from `neuron.yaml` automatically; don't hard-code a
  project's schema into the CLI.
- **Changing module boundaries or public exports?** Run `node dist/cli.js scan`
  and commit the refreshed `.neuron/architecture.md` — CI fails on a stale
  card (`scan --check`).
- **Don't hand-edit `.neuron/*.md` in a PR** unless the change is the point of
  the PR. `git diff --stat .neuron/` before committing; a large unexplained
  deletion there is a bug, not a cleanup.

### Commit messages

Prefix with the area: `feat:`, `fix:`, `docs:`, `chore:`, `site:`, `test:`,
`bench:`. Releases use `release: vX.Y.Z — <summary>`. The body should say
why, not restate the diff.

## Pull requests

CI runs `npm test`, the architecture drift check, the config/protocol
compliance check, and a docs-site build on every PR. The PR template's
checklist is the review checklist — filling it in honestly is more useful than
filling it in completely.

Keep PRs to one logical change. A refactor and a behavior change are two PRs.

## Working with an agent

This repo is set up for it: `neuron init` has already wired recall hooks for
Claude Code, Codex CLI, Cursor and Copilot CLI, and `CLAUDE.md` carries the
memory protocol the agent follows. If you're pairing with an agent on a fix,
let it record the fix (`neuron memory add --category learning ...`) — that
entry is part of the contribution, and it's what stops the next session from
re-debugging the same thing.

## Releasing

Maintainers only — see [`docs/RELEASING.md`](docs/RELEASING.md).

## Code of conduct

Be kind, assume good faith, and keep discussion about the work. Anything that
needs a maintainer's attention outside a public thread can go to
[@kovartravis](https://github.com/kovartravis) directly.

## License

By contributing you agree your work is licensed under the [MIT License](LICENSE).
