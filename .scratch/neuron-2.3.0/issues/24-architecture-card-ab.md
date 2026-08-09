Type: task
Status: claimed
Blocked by: none
Band: context cost

# 24 — Architecture Card A/B: With vs Without

## Question

Does proactively pushing the architecture card into context measurably help
— fewer tokens, fewer turns, fewer wrong answers — versus an agent that has
to discover the same structural facts itself?

## Context

Surfaced 2026-08-08 directly from `11`'s resolution, at the maintainer's
direct request for a repeatable proof of the card's value — the same split
`18` used for `17`: the build ticket (`11`) shouldn't grade its own outcome.

Reuses [10](10-counterfactual-token-ab.md)'s harness and methodology (same
tiered plumbing, same fixed-task-set-with-objective-completion-criteria
design, no LLM judge) rather than building new orchestration — the same
reuse discipline `14`'s own Scope states. Narrower than `10`: `10`/`18` test
*full memory resident* vs *none*; this ticket isolates just the one payload
`11`/`25` push proactively at session-start/first-`pre-prompt`, independent
of the broader memory-recall question `10`/`18` already answered.

**Two real, unplanned findings surfaced while scoping this ticket, both
resolved before it ran** (see [11](11-reinject-architecture-card-per-epoch.md)
and [25](25-architecture-card-stable-id-and-truncation.md)'s own Answers):
the card wasn't reliably fetched (crowded out of a generic category query on
this repo's own `scan.category: decisions` config) and, even when fetched,
was silently dropped for exceeding the injection budget (~53,000 chars
against a 6,000-char cap). Both fixed by `25` before this A/B ran — this
ticket tests the *corrected* mechanism, not the pre-`25` one, which would
have shown the card doing nothing at all on this repo, an artifact of the
retrieval bug rather than a finding about the feature's value.

## Scope

1. **Card content**: the real text `neuron hook claude-code session-start`
   emits on this repo today (captured live, post-`25`, at the commit this
   ticket resolved on — see Answer for the exact captured string and its
   provenance). Not a hand-authored stand-in — this is genuinely what a real
   session sees, truncated exactly as `25` built it to be.
2. **Fixture isolates the card specifically, not general memory**: both arms
   share `10`'s "pinned git worktree at HEAD" design; the `card` arm's system
   prompt includes the captured card text (framed as what the harness's hook
   would inject), the `no-card` arm gets nothing and, like `10`'s `control`
   arm, has `.neuron/` removed — so the comparison is "gets the structural
   push for free" vs. "must discover it via `ls`/`grep`/reading source,"
   not a rerun of `10`/`18`'s already-answered full-memory question.
3. **Tasks answerable from the captured card's actually-present content**
   (verified against current repo state, not stale): (a) enumerate this
   project's declared third-party dependencies per its architecture
   blueprint; (b) enumerate the project's top-level subsystems with their
   directory paths, per the blueprint's own module-boundary determination
   (deliberately not derivable by a plain directory listing alone — "which
   directories count as a primary module" is the scanner's own judgment
   call, not filesystem structure).
4. **Cost minimized per the maintainer's direct request**: 2 tasks x 2 arms
   x 2 repeats = 8 sessions, Sonnet 5, `effort: 'low'`, `--dry-run` validated
   first at zero spend. Smaller than `10`/`18`'s N — a deliberately cheap
   pilot, not a statistically powered result; report the spread honestly and
   say so if it's inconclusive rather than overclaiming from 2 repeats.
5. **Report like `10`**: token distribution and failure rate per arm, the
   risk arm, "no measured difference" if any advantage is smaller than
   observed spread.
6. **If the finding is favorable, write it into the README** (this session's
   direct ask) as a disclosed, reproducible number with the exact re-run
   command — same honesty-band discipline `15` will later formalize for the
   whole suite. If unfavorable or inconclusive, disclose that too, same
   posture `10`'s own finding took.

## Verification

- `--dry-run` exercises fixture + grading plumbing at zero spend before any
  real session runs.
- Card content is the real, captured post-`25` hook output, not synthetic.
- k=2 repeats reported with spread, not just means; 8 sessions total.
- README updated only if the finding is favorable and reproducible.

## Deliverables

- [ ] `benchmarks/architecture-card-ab/` harness (fixtures + tasks, reusing
      `token-ab/session.mjs` verbatim)
- [ ] Results recorded under `.scratch/neuron-2.3.0/audits/24-architecture-card-ab/`
- [ ] README updated with the finding, if favorable

## Answer

**Real card content captured** 2026-08-08, post-`25`, via `echo
'{"session_id":"capture"}' | node dist/cli.js hook claude-code session-start`
at this repo's own root (commit at ticket `25`'s resolution) — 6,000
characters exactly (hits the `SESSION_START_CHAR_BUDGET` cap, truncated mid-
`src` subsystem with `25`'s `...[truncated]` marker), containing: system
purpose (14 primary modules), the full dependency contract (12 packages:
`@anthropic-ai/sdk`, `@huggingface/transformers`, `@types/better-sqlite3`,
`@types/node`, `env-paths`, `onnxruntime-web`, `tsx`, `typescript`,
`vitest`, `web-tree-sitter`, `yaml`, `zod`), the complete subsystem
dependency map (all 14 subsystem paths), and per-file export contracts for
the `benchmarks`, `longmemeval`, and part of the `src` subsystems before the
truncation point. Saved verbatim to
`.scratch/neuron-2.3.0/audits/24-architecture-card-ab/captured-card.txt` for
the harness to read rather than re-embedding in this file.

**Harness built and dry-run validated** 2026-08-08:
`benchmarks/architecture-card-ab/` (`fixtures.mjs`, `tasks.mjs`, `run.mjs`),
reusing `../token-ab/session.mjs` verbatim per Scope item 1. `fixtures.mjs`
builds a `card`/`no-card` git-worktree pair at HEAD, `.neuron/` removed from
both, the `card` arm's system prompt carrying the captured card text above.
`tasks.mjs` has the two tasks from Scope item 3, graded by counting known
substrings (dependency names / subsystem paths) against a 10-of-12 and
10-of-14 threshold respectively. `node benchmarks/architecture-card-ab/run.mjs
--dry-run` confirmed both arms' fixtures build correctly (`.neuron` absent
on both, system note present only on `card`) and grading runs without
error, at zero spend. Worktrees clean up correctly (`git worktree list`
empty after both the dry run and the failed live attempt below).

**Live run blocked, not run this session.** `node
benchmarks/architecture-card-ab/run.mjs` failed 2 sessions in:
`WorkloadIdentityError: User OAuth refresh failed to reach token endpoint`
from `@anthropic-ai/sdk`'s `new Anthropic()` — this sandbox has no
`ANTHROPIC_API_KEY`, and the SDK's fallback OAuth credential discovery
can't reach its token endpoint from here. This is the exact question the
map's own fog already had open ("The A/B harness's execution mechanism and
funding") — now concretely blocking rather than hypothetical. Presented the
maintainer three options (supply an `ANTHROPIC_API_KEY`, run the 8
tasks as live Claude Code subagent sessions instead of a scripted harness,
or stop here); maintainer chose to stop for this session. Left unresolved,
not closed — the harness is ready to run as soon as either path is chosen.

## Comments
