# Map — neuron 2.2.0

## Destination

`@kovartravis/neuron` **v2.2.0** published stable to npm, reached progressively
through four release candidates. The release covers three themes: real
WebAssembly Tree-Sitter AST parsing, expanded use of the shipped Qwen1.5-0.5B
model, and harness-native recall across five coding agents with an `AGENTS.md`
fallback for everything else.

Reaching the end means: the way to `v2.2.0` is walked, not merely charted —
every ticket resolved, every rc cut, stable published.

## Notes

- **This map carries execution.** Tickets are worked one at a time; each rc band
  ends with a cut-and-publish ticket. This follows the precedent of
  `.scratch/architecture-scans-2.1.0/map.md`, which ran the same way.
- **Theme order is fixed: tree-sitter → LLM → recall.** Accurate AST symbols are
  the input to both the summarizer and the blueprint cards that recall serves.
  Doing tree-sitter last would mean re-baselining twice.
- **Skills to consult:** `/grilling` and `/domain-modeling` for decision tickets;
  `/research` for ticket `10`; `/tdd` for implementation tickets. Read
  `CONTEXT.md` and `docs/adr/*.md` before changing module boundaries.
- **Protocol:** every session follows the `CLAUDE.md` memory-store loop. Record
  ADRs under `decisions`, session logs under `history`.
- Ticket `10` (harness compatibility research) is **AFK and unblocked from day
  one**. It does not depend on tree-sitter and can run in parallel with rc1
  rather than idling until rc3.
- Supersedes
  [06 — Real Tree-Sitter AST Engine](../architecture-scans-2.1.0/issues/06-real-tree-sitter-ast-engine.md)
  from the 2.1.0 map. Its requirements are split across `01`–`03` here.

## Release bands

| Band | Tickets | Delivers |
|------|---------|----------|
| `2.2.0-rc1` | `01`–`04` | Real Tree-Sitter AST engine |
| `2.2.0-rc2` | `05`–`09` | Expanded Qwen1.5-0.5B usage |
| `2.2.0-rc3` | `10`–`15` | Recall adapter layer + 2 reference adapters |
| `2.2.0-rc4` | `16`–`20` | Remaining 3 adapters + disclosure |
| `2.2.0` | `21` | Stable release |

## Decisions so far

<!-- one line per resolved ticket: enough to judge relevance, then open the ticket for detail -->

- [01 — Tree-Sitter Grammar Acquisition & Init-Time Caching](issues/01-grammar-acquisition-caching.md)
  — Grammars fetch at `neuron init` from the **official `tree-sitter-<lang>` npm
  packages** (8.49 MB, all 8 in ~1.0s) into an `env-paths` cache, pinned and
  manifest-attributed. Tarball holds at 612.6 KB with zero `.wasm`.
  [ADR 0008](../../docs/adr/0008-tree-sitter-grammar-distribution.md).

### Settled while charting

These came out of the charting grilling session and are recorded here because no
ticket resolved them; they are premises the tickets are built on.

- **Grammar distribution** — `.wasm` grammars fetch at `neuron init` and cache in
  the `env-paths` data dir, matching how the ONNX models already work
  (`src/commands/init.ts:28-43`). Keeps the tarball at ~621 KB rather than ~20 MB.
- **Missing-grammar behaviour** — degrade to the regex scanner, warn loudly, and
  record parser fidelity per-file in the blueprint card. Drift refuses to compare
  across mismatched fidelity rather than reporting phantom changes.
- **LLM jobs for 2.2.0** — write-side enrichment, query expansion, and
  consolidation dedupe. Recall synthesis was considered and ruled out.
- **Recall mechanism** — per-harness native hooks for Claude Code, Codex,
  Copilot, Antigravity CLI and OpenCode, falling back to `AGENTS.md` instructions
  for any harness without a hook surface.
- **Protocol split** — hooks own the read side (step 1 of the `CLAUDE.md`
  protocol is deleted); the agent keeps the write side (steps 2–4), because
  deciding what is worth recording is editorial judgment a 0.5B model cannot make.
- **Disclosure** — compatibility is reported by `neuron init` output plus a
  static README matrix.

## Not yet specified

<!-- in-scope fog: real, but not yet sharp enough to ticket -->

- **Should `neuron exec`'s pre-command lookup also become a hook?** Step 2 of the
  protocol still asks the agent to wrap commands. A `PreToolUse`-style hook could
  enforce it, but only on harnesses that expose one. Hangs on ticket `10`.
- **Recall payload token budget.** The PersonaMem sanity run retrieved 28k tokens
  successfully and the *large* model then over-reasoned on it. Auto-injection on
  every turn makes this sharper, not softer. Needs a budget, a truncation
  strategy, and possibly a relevance floor. Hangs on ticket `11`.
- **Restructuring the packaged `neuron-memory` skill.** Once step 1 leaves
  `CLAUDE.md`, the shipped skill at `.claude/skills/neuron-memory/SKILL.md`
  describes a protocol that no longer matches. Scope of the rewrite is unclear
  until `14` lands.
- **Grammars for the remaining 6 languages.** Ticket `02` covers the 8 languages
  the old ticket 06 required. Ruby, PHP, Swift, C# and the rest stay at regex
  fidelity — whether they graduate in 2.2.0 or later is open.
- **Threat model for grammar delivery.** Ticket `01` fetches `.wasm` from the npm
  registry over TLS with pinned versions, but does not verify the registry's
  `dist.integrity` checksum — it bypasses npm, so npm's own verification does not
  apply. A compromised mirror could serve a bad grammar. Not ticketed because the
  prior question is unformed: what threat model does a local-only dev tool owe its
  users? Answer that and the hardening follows, or is consciously declined.
- **Cross-harness testing strategy.** Five adapters need verification against
  five real harnesses. Whether that is CI-automatable or stays manual is unknown
  until `10` reports.

## Out of scope

<!-- ruled beyond this destination; closed, never graduates -->

- **Recall synthesis / briefing compression via the 0.5B model** — considered as
  the highest-value LLM job and declined. A small model compressing retrieved
  memories fails invisibly: the consumer cannot tell a dropped detail from an
  absent one. Revisit only with a larger model.
- **`neuron doctor` diagnostic command** — a re-runnable per-harness fidelity
  check was proposed; `neuron init` output plus a README matrix was chosen
  instead. Reconsider if the static matrix proves to go stale.
- **MCP server** — rejected on the merits, not on cost. MCP exposes tools the
  agent *chooses* to call, which is the same reliability failure as a `CLAUDE.md`
  instruction, relocated. Only hooks make recall deterministic.
- **`neuron completion` shell autocompletion** — deferred out of 2.1.0 and still
  unscheduled. Tracked at
  [04 — Shell Autocompletion & DX](../architecture-scans-2.1.0/issues/04-shell-autocompletion-dx.md).
