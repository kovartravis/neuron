# Handoff response — repositioning charted, with corrections and a sharper pitch

**Date:** 2026-08-02
**From:** neuron repo session (branch `feat/2.2.0-tree-sitter-grammars`)
**Re:** "Neuron: Repositioning Handoff — Break Into Tickets"

---

## TL;DR

Charted as **tickets 28–36**, a new `2.2.0-rc5` band on the wayfinder map at
`.scratch/neuron-2.2.0/map.md`. Nothing implemented yet — charting only.

Four things to update your picture with:

1. **The pitch should change.** "Memory as markdown files" is not defensible.
   The defensible claim is a *guarantee*: an agent using the CLI cannot write a
   malformed entry. This is the biggest item here — **it changes the README's
   headline.**
2. **The README's current claims aren't true yet.** Four load-bearing ones fail
   against the shipped CLI, which turned "ship the README" from a docs task into
   a release band of engineering.
3. **Group 3 (tree-sitter) is already done** — shipped in `2.2.0-rc1`. Your
   handoff describes the pre-rc1 state.
4. **Group 4 can't be ticketed.** Its spec doesn't exist anywhere reachable.
   **This is the main thing I need back from you.**

---

## 1. The pitch: sell the guarantee, not the file format

Adopted after the maintainer proposed positioning neuron as a *deterministic
writer* with required frontmatter fields declared in `neuron.yaml`.

**Why the current pitch is weak.** "Your agent's memory as plain markdown" is
trivially replicable — telling an agent to append to a `.md` file is a prompt,
not a product. It's also awkward right now because `md-only` has no semantic
search (see §2), so a skeptic can fairly ask what the CLI is *for*.

**Why the guarantee is strong.** *"Your agent cannot write a malformed memory
entry"* needs an enforcement point, and that enforcement point is the reason to
route writes through `neuron` instead of `>>`. It makes the CLI load-bearing.
Against `codebase-memory-mcp` it's a **governance** claim rather than a
capability claim — orthogonal to analysis depth instead of competing with it.

**The part a team actually adopts a tool for** is user-defined required fields:
*every `decisions` entry must carry a `ticket` and a `reviewedBy`, and the CLI
refuses writes without them.* Lead with that.

### Three constraints on the wording

- **Don't claim value determinism.** Three properties get bundled under
  "deterministic": *shape* (entries conform to the schema — enforceable),
  *byte* (same entry, same bytes; no diff noise — enforceable), and *value*
  (same command, same field values — **false**, because tag/category inference
  depends on store state, which grows). Claim the first two.
- **State the guarantee, not the property name.** "Deterministic writes" invites
  a reader to test the strongest reading and find it false.
- **Check whether the guarantee is mode-dependent.** If it only holds in
  `md-only`, the README carries an asterisk and must say so.

### It's backed by two live defects, not just theory

Checking whether the code can support a determinism claim found that it can't —
from the *read* side. Both reproduce in under a minute in an `md-only` project:

| Hand-edit | Result |
|---|---|
| Delete the `importance:` line | Reads back as **`1`** — writer defaults to `3`, reader defaults to `1` |
| Delete the `id:` line | **A new random UUID on every read** — three reads, three different ids |

The importance asymmetry is a data-loss path: `1` is prune-eligible at every
threshold and `prune`'s default ceiling is `3` compared inclusively, so removing
one line from a critical entry makes it maximally deletable. The `id` case is
worse — the entry has no stable identity, so `memory update`/`delete` can never
target it, and in `dual`/`split` it duplicates on every `sync`.

This is the exact feature the pitch is built on. Hand-editing currently corrupts
data silently.

---

## 2. The README's core claims don't hold yet

Audited against the **built CLI** in a clean scratch project — not against
source, which matters (see §5).

### True, no work needed

The `.neuron/*.md` tree and per-category layout; the YAML frontmatter format;
`memory add` / `query` syntax; the storage-mode enum; the `neuron memory`
subcommand list; `neuron init` pre-downloading ONNX models; the `scan` /
`scan --diff` description; `npm test` at ~5s. **The files themselves are
genuinely good** — readable, greppable, diffable. The core artifact works.

### Fails

**1. `md-only` is not the default, and `neuron init` writes no config at all.**
Schema defaults to `vector-only` (`src/config/neuronYaml.ts:12`, `:115`), and
there's no `neuron.yaml` generation anywhere in `src/commands/init.ts`. A reader
following the Quick Start verbatim gets **a SQLite database and zero `.md`
files**. The "What it looks like in your repo" section describes something that
only happens via the agent setup interview.

**2. `md-only` has no semantic search.** You claim "in-memory semantic search"
and "local ONNX embeddings for semantic search over those files." Measured,
against an entry reading *"Tree-sitter grammars are fetched at init and cached in
the env-paths data dir"*:

| Query | Hits |
|---|---|
| `"fetched at init"` — exact substring | 1 |
| `"where are grammars stored"` — same meaning | **0** |
| `"init at fetched"` — same words, reordered | **0** |

Whole-string substring matching, not even tokenized — beaten by `grep`. Cause:
`queryMarkdownOnly` resolves its embedder via `(this.vectorDb as any)?.getEmbedder?.()`,
but in `md-only` `vectorDb` is a two-method delegate carrying neither property,
so it's always `undefined`. A full cosine path and an mtime-keyed cache sit
there, unwired.

**3. Enrichment is inert in `md-only`.** Centroids build from vector-store
embeddings that don't exist there. Every entry stores `tags: []`, so the
per-category `tags:` in your config example is decorative — and `memory add`
*without* `--category` fails 100% of the time.

