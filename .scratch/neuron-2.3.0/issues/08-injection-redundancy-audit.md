Type: task
Status: unclaimed
Blocked by: 07, 12
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

- [ ] A stated definition of already-resident context
- [ ] A justified redundancy measure that errs toward understating redundancy
- [ ] Per-category redundancy figures over real recorded payloads
- [ ] A ruling on textual-only versus timeliness-aware scope
- [ ] Findings written up as an input to `09` and `10`

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
