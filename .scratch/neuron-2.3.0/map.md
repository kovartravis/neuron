# Map — neuron harness expansion

## Destination

Recall for the harnesses `neuron-2.2.0` shipped without: **best-effort**
hook-based recall for **GitHub Copilot CLI** and **Cursor**, plus the fuller
compatibility-disclosure surface (a real `neuron init` remediation UX and a
README compatibility matrix with a fallback row) that only earns its
engineering cost once there is a less-than-deterministic harness to explain
truthfully.

Reaching the end means: both adapters shipped with a truthful (not
optimistic) fidelity verdict, the disclosure surface reports all shipped
harnesses accurately, a release is cut and published, and every ticket here
is resolved.

## Notes

- **Split off from [neuron-2.2.0](../neuron-2.2.0/map.md) on 2026-08-04**,
  when that map's destination narrowed to a fast, focused 3-pillar cut
  (deterministic Claude Code/Codex recall, md-first, deterministic
  scanning) close to a weekly usage-limit boundary. Nothing here was
  load-bearing for that release — `10`'s research already found both
  harnesses land `best-effort`, and this effort is a continuation, not a
  resumption: per that map's own wayfinder rules, closed-out-of-scope work
  returns only as a fresh effort.
- **This map carries execution**, matching `neuron-2.2.0`'s own posture
  (and, before it, `architecture-scans-2.1.0`'s) — tickets are worked one at
  a time, ending with a cut-and-publish ticket.
- **Inherited, not re-derived:** the adapter interface
  ([ADR 0014](../../docs/adr/0014-recall-adapter-architecture.md), ticket
  [11](../neuron-2.2.0/issues/11-recall-adapter-architecture.md)), the
  shared `src/harnesses/` layer (`types`/`payload`/`ledger`/`hookState`,
  tickets [12](../neuron-2.2.0/issues/12-claude-code-adapter.md)/
  [13](../neuron-2.2.0/issues/13-codex-adapter.md)), and the harness
  research ([10](../neuron-2.2.0/issues/10-harness-compatibility-research.md))
  all already exist and are not re-litigated here — read them before
  starting `01`/`02`. The two deterministic adapters are the reference
  implementations this map's `best-effort` adapters are validated against.
- **Skills to consult:** `/tdd` for the two adapter tickets; `/grilling` if
  either adapter's real-world behaviour forces an interface question ADR
  0014 didn't anticipate. Read `CONTEXT.md` and `docs/adr/*.md` before
  changing module boundaries.
- **Protocol:** every session follows the `CLAUDE.md` memory-store loop
  (or its post-`14` short form, once that ticket lands upstream). Record
  ADRs under `decisions`, session logs under `history`.

## Decisions so far

<!-- one line per resolved ticket: enough to judge relevance, then open the ticket for detail -->

## Not yet specified

<!-- in-scope fog: real, but not yet sharp enough to ticket -->

- **Plan-vs-architecture-diff (`diffAgainstArchitecture`).** Requested in the
  2026-08-02 repositioning handoff as a generic per-category flag in
  `neuron.yaml`, letting a category's entries (e.g. `plans`) be compared
  against the architecture diff by a two-stage pipeline — embedding
  similarity for matching, the 0.5B model only for phrasing already-confirmed
  matches, never for the match decision itself. **Cannot be ticketed: the
  handoff cites a full spec at `neuron-plan-vs-drift-handoff.md` that does
  not exist in this repo or anywhere reachable.** The handoff is explicit
  that the feature must be scoped *exactly* as that spec has it — no new
  package, no PM-software creep, no hardcoded category-name logic — so
  writing a replacement spec from the one-paragraph summary would be
  inventing the thing it says not to invent. Graduates the moment the spec
  is supplied. Note the two-stage shape is consistent with everything
  `neuron-2.2.0` measured: embedder decides, model only phrases.
- **Capturing a maintainer decision, not just an agent action.** Surfaced
  2026-08-01 on `neuron-2.2.0` when a session re-claimed a deferred ticket.
  Protocol step 4 records what the *agent did*; nothing records what the
  *maintainer decided*, so a verbal reversal left no trace anywhere while
  several artifacts kept asserting the opposite. Retrieval worked perfectly
  and returned the wrong answer, which means deterministic hooks do not fix
  this — hooks own the read side, and this is a write-side capture gap.
  What is unformed is whose job the write is, and how a reversal
  *supersedes* a stale high-confidence entry rather than merely competing
  with it.
- **A write-time content-integrity floor.** On `neuron-2.2.0`'s own store,
  roughly a quarter of entries held a single token (`Fix`, `Updated`,
  `When`) because unquoted shell arguments word-split and `neuron memory
  add` kept only the first positional. Otherwise well-formed rows, so
  nothing flags them and they still occupy an embedding slot. Whether the
  fix is a length floor, a whitespace check, a confirmation prompt, or an
  argument-count guard is unformed.
- **Bootstrapping category centroids on a cold store.** `init` produces a
  working project, so the very first `neuron memory add` a user runs is
  against an empty store — and without `--category` it hard-errors
  ("category inference found no category close enough"). The recommended
  posture passes `--category` explicitly, so this may be acceptable; not a
  storage-mode problem (a fresh `md` project has exactly the cliff a fresh
  `vector` project has). Whether the cliff is worth removing, and how,
  given the rejection of embedding short label strings, is unformed.
- **Tag vocabulary is a full-table read per process.** Write-side
  enrichment reads every tagged row's embedding to build centroids on the
  first inferring write. Fine at a few hundred entries; wants a cached
  centroid table or an index long before it's a real problem. Not ticketed
  because the trigger — what store size actually hurts — has not been
  measured.
- **Should `neuron exec`'s pre-command lookup also become a hook?** Step 2
  of the protocol still asks the agent to wrap commands. `10` confirmed
  every harness exposes *some* `PreToolUse`-equivalent, so the prerequisite
  fact is known — but whether to build on it is an adapter-architecture
  design call, not a separable decision, and touching it now would mean
  reopening ADR 0014 rather than extending it.
- **Confidently-wrong retrieval is unowned.** A `neuron-2.2.0` measurement
  found raw cosine *inverted* on wrong answers — top-1 cosine on queries
  retrieval got wrong (mean 0.7779) is *higher* than on queries it got
  right (mean 0.7518) — and no relevance gate addresses it: a gate rejects
  the *irrelevant*, not the *wrong*, and both its legs measure forms of
  confidence. Unformed because the prior question is unanswered: is a
  confidently-wrong top hit detectable at all from retrieval signals, or
  does catching it require adjudicating semantic opposites — the weakest
  capability of both the embedder and the 0.5B model? If undetectable, the
  honest response may be a disclosure rather than a fix.
- **Threat model for grammar delivery.** Tree-Sitter `.wasm` grammars fetch
  from the npm registry over TLS with pinned versions, but do not verify
  the registry's `dist.integrity` checksum. A compromised mirror could
  serve a bad grammar. Not ticketed because the prior question is unformed:
  what threat model does a local-only dev tool owe its users?
- **Cross-harness testing strategy.** This map's two adapters (plus the two
  already shipped) need verification against real harness installations.
  Whether that is CI-automatable or stays manual is unknown.

## Out of scope

<!-- ruled beyond this destination; closed, never graduates -->

- **Google Antigravity CLI and OpenCode adapters** — ruled out on
  `neuron-2.2.0` during ticket 11's grilling (2026-08-03) and not revisited
  here: their reliability cannot be *stated* from documentation that
  contradicts itself (Antigravity) or requires shipping arbitrary plugin
  code (OpenCode). See
  [neuron-2.2.0's Out of scope](../neuron-2.2.0/map.md#out-of-scope) for the
  full reasoning. Return only behind a fresh research ticket that measures
  their behaviour directly.