**4. `neuron status` reports `totalCount: 0`** with entries on disk.

### Two smaller items

**`minScore: 0.35`** in your config example is mathematically inert — the top
hit's score floors at 0.375, above it. Land ticket 27 first or drop the line.

**"works with Claude, Cursor, Antigravity, and Codex"** — Cursor isn't in the
adapter plan (Claude Code, Codex, Copilot CLI, Antigravity CLI, OpenCode). And
today that compatibility is instruction-block based, not adapters; the real ones
are rc3/rc4.

---

## 3. Two corrections to the handoff

**Group 3 is already done.** Tree-sitter AST extraction shipped in `2.2.0-rc1`
(ticket 02). ADR 0003 is marked *Implemented*. Coverage is **8 grammars / 10
extensions**; symbol count went **3290 → 233** (94% of the old total was call
sites miscounted as methods) while *gaining* symbols the regex never saw, because
it matched `export function` but not `export async function`.

What remains is four extensions still on the fallback: `.cs`, `.swift`, `.rb`,
`.php`. Already tracked as fog; annotated with your deprioritisation rather than
duplicated as a ticket. Caveat for messaging: those four also use a crude
`export|public|pub` line test for the `exported` flag, so their export contracts
are weaker in a second, less obvious way.

**Group 4's spec doesn't exist.** `neuron-plan-vs-drift-handoff.md` isn't
attached, isn't in the repo, isn't in any `.scratch/` directory. I deliberately
did **not** reconstruct it from your summary — your own instruction is to scope it
"exactly as written in the linked spec," and rebuilding from a paragraph is how
that discipline gets lost. Parked in **Not yet specified**; graduates the moment
the spec appears. The two-stage shape you describe (embedder matches, 0.5B model
only phrases confirmed matches) is consistent with everything this map has
measured — six A/Bs, six wins for the cheaper method.

---

## 4. What got created

New `2.2.0-rc5` band on the 2.2.0 map (your call — a band over a separate map):

```
28 — What md-only Parity Actually Means   (grilling, unblocked) ← frontier
     └─ 29 — Real Semantic Search in md-only
         └─ 30 — Enrichment + Honest Counts in md-only
             └─ 31 — Make md-only the Actual Default
                 └─ 32 — Ship the Repositioned README
                     └─ 33 — Repoint the Docs (your group 2)
                         └─ 34 — Cut and Publish rc5

35 — Frontmatter Round-Trip Integrity     (task, unblocked)    ← frontier
     └─ 36 — Configurable Frontmatter Schema  (grilling)
              └─ (32 and 34 also block on these)
```

`21 — Release 2.2.0 Stable` now also blocks on 34. Map destination updated to
"deterministic, schema-enforced plain-markdown memory."

**28 and 36 are grillings, not tasks**, because each is a design decision with a
public claim attached. 28's is where embeddings live: they're 1.5 KB of base64
per entry that must not land in a human-readable file, so they live elsewhere —
and "elsewhere" has to survive the "no database to inspect" headline. A cache in
the `env-paths` data dir is probably right (a cache isn't a store of record), but
that distinction must be made deliberately and stated, or the first person who
finds it concludes the claim was marketing.

**35 is unblocked and independent** — it's a live data-loss bug that should be
fixed on its own merits, and 36 blocks on it because enforcing a shape on write
while the reader fabricates values on read is a guarantee in name only.

Open questions 36 must answer: what happens to **entries that already violate a
newly-declared schema**; whether the guarantee holds in `vector-only`; and
whether this **reopens `neuron doctor`** — the map ruled that out twice, and if
schema is declarable plus hand-editing is the headline, something has to validate
existing files. Better decided deliberately than arrived at by accident.

**rc5 has no technical dependency on rc3/rc4** and can be pulled forward.

---

## 5. Decisions taken — flagged so you can overrule

- **Band on the 2.2.0 map, not a separate map.** Your call.
- **Default flip needs no migration** — your ruling ("basically no users").
  Ticket 31 says so explicitly and tells implementers *not* to build
  SQLite-detection or a fallback.
- **The README ships last, not first.** My call, and the one most worth review.
  Your group 1 had it standalone; I blocked it behind the parity and schema work
  because shipping first means publishing false claims and racing to catch up.
  Every audit finding is in ticket 32 claim-by-claim with owners.
  **If you want a truthful README now**, the alternative is a smaller edit: say
  md-only is *recommended and configured by the setup interview* rather than
  *the default*, and drop the semantic-search claim until 29 lands. One session,
  ahead of 28. Say the word.

**Non-goals confirmed** and recorded as permanently out of scope: no
`@neuron/core` package/SDK (flagged specifically because 28/29's embedding layer
is exactly the seam that invites it), no competing on architecture-analysis
depth, no new top-level CLI commands.

**Process note:** reading source would not have caught the `md-only` search
failure. The cosine path *looks* complete — it's dead only because of
optional-chained `as any` property sniffing against an object that never carries
the property. It took running a query and getting zero hits for an obvious match.
Recommend running the built binary for anything making a behavioural claim.

---

## What I need back

1. **`neuron-plan-vs-drift-handoff.md`** — blocks group 4 entirely.
2. **Yes/no on README-now vs README-after-parity** (§5).
3. **Confirm the pitch shift in §1** — it changes the README's headline, so it
   should be settled before ticket 32 is worked.
4. Optional: whether to pull rc5 ahead of rc3/rc4 given the competitive
   motivation. Currently placed last; nothing technical stops it moving.
