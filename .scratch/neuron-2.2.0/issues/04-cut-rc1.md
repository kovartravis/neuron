Type: task
Status: resolved
Blocked by: 01, 02, 03
Band: 2.2.0-rc1

# 04 — Cut and Publish 2.2.0-rc1

## Question

Is the Tree-Sitter AST engine releasable, and what does the release say about
what changed for existing users?

## Scope

1. Version bump to `2.2.0-rc1`.
2. CHANGELOG section covering the AST engine, the grammar fetch added to
   `neuron init`, and — prominently — the **baseline migration** existing users
   face (ticket `03`).
3. Restore the wording that 2.1.0 deliberately walked back: `CONTEXT.md` entries
   for `TreeSitterScanner` and `Architectural Drift`, `README.md`, `SCAN_HELP`,
   and the accuracy caveat in `.claude/skills/neuron-memory/SKILL.md` may now
   describe real AST parsing again — **but only for the 9 languages ticket `02`
   actually covers.** The remaining extensions stay described as regex fidelity.
   Do not re-introduce the overstatement 2.1.0 corrected.
4. Mark ADR 0003 as implemented; land ADR 0008 from ticket `01`.
5. Run `npm test` and `npm run test:e2e`. Pillar 4 needs the fresh baseline from
   ticket `03`; Pillar 1 (Polyglot AST Traversal) is the one that should visibly
   improve.
6. Verify the packed tarball is still ~621 KB — if grammars leaked into `files`,
   ticket `01`'s central decision has been silently undone.
7. Tag and publish to npm under the `rc` dist-tag, not `latest`.
8. Refresh the architectural blueprint: `neuron scan --diff` then `neuron scan`.

## Deliverables

- [ ] **`2.2.0-rc1` published under the `rc` dist-tag — OUTSTANDING, owned by the
      maintainer.** Everything else is committed, tagged `v2.2.0-rc1` and pushed.
      Publishing needs `npm login` (session was 401) and is irreversible, so it
      was deliberately left. Run: `npm login && npm publish --tag rc`.
      **`--tag rc` is mandatory** — without it npm moves `latest` to an RC.
- [x] CHANGELOG with an explicit upgrade/re-baseline note
- [x] Docs restored to describe AST parsing, scoped to what actually ships
- [x] ADR 0003 marked implemented; ADR 0008 landed (in ticket `01`)
- [x] Unit + E2E suites green; tarball size verified
- [x] Blueprint card refreshed

## Answer

`v2.2.0-rc1` is cut, verified, committed, tagged and pushed. **It is not
published to npm** — see the first deliverable.

### Is the engine releasable? Yes.

- **227 unit tests across 33 files** green.
- **9 of 10 E2E pillars** pass. Pillar 1 (Polyglot AST Traversal) traverses 13
  languages across 55 components. Pillar 4 reports **`baselinePhantomChanges: 0`**
  — the metric that proves the fidelity round-trip converges rather than
  manufacturing drift against its own freshly-written card.
- **Pillar 8 (Multi-Process Contention) fails**: `droppedWriteRatio` 0.08 against
  a 0.05 threshold. Pre-existing and unrelated — verified earlier on this branch
  by stashing all scanner work and reproducing the identical failure on a clean
  tree. Not introduced here, not fixed here. It is SQLite write-lock contention,
  not symbol extraction.
- **Tarball: 613.1 KiB packed, 84 files, zero `.wasm`.** Ticket `01`'s central
  decision is intact — grammars did not leak into `files`.

### Scope item 3, with the count corrected

The ticket says "the 9 languages ticket `02` actually covers". The real figure is
**8 grammars covering 10 extensions** — `.ts`, `.tsx`, `.js`, `.jsx`, `.py`,
`.go`, `.rs`, `.java`, `.cpp`, `.hpp` — with 4 staying on regex (`.cs`, `.swift`,
`.rb`, `.php`). 10 + 4 = 14, which reconciles with `SUPPORTED_SOURCE_EXTENSIONS`.
Docs use the accurate numbers.

Restored in `README.md`, `CONTEXT.md`, `SCAN_HELP` and the packaged
`.claude/skills/neuron-memory/SKILL.md`, each scoped to the eight grammars. The
overstatement 2.1.0 corrected was not reintroduced: the remaining four extensions
are still described as line-oriented, and the skill now tells agents what
"Re-baseline Required" means so they do not report it to a user as a code problem.

ADR 0003 moved from *Partially implemented* to **Implemented**, with two
qualifications learned in implementation — the queries are not uniformly the
shipped `tags.scm`, and kind is read from the node type, not the capture name.

### The finding that cost the most time

**`neuron exec` was silently reverting the blueprint to a `regex/1` card.**

`neuron exec` resolves the *globally installed* neuron from `PATH`, not the repo
source, and it runs `autoRescanIfDriftDetected` as a side effect. The global
install was still **2.1.0** — no `fidelity.js`, and a summarizer that never writes
the fidelity section. So every protocol-mandated `neuron exec -- npm test` saw
phantom drift against the new `ast/2` card and re-ingested a `regex/1` card over
it. `scan --diff` reported "Re-baseline Required" minutes after a verified clean
re-baseline.

The tell is a card with a recent `mtime` whose content lacks features the working
tree implements. Diagnosed with `readlink -f $(which neuron)` plus
`grep -c 'Parser Fidelity' $GLOBAL/dist/components/summarizer.js` → `0`. Fixed
with `npm link`, which is what project memory already prescribes for this repo.
**Relink the global binary before release verification, or the verification
measures the previous version.**

### Two things left for the maintainer

1. **Publish** (above).
2. **Four duplicate blueprint cards exist in the `decisions` category** —
   `7071ca23`, `ea7069ac`, `921b7449`, `8114d254`. `ingestScanResults` locates
   "the" card with a semantic query plus `.find()`, so which one it upserts is not
   guaranteed stable, and duplicates accumulated. `SCAN_HELP` promises
   "Re-running updates that card in place rather than adding a duplicate", so this
   is a real defect. Drift currently resolves consistently (`--check` exited 0
   three runs running), so it is not blocking rc1. I did **not** delete the
   duplicates — that is destructive to your memory store and wasn't mine to do.
   Logged as fog on the map.

## Comments
- 2026-08-01: Resolved except publish. `v2.2.0-rc1` committed, tagged and
  pushed; `npm publish --tag rc` is left to the maintainer (session was npm 401,
  and publishing is irreversible). Docs restored scoped to 8 grammars /
  10 extensions; ADR 0003 marked Implemented.
