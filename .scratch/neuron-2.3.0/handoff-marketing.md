# neuron v2.3.0 — marketing handoff

*Prepared 2026-08-10 for whoever is writing release announcements, social
posts, or landing-page copy. Every number below is sourced from the repo
and linked — verify before publishing, don't paraphrase from memory.*

## One-paragraph pitch

`@kovartravis/neuron` is a local-only agent memory store: your AI coding
assistant remembers decisions, fixes, and conventions across sessions,
stored as plain markdown in your repo (not a hidden database), with recall
enforced by a hook — not requested by an instruction the model can ignore.
v2.3.0 extends that enforced recall to two more harnesses (GitHub Copilot
CLI, Cursor) and, notably, ships a compatibility matrix that tells you
*exactly* how good the recall is on each one — no harness's capability is
overstated to make the feature list look longer.

## What's new in this release

- **Two new harnesses**: GitHub Copilot CLI and Cursor now get a real hook
  adapter, joining Claude Code and OpenAI Codex CLI. Four supported
  harnesses total.
- **Honest fidelity disclosure** (the differentiator worth leading with):
  `neuron init` now tells you, per harness, whether recall is
  `deterministic` (every turn, guaranteed), `best-effort` (real injection,
  with a documented gap), or `instruction-only` (no hook exists) — and what
  to do about it. The README ships a full compatibility matrix. This is a
  *feature*, not boilerplate: most tools in this space imply uniform
  support across integrations without saying which ones are weaker.
- **Config got simpler, not more complex.** Storage location and mode are
  now one settable-per-category vocabulary instead of a `split` mode that
  quietly meant something different from what it said.
- **Architecture awareness scales differently now.** Instead of one giant
  blueprint card that gets truncated on a large repo, it's a small index
  plus per-module detail cards fetched on demand — the same mechanism as
  memory recall itself.

## The proof points — use these, cite the source, don't round up

This is the section to be most careful with. neuron's own pitch is "we
measure, we don't just assert" — a marketing claim that overstates a number
below undercuts the actual differentiator.

**1. The token-savings number: 57.7% pooled reduction, real SWE-bench
instances.**
Two real bug-fix tasks (`matplotlib-24265`, `django-11019`), agent with vs.
without neuron's session-start recall, same model, same deterministic
grader. 19,267 → 8,144 tokens pooled. Cost per run roughly halved ($0.46 →
$0.22). **Caveats to keep attached, not drop:** 16 sessions total (small
N); `django-11019`'s individual 24.9% reduction doesn't reach statistical
significance on its own, only the pooled number and `matplotlib-24265`
alone do (Mann-Whitney U=0, p=0.029); this measures the value of a
*correct* recall hit, not average real-world retrieval quality. Full
numbers: [`benchmarks/token-ab/results/19-synthetic-fixture-counterfactual-ab/findings.md`](../../benchmarks/token-ab/results/19-synthetic-fixture-counterfactual-ab/findings.md).
Also true and usable: **16 of 16 sessions got the correct answer in both
arms** — the token saving isn't bought with worse answers.

**2. "We found our own regression and fixed it" — a real, publishable
credibility story.** The first counterfactual run (24 sessions) found the
memory arm *failing more often* than no-memory (33% vs 17%) — a stale,
superseded decision was outranking the entry that corrected it. neuron
shipped [memory supersession](../../docs/adr/0015-memory-supersession.md)
to fix the root cause, then re-ran: failure rate dropped to 0%, beating
control. This is a stronger story than a clean win from the start — it's
evidence the measurement is real, not cherry-picked. Don't bury it; the
README doesn't.

**3. Recall being *enforced*, not requested, is measurably doing work.**
Same task, memory available only as a file the agent could read but wasn't
forced to: token savings roughly halved (to ~12,552 tokens) because the
agent sometimes just didn't look. This is the cleanest one-line
differentiator against "just write good docs" as a competing pitch.

**4. What NOT to claim:**
- Do **not** say Cursor support is "verified" or imply parity with Copilot
  CLI's row. Cursor ships `best-effort` and has explicitly **not** been
  tested against a real Cursor installation — no maintainer access this
  cycle. This is disclosed in-product (README, `neuron init` output) and
  reversing that disclosure in marketing copy would contradict the
  product's own stated position.
- Do **not** claim a general "X% faster" or "X% fewer tokens" without the
  SWE-bench-instance qualifier — the number is task-specific and measured,
  not a universal multiplier.
- Do **not** cite the git-log recall A/B ("hook search beats agent-run `git
  log`") as a settled win — it beat the control on every raw number (0% vs
  11% failure) but is technically "no measured difference" by the harness's
  own statistical-spread standard. The maintainer chose to ship it anyway
  as a product call, not because the data cleared the bar. Fine to mention
  as directional, not as a proven result.

## Compatibility at a glance (for a feature-comparison table)

| Harness | Recall | Verified against a real install? |
|---|---|---|
| Claude Code | Deterministic, every turn | Yes — continuous dogfooding |
| OpenAI Codex CLI | Deterministic, every turn | Yes — continuous dogfooding |
| GitHub Copilot CLI | Best-effort, session start only | **Yes**, 2026-08-10 |
| Cursor | Best-effort, session start only | **No** — ships on docs/fixtures only |
| Any other harness | Instruction-only (model must self-query) | N/A |

## Links worth pointing readers at directly

- [README's "Measured, not just claimed" section](../../README.md#-measured-not-just-claimed) — the primary evidence page.
- [README's compatibility matrix](../../README.md#recall-is-enforced-not-requested) — the harness-by-harness honesty table.
- [CHANGELOG.md `[2.3.0]`](../../CHANGELOG.md) — full technical release notes.
- [`benchmarks/README.md`](../../benchmarks/README.md) / `npm run bench:view` — the full, re-runnable benchmark report, for anyone who wants to reproduce a number rather than trust it.

## One honest caveat to have ready for objections

A known, disclosed, pre-existing limitation: under heavy concurrent
multi-process write load, neuron's SQLite index can hit transient
migration races (worst case, a small fraction of writes need a retry). It
does not affect the markdown store, which is the actual source of truth —
nothing is silently lost. It's called out plainly in the CHANGELOG rather
than hidden; if asked "is this production-hardened," the honest answer is
"single-agent and light-concurrency use is solid; heavy concurrent
multi-process write load has a known, disclosed rough edge."
