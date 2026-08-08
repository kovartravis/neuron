# Injection Redundancy Audit — Findings

Asset for [ticket 08](../../issues/08-injection-redundancy-audit.md). Run
2026-08-07 against this repo's own `.neuron` store and hook telemetry.

## Method

`extract.mjs` reads:

- **Injected entries**: the 5 new-format session ledgers ticket
  [12](../../issues/12-accumulate-real-session-telemetry.md) characterized,
  from `~/Library/Caches/neuron/hooks/a8541890092e7e49/` — every
  `injectedIds` entry, resolved against `.neuron/{history,decisions,learning}.md`
  by `id:` frontmatter. Re-running today the same 5 files show more
  accumulated activity than ticket 12's snapshot (one session, `40f9050f`,
  grew from the 5 ids ticket 12 recorded to 8 — real accumulation in an
  ongoing session, not a data error). Live counts used here: `00461f3b`=4,
  `074f7402`=16, `40f9050f`=8, `acf73004`=13, `f1e99213`=7 — 48 occurrences,
  25 unique ids (6 `decisions`, 18 `history`, 1 `learning`). A sixth ledger
  (`934fcf00…`) appeared after ticket 12 resolved — this session's own
  session-start firing — and was excluded: its 4 ids and payload are
  identical to `00461f3b`'s, so it adds no new information and including it
  would just double-count that session.
- **Resident corpus** ("already had"): `CLAUDE.md` in full (2,686 chars, no
  `AGENTS.md` in this repo), chunked by heading/paragraph into 17 pieces; and
  `git log` (full commit messages, not `--oneline`) reachable from the
  current HEAD (`1b2fdc7`), 120 commits / 64,480 chars, one chunk per commit.
  128 resident chunks total. **Explicitly excludes files the agent opened
  during a session** — real context, but neither recorded by the hook nor
  reconstructable without re-running the session, and Verification requires
  reproducibility from recorded payloads alone. This makes every figure
  below a **floor**: a session that also read relevant files would find at
  least this much overlap, plus whatever those files added.
- Approximates "the git log reachable from the session's HEAD" with today's
  full log rather than reconstructing each session's exact HEAD — all 5
  sessions ran within the same few days as today, so this overstates
  "already had" by at most a handful of commits for the earliest session,
  which is the same failure direction already chosen below, not a new bias.

`embed.mjs` embeds every resident chunk and every unique injected entry's
raw content with neuron's own embedder (`Xenova/bge-small-en-v1.5`, local
ONNX, no LLM, no network, no billing) and scores each entry by **max cosine
similarity to any resident chunk**.

## Redundancy measure and its failure direction

**Embedding max-similarity**, not lexical overlap. Ticket 08's own text
asked for the opposite failure direction ("prefer... understating
redundancy"), but that is the flattering direction — it makes neuron look
less wasteful when the measure is wrong — and it contradicts both the ticket's
own adjacent sentence ("an audit that flatters the product is worthless") and
the band-wide posture ticket 07 set and the map's Notes restate ("the failure
direction this whole band prefers is overstating neuron's own cost"). Put to
the maintainer directly this session: ruled to follow the band-wide posture,
overriding ticket 08's literal wording. Embedding similarity is the
overstating choice here because it catches paraphrase and topical overlap
that lexical matching misses, at the cost of flagging some merely-related
content as if it were duplicated.

## Results

Per-unique-entry and occurrence-weighted (occurrences = how many of the 5
sessions actually spent budget on that entry):

| category | unique entries | occurrences | mean sim | median sim | weighted mean sim |
|---|---|---|---|---|---|
| decisions | 6 | 18 | 0.776 | 0.792 | 0.735 |
| history | 18 | 29 | 0.798 | 0.788 | 0.797 |
| learning | 1 | 1 | 0.920 | 0.920 | 0.920 |

Every one of the 25 unique entries scored ≥0.637 — the measure saturates
(100% "redundant") at the 0.50 threshold this codebase already uses
elsewhere as a relevance floor, so a 0.50 cutoff has no discriminating power
here and is reported only to disclose that saturation. Ticket 39 (cited in
`src/harnesses/payload.ts`) already found cosine floors of 0.50–0.70
*regress* recall — i.e. similarity readings in that band are this
embedder's own noise floor, not clean signal — so 0.70, the top edge of that
established band, is used below as the "confidently redundant" bar instead:

| threshold | decisions (entries) | decisions (occ.) | history (entries) | history (occ.) | learning |
|---|---|---|---|---|---|
| ≥0.50 | 6/6 (100%) | 18/18 (100%) | 18/18 (100%) | 29/29 (100%) | 1/1 |
| ≥0.65 | 5/6 (83%) | 13/18 (72%) | 18/18 (100%) | 29/29 (100%) | 1/1 |
| ≥0.70 | 5/6 (83%) | 13/18 (72%) | 18/18 (100%) | 29/29 (100%) | 1/1 |
| ≥0.75 | 4/6 (67%) | 8/18 (44%) | 15/18 (83%) | 25/29 (86%) | 1/1 |
| ≥0.80 | 2/6 (33%) | 2/18 (11%) | 8/18 (44%) | 13/29 (45%) | 1/1 |
| ≥0.85 | 1/6 (17%) | 1/18 (6%) | 4/18 (22%) | 4/29 (14%) | 1/1 |

**`history` is saturated at the established-noise-floor bar**: every single
injected `history` entry sampled, in every session, scores at or above 0.70
against something already in `git log` (median 0.788). This confirms the
maintainer's stated suspicion almost exactly.

**`decisions` is substantially but not totally redundant**: 72–83% of
injected occurrences clear 0.70. The one clear outlier (sim 0.637, the
lowest score in the whole sample) is the `decisions` entry whose full content
is the single word **"Integrated"** — a pre-existing content-integrity defect
(the same one flagged in the map's "Not yet specified" — argument
word-splitting truncated it to one token) already known from this repo's own
2.2.0 store. Its low score is an artifact of having almost no text to embed
distinctively, not evidence that it's genuinely non-redundant content — it's
vacuous rather than novel. Excluding that one entry, `decisions` redundancy
at ≥0.70 is 5/5 unique (100%), 13/13 non-degenerate occurrences (100%).

**`learning` is a single data point** (sim 0.920, a near-restatement of the
commit message for the same fix) — carried forward from ticket 12 as a
stated limitation, not a category-level finding. Cannot support a
`learning`-specific conclusion either way.

## Textual vs. timeliness

Textual redundancy only, per the ticket's own suggested default. Whether a
textually-redundant `history` reminder still earns its cost by landing at
the point of use (vs. 600 tokens up in `CLAUDE.md`) is a behavioural
question this offline audit cannot answer — handed to
[10](../../issues/10-counterfactual-token-ab.md)'s judge-based arm.

## Known limitation

All 5 sessions sampled are still on their first epoch (ticket 12's own
caveat) — nothing here measures whether repeated re-injection across a
`context-reset` compounds this. `history`'s redundancy against git log
specifically would only *grow* across epochs (git log never shrinks), so
this is not expected to reverse the finding, but it is unmeasured.
