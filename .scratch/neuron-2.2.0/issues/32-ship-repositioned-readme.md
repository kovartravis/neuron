Type: task
Status: unclaimed
Blocked by: 29, 31, 35, 36, 37, 38
Band: 2.2.0-rc5

# 32 — Ship the Repositioned README

## Question

Replace `README.md` with the markdown-first draft, with every claim in it either
true or removed.

## Context

The draft was supplied by the maintainer on 2026-08-02 and is the source of truth
for messaging. It is reproduced at `.scratch/md-first/README-draft.md`.

Its thesis: agent memory as plain `.md` files a developer can open, diff,
hand-edit and review in a PR — explicitly *not* competing on architecture-analysis
depth, which `codebase-memory-mcp` (32.7k stars) already owns.

**The draft was audited against the shipped CLI on 2026-08-02, before any of this
band's work.** Findings below. Items 1–4 are what `29`–`31` exist to fix; items
5–7 are this ticket's own to resolve. Re-verify rather than trusting this list —
it was taken against a `2.2.0-rc1` build and the band will have moved things.

### Claims this band must make true (do not soften these — fix them)

1. *"With the default `md-only` storage mode"* — the default was `vector-only`,
   and `neuron init` wrote no `neuron.yaml` at all. Owned by [`31`](31-md-only-as-default.md).
2. *"`md-only` — pure markdown, in-memory semantic search"* and *"local ONNX
   embeddings for semantic search over those files"* — there was **no semantic
   search in `md-only`**; queries fell back to whole-string substring matching.
   Owned by [`29`](29-md-only-semantic-search.md).
3. The configuration example's per-category `tags:` — never selected from in
   `md-only`, because enrichment was inert there. Owned by
   [`30`](30-md-only-enrichment-and-status.md).
4. *"`neuron status` — Displays storage, embedding model, and drift status"* —
   reported `totalCount: 0` in `md-only` with entries on disk. Owned by `30`.

### Claims this ticket must resolve itself

5. **`pullRules.default.minScore: 0.35`** appears in the configuration example.
   [`27`](27-minscore-is-inert.md) established that this threshold is
   mathematically incapable of filtering anything — the top hit's score floors at
   0.375. Publishing it as a tuning knob documents a dead control. Either land
   `27` first, or drop `minScore` from the example. **Do not publish it as-is.**
6. **"Cross-agent — works with Claude, Cursor, Antigravity, and Codex."**
   Cursor is not in the rc3/rc4 adapter plan, which covers Claude Code, Codex,
   Copilot CLI, Antigravity CLI and OpenCode. Either add Cursor to `19`'s
   compatibility matrix as a real supported target, or correct the list. Note the
   claim is *currently* carried by `CLAUDE.md`/`AGENTS.md` instruction blocks
   rather than adapters, which is a weaker form of "works with" than the sentence
   implies.
7. **"no knowledge graph, no binary, no database to inspect."** If `28` puts an
   embedding cache in the `env-paths` data dir, this sentence needs to survive
   contact with a user who finds it. `28` owes a stated position; this ticket
   owes the wording.

### Claims verified as accurate — do not re-audit

`.neuron/*.md` file tree and per-category layout; YAML frontmatter format;
`neuron memory add --category X "..."` and `neuron memory query "..."` syntax;
the storage-mode enum (`md-only`, `vector-only`, `dual`, `split`); the
`neuron memory` subcommand list; `neuron init` pre-downloading ONNX models;
`neuron scan` / `scan --diff` as described in the *Architecture awareness*
section; `npm test` at ~5s.

### The pitch moved after the draft was written

The draft leads on *"memory as plain markdown files you can read and diff"*. The
maintainer sharpened this on 2026-08-02: that claim is not defensible on its own,
because telling an agent to append to a `.md` file is a prompt, not a product.
The defensible claim is the **guarantee** — an agent using the CLI *cannot write
a malformed entry*, because the schema is declared in `neuron.yaml` and enforced
on write ([`36`](36-configurable-frontmatter-schema.md)).

This ticket owns turning that into README prose. Three constraints from `36`:

- **Do not claim value determinism.** The same `memory add` does not produce the
  same tags twice, because inference depends on store state. Claim *shape* and
  *byte* determinism — the entry always conforms, and serialises identically.
- **State the guarantee, not the property name.** "Your agent can't write a
  malformed memory entry" lands; "deterministic writes" invites a reader to test
  the strongest reading of the word and find it false.
- **Lead with the user-defined-fields case**, which is the part a team adopts a
  tool for: *every `decisions` entry must carry a `ticket` and a `reviewedBy`,
  and the CLI refuses writes without them*.

Check whether `36` made the guarantee mode-dependent. If it holds only in
`md-only`, the README carries an asterisk and must say so plainly.

## Scope

1. Re-audit every claim in the draft against the built CLI **after** `29`–`31`
   and `35`–`36` land. Not against the source — against the binary, in a scratch project. The
   audit above was done that way and it is why the gaps were found.
2. Resolve items 5–7.
3. Replace `README.md`.
4. **Rewrite the *Architecture awareness, for context* section under the
   determinism frame — do not ship it as drafted.** The draft is apologetic
   ("this is a supporting feature, not the core pitch… there are tools
   purpose-built for that"), which reads as a concession bolted beside the real
   product. The maintainer reframed it on 2026-08-02: `scan` is *a deterministic
   way to get your architecture into a markdown file that stays up to date* —
   the same claim as the memory store, with the codebase rather than the agent
   supplying the content. That makes the product one idea instead of two, and
   turns the competitive position into depth-versus-artifact rather than
   depth-versus-depth: they analyse, neuron produces a reviewable file a `git
   diff` can gate on.
   Two supporting facts, both earned by [`37`](37-architecture-card-deterministic-artifact.md):
   the card is byte-stable across runs, and repeated scans update one card in
   place. Do not make either claim until `37` has landed them.
   Also correct the underselling: symbol extraction is real Tree-Sitter AST
   parsing across 8 grammars / 10 extensions as of rc1. "Lightweight" is fine as
   positioning; "not AST-based" would be false.
5. Carry `29`'s recorded cold-query latency into any performance wording. Do not
   write "fast" without a number behind it.

## Verification

- Every command in the README executed verbatim in a clean directory, from
  `npm install -g` through `neuron memory query`, and the output compared to what
  the README shows.
- The `.neuron/` tree in the README matches what actually appears.
- No claim in the shipped README traceable to a behaviour this band did not land.

## Deliverables

- [ ] `README.md` replaced
- [ ] Every claim re-verified against the built CLI post-`31`
- [ ] `minScore` resolved (landed or removed from the example)
- [ ] Cross-agent list corrected or `19`'s matrix extended
- [ ] "No database" wording survives `28`'s cache decision
- [ ] Architecture section neither overclaims nor undersells rc1

## Comments

- 2026-08-02: Filed as part of the rc5 markdown-first band. Deliberately blocked
  by `29`, `30` and `31` — shipping the README first would mean publishing four
  false claims and racing to make them true.
