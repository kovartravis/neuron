# Handoff: neuron-2.4.0

Orientation doc for an agent picking up work on the **neuron-2.4.0**
wayfinder map cold. Written 2026-08-14, at the point where rc3 is cut and a
PR is open against `main`. Doesn't restate detail that already lives in the
map, its tickets, the CHANGELOG, or the ADRs — it points at them.

## What this effort is

- **Map**: [Map — neuron 2.4.0](../../.neuron/tickets.md) — entry id
  `0a1d6d69-54ea-42bf-bc30-6ae4522172fd` in the `tickets` category. Fetch it
  with `neuron memory get 0a1d6d69-54ea-42bf-bc30-6ae4522172fd`.
- **Destination**: `@kovartravis/neuron` v2.4.0 published to npm. Like its
  predecessor maps, this one is a catch-all for "whatever 2.4.0 ships" —
  fixed only by its own eventual stable cut-and-publish ticket, not
  chartered yet.
- **How this repo tracks its own work**: `docs/agents/issue-tracker.md`.
  The map and every ticket are entries in the `tickets` category — no
  `.scratch/` markdown files anymore (deleted by ticket 42; ADR 0018 covers
  the design).

## Where things actually stand (read this before trusting the tracker)

**A real process gap, found live this session**: another concurrent
session finished ticket 38 (Cut and Publish 2.4.0-rc2) for real — version
bumped, pushed straight to `main`, published to npm, tagged
`v2.4.0-rc2` — but never updated the ticket 38 entry in the tracker to
`resolved`, and the branch it worked from (`feat/2.4.0-rc2`) was a
*different, independently-diverged copy* of the same ticket range (32-42)
than the branch this session had been working from. Same logical work,
different commit hashes, because two sessions ran the same map's frontier
concurrently without either one rebasing onto the other. **The lesson**:
before trusting a ticket's `status` field or a map's "true frontier" note,
cross-check `git log origin/main` and `npm view @kovartravis/neuron
dist-tags` directly — the tracker can lag reality when sessions work in
parallel, exactly as the wayfinder skill warns.

**What actually happened to reconcile it** (this session): confirmed the
two branches' trees were byte-identical through ticket 42 (`git diff` empty
between the two tips at that point), cherry-picked this session's 6 unique
ticket commits (43, 44, header-fragment-fix, 45, 04, 05) onto
`origin/main`'s real tip on a fresh `feat/2.4.0-rc3` branch, re-bumped the
version to `2.4.0-rc3` (2.4.0-rc2 was already live on npm), split the
CHANGELOG into an accurate retroactive rc2 entry plus a real rc3 entry, and
re-ran the full suite clean before opening a PR.

**Current live state**:
- npm `rc` dist-tag: `2.4.0-rc2` (real, published 2026-08-13). This
  session's `feat/2.4.0-rc3` branch bumps to `2.4.0-rc3` and is in PR,
  not yet merged/published as of this doc.
- `main` has ticket work through 42 plus the `--where`/`--refs-satisfy`
  memory-list generalization. It does **not** yet have tickets 43, 44, 45,
  04, 05, or the header-fragment-fix — those land with this session's PR.
- Ticket 38 (Cut and Publish 2.4.0-rc2) is **still marked `claimed` in the
  tracker**, not `resolved` — the concurrent session's gap noted above.
  This session updated it with the real state rather than closing it
  outright, since rc2's own Scope items (maintainer go-ahead, live
  dist-tag verification) were satisfied by the other session, not this
  one. See the ticket's own Comments for the full reconciliation note.

## What shipped in 2.4.0 so far (rc1 → rc3)

Full detail is in [`CHANGELOG.md`](../../CHANGELOG.md) — this is a thematic
index, not a restatement:

- **Relevance quality**: a local ONNX cross-encoder reranker
  (`Xenova/ms-marco-MiniLM-L-6-v2`) second-stage-gates every recall
  candidate, cutting false-accept on the hardest out-of-corpus negatives
  from 99.80% to 19.4% (rc2). The measurement that surfaced the 99.80%
  number in the first place, and the resident `Pillar 13: Antagonistic
  Recall & Abstention` benchmark it's paired with, are both new this map.
- **Deterministic recall gets a third leg**: the git-log index (rc1,
  re-measured against the real semantic mechanism in rc2 — 0% failure,
  matching an oracle ceiling) and the `pre-command` hook (rc1, injecting
  context on every `Bash` call, not just per-turn) join session-start/
  pre-prompt recall.
- **This repo's own issue tracker moved into neuron itself** (ADR 0018,
  tickets 25/26/40/41/42): no more `.scratch/` markdown-per-effort files;
  every map and ticket is a `tickets`-category entry, with schema-agnostic
  `neuron memory get`/`list --where`/`--refs-satisfy` (rc2 base, sharpened
  in rc3) as the general-purpose CLI primitives that make it queryable.
- **`neuron status` grew real health/staleness signals**: `--health`/
  `--repair` (near-dup detection, rc1), `binaryVersionMismatch` and
  `protocolBlockDrift` finding kinds on `--check` (rc2) — all four now
  gated in this repo's own CI, not just available locally.
- **Real bugs found and fixed while touring the codebase for other
  work** (not the ticket that was being worked when found): concurrent
  markdown writes losing data (rc1), `neuron init` over-onboarding harnesses
  from a bare `.github/` dir (rc2), architecture-drift auto-rescan resolving
  the wrong project root (rc2), category auto-declare writing to an
  *ancestor* project's config (rc2), a SQLite migration race under
  concurrent process starts (rc3).

## What's genuinely still open

- **Ticket 38 itself**: the PR this session opened needs a maintainer
  merge decision — see the ticket's Scope for what "done" means (push to
  `main`, live npm/tag verification). Once merged, `feat/2.4.0-rc3` can be
  deleted.
- **No breadth-first re-grill has happened since 2026-08-10.** Every
  ticket chartered on this map is now resolved except 38 itself. The map's
  own standing instruction (see its Notes) is: once 38's cut settles,
  breadth-first grill for what else 2.4.0 should admit before a *stable*
  (non-rc) cut-and-publish ticket gets chartered. Don't assume the map is
  "done" just because its frontier is empty — it has never had that
  breadth-first pass.
- **Known, disclosed limitations, not bugs**: Cursor's recall adapter
  ships unverified against a real installation (maintainer has no Cursor
  access — see the README's compatibility table); the git-log index's
  token-usage improvement is directional, not a confirmed percentage (rc2's
  own noise-floor guard); the discovery-command hint's *outcome quality*
  (not just fire-rate) is still unmeasured.

## Suggested skills

- **`/wayfinder`** — to continue this map: pick up ticket 38, or (once it
  resolves) run the overdue breadth-first re-grill.
- **`neuron-memory`** (packaged skill, `.claude/skills/neuron-memory/`) —
  for how this repo's own agent-memory protocol works day to day.
- **`/domain-modeling`** / **`/grilling`** — the map's own Notes call these
  out for any HITL ticket on this map.
