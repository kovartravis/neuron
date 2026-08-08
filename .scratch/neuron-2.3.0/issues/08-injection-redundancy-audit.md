Type: task
Status: resolved
Blocked by: none
Band: context cost

# 08 — Injection Redundancy Audit

## Question

Of the tokens neuron injects, what fraction told the agent something it did
not already have?

## Context

Ticket [07](07-session-token-budget-and-cost-telemetry.md) makes the cost a
number. It does not make the cost *worth it* — a bounded budget spent entirely
on restating what is already in the context window is still pure waste, and it
is the specific waste this store is most likely to hold.

The suspicion, stated so it can be falsified: a large share of injected
`history` entries describe work the agent can already see in `git log`, and a
share of `learning` entries restate what `CLAUDE.md`'s protocol block already
says. This project's store is ~1,000 entries and 508 of them are `history`.

**No LLM and no billing.** This is an offline audit over payloads `07` already
records against context the agent already has, which makes it the cheapest
evidence in the band. Anything requiring a judge belongs to
[10](10-counterfactual-token-ab.md).

## Scope

1. **Define "already had" concretely** before measuring — the audit is only as
   good as this list. At minimum: the resident protocol block, `CLAUDE.md` /
   `AGENTS.md` in full, and the `git log` reachable from the session's HEAD.
   Consider, and rule on, whether files the agent opened during the session
   count (they are context, but neuron cannot know them from the hook).
2. **Pick a redundancy measure and justify it.** Lexical overlap is free and
   crude; embedding similarity against already-resident text reuses the
   embedder that is already loaded. Prefer the one whose failure mode is
   *understating* redundancy — an audit that flatters the product is worthless
   to the argument it exists to support.
3. **Report per category.** `history`, `learning` and `decisions` almost
   certainly have very different redundancy profiles, and a blended number
   would hide the actionable finding. Per-category is what tells the maintainer
   whether the fix is a pull-rule change, a category exclusion at the hook, or
   a write-side problem.
4. **Sample from real sessions, not synthetic ones.** `07`'s telemetry gives
   real payloads from real prompts; a synthetic query set would measure the
   query set.
5. **Feed the result forward.** A high redundancy share in one category is a
   direct input to [09](09-shrink-resident-footprint.md) (if the block says it,
   the hook need not) and changes `10`'s expected effect size.

## Open question to settle while working

Redundancy is not automatically waste. An entry that repeats `CLAUDE.md` at
the moment it is relevant may still change behaviour, because a standing
instruction 600 tokens up is not the same as a reminder at the point of use.
Decide whether the audit measures *textual* redundancy only (honest, narrow,
free) or attempts to distinguish redundant-and-inert from
redundant-but-timely — and note that the second cannot be settled without
`10`'s behavioural arm, so the honest answer here may be to measure the first
and hand the second on.

## Verification

- The measure is reported with its own failure direction stated.
- Per-category breakdown, not just a blended figure.
- Results reproducible from recorded payloads without re-running sessions.
- Test isolation per ticket 42.

## Deliverables

- [x] A stated definition of already-resident context
- [x] A justified redundancy measure — overstating, not understating, per the
      2026-08-07 maintainer ruling below
- [x] Per-category redundancy figures over real recorded payloads
- [x] A ruling on textual-only versus timeliness-aware scope
- [x] Findings written up as an input to `09` and `10`

## Answer

Full method, tables and scripts:
[`audits/08-injection-redundancy/findings.md`](audits/08-injection-redundancy/findings.md)
(scripts `extract.mjs` / `embed.mjs` in the same directory reproduce the
numbers below without re-running any session).

**"Already had" is defined as**: `CLAUDE.md` in full (no `AGENTS.md` in this
repo) plus the full `git log` reachable from HEAD (commit messages, not just
subjects) — 128 resident chunks total. **Files the agent opened during a
session are ruled out of the definition**: real context, but the hook never
records them and reconstructing them would mean re-running the session,
which breaks this ticket's own reproducibility requirement. Every figure
below is therefore a floor, not a ceiling.

**Redundancy measure: embedding max-similarity** (neuron's own
`bge-small-en-v1.5`, cosine, no LLM/no billing) between each injected
entry's content and every resident chunk, per-entry. **Corrected the failure
direction against this ticket's own literal text**: Scope item 2 above says
to prefer a measure that *understates* redundancy, but that's the flattering
direction (makes neuron look less wasteful when the measure is wrong), and
it contradicts both this ticket's own next clause ("an audit that flatters
the product is worthless") and the band-wide posture ticket
[07](07-session-token-budget-and-cost-telemetry.md) set and the map's Notes
restate. Put to the maintainer directly this session (2026-08-07): ruled to
follow the band-wide posture — overstate redundancy — overriding this
ticket's wording. Recorded here so a future session doesn't read the Scope
section above at face value.

