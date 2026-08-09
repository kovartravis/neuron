Type: task
Status: unclaimed
Blocked by: none
Band: 2.3.0-rc2

# 34 — Cut and Publish 2.3.0-rc2

## Question

Is everything that landed on trunk since `v2.3.0-rc1` (2026-08-08) safe to
tag as a real, installable release candidate, and do the README, CHANGELOG,
and packaged `neuron-memory` skill accurately describe what it does — not
what the nominal ticket bands intended?

## Context

**Continued from `v2.3.0-rc1`**, cut 2026-08-08 right after ticket `01`
(Copilot CLI adapter, built not resolved). Fifteen commits have landed on
`feat/2.3.0` since then — real feature work, not just charter/docs commits:

- Ticket `02` — Cursor adapter (built, not resolved; real-install
  verification split into ticket `22`, still open)
- Tickets `05`/`06` — per-category storage path and mode overrides, `split`
  removed as its own mode (resolved, [ADR
  0016](../../../docs/adr/0016-per-category-storage-vocabulary.md) written)
- Tickets `11`/`25` — architecture card re-injected per epoch, fetched by
  stable id (resolved)
- Tickets `24`/`26`/`27` — architecture card A/B harness (built, not
  resolved — credential-blocked), LLM removed from card summarization,
  structural compression at injection time (resolved, though `27` was later
  **rejected by the maintainer** as not solving the real scaling problem —
  see the map's own note on 2026-08-08 — and superseded by tickets `28`-`30`,
  which have not landed yet)
- Ticket `13` — `neuron status --check`/`--repair` (resolved)
- Ticket `23` — test-isolation gap fix, no user-visible behavior change
- Ticket `31` — `neuron memory` list/query default ordering and limit fix
  (resolved this session)
- Tickets `14`/`19` — new A/B benchmark harnesses (git-log recall, SWE-bench
  synthetic fixtures), both built and dry-run-validated but **not run live**
  — no findings to publish yet

Per [neuron-2.2.0 ticket `09`'s own
precedent](../../neuron-2.2.0/issues/09-cut-rc2.md) (decision recorded
2026-08-02): there is no per-band branch in this workflow, so whatever is on
trunk when an `rc` tag is cut is what that tag ships, regardless of which
band a ticket was nominally filed under. **Audit trunk directly** (`git log
v2.3.0-rc1..HEAD`), not the map's band structure, when writing the
CHANGELOG.

**A real doc-drift instance already found while charting this ticket**:
`README.md`'s recall-fidelity section still reads "Cursor support is on the
roadmap" (line 102-103) even though ticket `02` shipped a working
`CursorAdapter` two commits after `rc1`. This is exactly the "claims must
match behavior" failure mode this whole map exists to eliminate, and it's
already live in the shipped `rc1` tag today. Fixing it honestly — Cursor is
real but `best-effort` and **not yet verified against a real installation**
(ticket `22` is open) — is this ticket's job, not ticket `03`'s (which owns
the fuller `neuron init` remediation UX and matrix rework; this ticket only
needs the fidelity table and prose to stop stating something false).

## Scope

1. Version bump to `2.3.0-rc2`.
2. **CHANGELOG entry covering everything actually on trunk since `rc1`**,
   audited from `git log v2.3.0-rc1..HEAD`, not assumed from ticket numbers:
   - Cursor adapter, stated as built and best-effort, **explicitly not yet
     verified against a real Cursor installation** — do not imply parity
     with the Copilot CLI row's own (already-shipped) disclosure.
   - Per-category storage path and mode overrides, `split` removed — with
     an explicit upgrade note: which old spellings (`vector-only`, `split`,
     `md-only`, `dual`) still parse, what they warn, and what a config
     carrying a previously-inert `categories.*.storage` value now does.
   - Architecture card: per-epoch re-injection, stable-id fetch, LLM
     removed from summarization, structural compression at injection time —
     **and note plainly that ticket `27`'s compression approach was
     rejected by the maintainer mid-band and is being replaced by tickets
     `28`-`30`** (not yet landed), so this isn't described as the final
     shape.
   - `neuron status --check`/`--repair` (ADR 0013's validation surface).
   - `neuron memory list`/`query` default ordering (now recency, not
     insertion order) and default limit (list mode now `20`, diverged from
     text-query mode's unchanged `5`) — a real, if minor, user-visible
     behavior change worth its own line, not folded silently into the
     status-command entry.
   - Do **not** claim benchmark findings from tickets `14`/`19` — neither
     has a live run yet.
3. **Fix the README's stale Cursor line** (currently "Cursor support is on
   the roadmap," README.md:102-103) to match ticket `02`'s actual shipped
   fidelity: best-effort, `session-start`/`context-reset` wired,
   `pre-prompt` unwired, not yet verified against a real install. Model the
   wording on the existing Copilot CLI row rather than inventing new
   framing.
4. **Audit `docs/COMMANDS.md`, `CONTEXT.md`, and the packaged
   `.claude/skills/neuron-memory/SKILL.md` against the same trunk diff.**
   `docs/COMMANDS.md`'s `neuron status` section already covers `13`
   (verify, don't assume). The skill has no `status --check`/`--repair`
   mention at all — decide whether the maintenance-workflow sections should
   gain one. Verify the skill's harness-hook skip-condition
   (`SKILL.md:256-261`, "as of 2.2.0: Claude Code, Codex CLI") is still
   accurate now that Copilot/Cursor exist but remain best-effort, not
   deterministic — update the wording if it reads as excluding them by
   omission rather than by design.
5. Run `npm test` and `npm run test:e2e`.
6. Tag `v2.3.0-rc2`, commit, push. **Do not run `npm publish`** — left to
   the maintainer, matching `rc1`'s own precedent and every prior `rc` cut
   on this and the 2.2.0 map (irreversible, no session credentials worth
   risking).

## Deliverables

- [ ] `2.3.0-rc2` version-bumped, committed, tagged `v2.3.0-rc2`, and pushed
- [ ] CHANGELOG entry covering the real trunk diff since `rc1`, with the
      Cursor/architecture-card caveats stated plainly
- [ ] README's stale "Cursor support is on the roadmap" line corrected
- [ ] `docs/COMMANDS.md` / `CONTEXT.md` / the packaged `neuron-memory` skill
      audited against the same diff, updated where stale
- [ ] Unit + E2E suites green
- [ ] `npm publish --tag rc` left explicitly to the maintainer, called out
      in the Answer
