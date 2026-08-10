# neuron v2.4.0 — marketing handoff (early preview, not a release brief)

*Prepared 2026-08-10 from the [neuron-2.4.0 map](map.md) and its
[issues/](issues/) tickets. Read the whole "Where this stands" section
before drafting anything — this is not the same kind of document as the
[v2.3.0 handoff](../neuron-2.3.0/handoff-marketing.md). That one described a
release that had shipped. This one describes a map that has not resolved a
single ticket yet.*

## Where this stands — read this first

**Nothing in this document has shipped, been built, or been measured yet.**
The 2.4.0 map itself says so directly: its own "Decisions so far" section
reads "(none yet) — this map has not resolved any of its own tickets." There
is no cut-and-publish ticket for 2.4.0. There is no chartered scope — the
map's own Destination section calls it "a catch-all for the next release,"
seeded with one real ticket plus ten tickets moved over wholesale from
2.3.0's own scope-narrowing pass. Every ticket below is either `unclaimed`
or `claimed, not resolved`.

**Practical implication for you:** there is nothing here to announce yet.
Treat this as a look at what's brewing so you're not caught flat-footed
later, not as material to draft copy from. The [v2.3.0 handoff's proof
points](../neuron-2.3.0/handoff-marketing.md) are still the current, live,
accurate numbers to cite if you need something today — nothing below
supersedes them.

## What's actually in flight (feature work, unbuilt)

Three features have a real design behind them but zero implementation:

**1. Self-declaring config (`neuron.yaml` fixes itself).** Right now a
category can be written to without being declared in `neuron.yaml`, and the
config silently drifts out of sync with what's actually in the store — this
repo's own config had to work around exactly that gap. The design (ADR 0017,
fully resolved) is: the *first write* to an undeclared category
auto-appends a minimal entry to `neuron.yaml` on disk, without disturbing
the user's own comments/formatting, so the config always converges to match
reality instead of drifting stale. `neuron status --repair` gets the same
treatment for pre-existing gaps. **This is a legitimate "it fixes its own
config drift" story once it ships** — but it is unbuilt (ticket
[01](issues/01-implement-category-declaration-authority.md), unclaimed).
Do not describe this as a current or upcoming feature until it has code
behind it.

**2. A searchable git-log index.** The pitch: your commit history becomes a
second resident source the hook can search, alongside neuron's own memory
store — so a prompt referencing a real past decision can surface the actual
commit, not just what got explicitly written to `.neuron/`. This is
**genuinely unbuilt, and the team is explicitly planning to test it against
its own prior best-case number rather than assume it holds.** A hand-picked,
oracle-quality search term set already beat a plain agent doing its own `git
log` (0% vs 11% failure) — but a follow-up measurement already found that no
automated term-extraction method reaches that same hit rate on real prompts,
which is *why* the design moved to semantic embedding search instead of
keyword matching. Ticket [11](issues/11-rerun-gitlog-ab-semantic-mechanism.md)
exists specifically to find out how much of that oracle-ceiling win the real
mechanism actually recovers, and is committed to reporting the gap honestly
if it falls short. **Do not cite the 0%-vs-11% number as this feature's
result — that number belongs to a hand-tuned prototype, not the shipping
mechanism.** Four tickets deep (implement → docs → dogfood → re-measure,
[08](issues/08-implement-git-log-index.md)–[11](issues/11-rerun-gitlog-ab-semantic-mechanism.md)),
none started.

**3. A per-turn "you're missing results" hint.** When the ordinary recall
that runs every turn surfaces fewer results than actually match, the hook
would append a real, ready-to-run search command with the actual missed
count — not a generic "you can search more" note. Aimed at agents doing
broad synthesis work (e.g. "write the README from everything neuron has
learned") that would otherwise only see whatever fit the per-turn budget.
Unbuilt ([06](issues/06-per-prompt-discovery-command-hint.md)), and its own
proof-of-value ticket ([07](issues/07-measure-discovery-hint-usage.md)) is
explicitly designed to check whether agents actually use the hint before
anyone claims it helps — the team has been burned before by an unverified
assumption that showing an agent a memory system makes it use one (see the
v2.3.0 handoff's proof point #3).

## What's in flight but isn't a feature (skip these for marketing)

- **Automated npm publishing** (tickets [02](issues/02-verify-publish-workflow-real-run.md)/[03](issues/03-github-action-automated-publish.md)) — a GitHub Actions pipeline so releases publish on push instead of by hand. This is real, working infrastructure (it already published `2.3.0-rc2` for real, via OIDC trusted publishing after npm deprecated the token type originally planned) — but it's about how the maintainer ships, not something an end user gets. Not customer-facing.
- **Benchmark-harness engineering** (tickets [04](issues/04-synthetic-fixture-counterfactual-ab.md)/[05](issues/05-architecture-card-ab.md)) — infrastructure for *measuring* neuron's claims, not a product feature. Ticket 04's saga is worth knowing about for context, though: **it's the same underlying work that produced the 57.7% pooled token-reduction number already published in the v2.3.0 handoff** (the `matplotlib-24265`/`django-11019` result). Nothing new to add from it for 2.4.0 — don't double-count it as a fresh number. Ticket 05 (does the architecture-index card measurably help) is still blocked on a sandbox credentials issue and has never run live; there is no result to cite from it, favorable or not.

## What NOT to do with this document

- Don't draft release copy, a changelog teaser, or a landing-page update from this. There's no cut ticket, no version-scope commitment, and the map explicitly hasn't been through its own breadth-first planning pass yet — what else lands in 2.4.0 is still unknown even to the team.
- Don't cite the git-log index's 0%-vs-11% number, or imply the self-declaring config feature exists, ahead of an actual implementation. Both are the kind of overstatement the [v2.3.0 handoff's honesty framing](../neuron-2.3.0/handoff-marketing.md#4-what-not-to-claim) exists specifically to avoid.
- Don't treat this as urgent — reasonable next step is to check back once the map has an actual cut ticket, or ping the team for a refreshed handoff at that point.

## If you need something to publish right now

Use the [v2.3.0 handoff](../neuron-2.3.0/handoff-marketing.md) — it's current, sourced, and already vetted. Nothing in 2.4.0 changes or supersedes it yet.