**Sample**: the 5 new-format session ledgers ticket
[12](12-accumulate-real-session-telemetry.md) characterized — 48 injection
occurrences live (more than 12's 45, from real accumulation in one
still-open session; exact per-session counts in the linked findings), 25
unique entries: 6 `decisions`, 18 `history`, 1 `learning`.

**Per-category results** (median max-similarity; redundant share at ≥0.70,
the top edge of the noise floor ticket 39 already established for this
embedder — a 0.50 cutoff saturates at 100% for every category and has no
discriminating power):

- **`history`: total redundancy.** Median similarity 0.788; **18/18 unique
  entries and 29/29 occurrences** score ≥0.70 against something already in
  `git log`. Confirms the maintainer's stated suspicion almost exactly —
  virtually every injected `history` entry sampled restates work already
  visible in `git log`.
- **`decisions`: substantially redundant.** Median 0.792; 5/6 entries
  (13/18 occurrences, 72%) clear ≥0.70. The one exception (similarity 0.637,
  the lowest score in the whole sample) is a `decisions` entry whose full
  content is the single word "Integrated" — the pre-existing
  content-integrity defect already flagged on the map's "Not yet specified"
  (argument word-splitting truncated it to one token). Its low score is an
  artifact of having almost nothing to embed, not evidence of genuine
  novelty — it's vacuous, not non-redundant. Excluding it: 5/5 non-degenerate
  entries, 13/13 non-degenerate occurrences (100%).
- **`learning`: one data point** (similarity 0.920, itself highly
  redundant with the commit that fixed the issue it describes), carried
  forward as a stated limitation from ticket 12 — too thin to support a
  category-level claim in either direction.

**Textual vs. timeliness**: measures textual redundancy only, per this
ticket's own suggested default. Whether a textually-redundant `history`
reminder still earns its cost by landing at the point of use is a
behavioural question, handed to
[10](10-counterfactual-token-ab.md)'s judge-based arm.

**Feeds forward to `09`**: `history` is the strongest candidate for a
category exclusion or a pull-rule change at the hook — it is not "somewhat"
redundant, it is saturated. `decisions` is a softer case for the same
treatment, with part of its apparent redundancy actually a content-quality
problem rather than a duplication problem. `learning` should not be assumed
to pattern like either until more data accumulates (unblocked by `12`, but
`12` itself flagged `learning` coverage as thin).

**Known limitation**: all 5 sessions are on their first epoch (ticket 12's
own caveat) — nothing here measures repeated re-injection across a
`context-reset`. Not expected to reverse the `history` finding (`git log`
only grows), but unmeasured.

**Verification**: read-only against `.neuron/{history,decisions,learning}.md`
and the existing session ledgers — no writes to the real store, no test
suite run, so ticket 42's isolation rule has nothing to violate here.

## Comments

**2026-08-04, session picking up this ticket:** Claimed, then found real
recorded evidence far thinner than Scope item 4 assumes — `07`'s telemetry
never stores payload *text* (only `chars`/`turns` counts, and `injectedIds`
only for the still-open epoch), and `07`'s own code was sitting uncommitted,
so zero sessions had run under the new format. Two pre-existing ledger files
for this repo covered 2 sessions / 5 entries total under the *old*
`{injectedIds}`-only format, skewed away from `history` (1 of 5). Put the
evidence-sourcing question to the maintainer directly (reconstruct from past
queries vs. ship-and-wait vs. widen "real" to this map's own sessions):
**ruled ship-and-wait** — `07`'s commit lands this session, and
[12](12-accumulate-real-session-telemetry.md) is the new ticket tracking
whether enough has accumulated. `08` reverts to unclaimed, now blocked by
both `07` and `12`. The Scope/Open-question decisions below (definition of
"already had," redundancy measure, textual-vs-timeliness ruling) remain
open — nothing here settled them, so the next session should not assume
they're pre-decided.

Also confirmed, separately: the maintainer's actual ask this session
("run a benchmarking session to determine if neuron is viable, whether it
reduces or is neutral to tokens consumed") is `10`'s destination, not `08`'s.
Maintainer chose to finish `08` as scoped first rather than re-sequence —
recorded so a future session doesn't re-litigate the fork.
