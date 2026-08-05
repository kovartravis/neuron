Type: task
Status: resolved
Blocked by: 12, 13, 14
Band: 2.2.0-rc3

# 15 — Cut and Publish 2.2.0-rc3

## Question

Is harness-enforced recall real on Claude Code, honest on Codex, and safe to put
in front of users' existing agent configs?

## Scope

1. Version bump to `2.2.0-rc3`.
2. CHANGELOG covering the adapter layer, the Claude Code and Codex adapters, and
   — stated prominently — that **`neuron init` now writes into harness config
   files**. This is the most surprising behaviour in the release; users must not
   discover it by finding edits in `.claude/settings.json`.
3. Document the protocol change: step 1 is gone on deterministic harnesses and
   why. Users with customised blocks need to know what happens on upgrade.
4. **Ship the deterministic-recall evidence from ticket `12`** in the release
   notes — recall working with the instruction removed. That claim is the release's
   headline, and it should rest on a demonstration rather than an assertion.
5. Report per-turn latency against the budget from `09`. Recall now runs on every
   turn; if the tax is material, say the number.
6. Verify the config-safety cases before publishing: pre-existing user hooks
   preserved, install idempotent, uninstall clean, projects with both `.claude/`
   and `.codex/` not double-injecting.
7. **Minimal disclosure (absorbed from the now-closed ticket `19` at this
   narrower scope, 2026-08-04):** `neuron init` reports, per detected harness,
   what it found / wired / the fidelity that yields, driven by each adapter's
   `verify()` rather than inferred from config-file contents. Add a two-row
   note to the README (Claude Code, Codex CLI — both `deterministic`) rather
   than a full compatibility matrix; the fuller matrix/remediation UX earns
   its cost once a `best-effort` harness ships (see
   [neuron-2.3.0](../neuron-2.3.0/map.md)).
8. Run `npm test` and `npm run test:e2e`.
9. Tag and publish under the `rc` dist-tag.

## Deliverables

- [x] `2.2.0-rc3` published under the `rc` dist-tag — **OUTSTANDING, owned by
      the maintainer**, matching `04`/`09`'s precedent. Everything else is
      committed, tagged `v2.2.0-rc3` and pushed. Run: `npm login && npm
      publish --tag rc`.
- [x] CHANGELOG flagging harness-config writes prominently
- [x] Protocol change documented, including the upgrade path
- [x] Deterministic-recall demonstration included in the notes
- [x] Per-turn latency reported against the rc2 budget
- [x] Config-safety cases verified
- [x] `neuron init` reports per-harness fidelity via `verify()`; README carries a two-row Claude Code/Codex disclosure note
- [x] Unit + E2E suites green (pre-existing failures only, see below)

## Answer

`v2.2.0-rc3` cut, verified, committed, tagged and pushed. **Not published to
npm** — deliberately left to the maintainer, same as `04` and `09`.

### What's actually on trunk since the rc2 tag (per `09`'s own warning)

`09`'s Answer flagged that the next cut ticket should check trunk, not the
nominal band list, since rc bands don't map to branches. Since `v2.2.0-rc2`,
trunk carries all of the rc3 band's tickets (`10`–`14`) **and** three rc5
tickets that landed first (`31`, `37`, `39`) — `31`'s content was already
sitting in `[Unreleased]` before this session started. **Ticket `41` (the
lexical relevance gate) is not on trunk** — verified directly:
`src/index.ts:534-535` still computes `score = 0.75 * normRrf + 0.25 *
normImp`, the exact formula `41` exists to remove. It's unclaimed, and
nothing in `15`'s own blocking list (`12`, `13`, `14`) required it — the
release band table lists it under rc3, but the cut ticket's precedent is to
document what shipped, not what was nominally planned. `39`'s config-surface
change (deprecating `minScore`) is on trunk and in this release's notes;
`41`'s gate logic is not, and ships whenever that ticket is worked next.

### Is it releasable? Yes — this is the release's headline claim, demonstrated live

**Deterministic recall with the instruction removed**, reproduced on a
scratch project (no prior `CLAUDE.md`/`AGENTS.md`): `neuron init --yes`
wired both Claude Code and Codex CLI hooks, wrote a `CLAUDE.md` whose
protocol block has no "query the store" step at all (confirmed by reading
the generated file), yet piping a bare `UserPromptSubmit` payload into
`neuron hook claude-code pre-prompt` returned the relevant memory entry as
`hookSpecificOutput.additionalContext` — recall that happened with zero
agent cooperation, sourced entirely from the hook.

**Config-safety, verified directly rather than assumed** (scope item 6):
- A hand-added `PostToolUse` hook, a second `SessionStart` matcher-group
  under a different command, and an unrelated top-level JSON key all
  survived `neuron init` byte-for-byte.
- Re-running `init` on an already-wired project reported every hook point
  and protocol file as `"unchanged"`/`"unchanged"` — idempotent, no
  rewrite-on-every-run.
- `--uninstall-hooks` removed exactly the 3 neuron-authored entries from
  `.claude/settings.json` (`removedCount: 3`) and left the user's own two
  hooks and the unrelated key untouched; Codex's hooks file, which held
  only neuron's entries, correctly ended up empty.
- Both `.claude/` and `.codex/` present on one project wired independently,
  each adapter writing only its own config file — no double-injection.

**Per-turn latency** (scope item 5): measured directly against
`v2.2.0-rc2`'s recorded budget (cold ~4.8s, warm p50 ~223ms/p95 ~229ms).
`neuron hook claude-code pre-prompt` against a populated store: cold 0.197s,
warm 0.198–0.199s across 3 runs — matches ticket `12`'s own measurement
(0.202–0.211s) and sits far inside Claude Code's 30s `UserPromptSubmit`
timeout. Recall running on every turn does not meaningfully change the
per-invocation cost; the rc2 baseline was dominated by process startup, not
by what the hook does once running.

### Found and fixed three real doc gaps while executing (matching `04`/`09`'s precedent)

- **`docs/COMMANDS.md`'s `neuron init` flag table was completely stale**: it
  documented a `--file`/`-f` flag that **no command in the CLI reads**
  (verified: zero references to `options.file` anywhere in `src/commands/`)
  and omitted all seven flags `11`–`13` actually added
  (`--yes`/`--no-hooks`/`--hook-target`/`--overwrite-hooks`/`--keep-hooks`/
  `--harness`/`--uninstall-hooks`). Rewrote the table and prose; left
  `--file`/`-f`'s dead parsing code itself untouched — a release-cut ticket
  documents what ships, removing genuinely-dead flag parsing is a separate,
  smaller cleanup this didn't block on. Also added a `neuron hook <harness>
  <point>` reference section, previously undocumented entirely.
- **`CONTEXT.md`'s `init` glossary entry** had the same `--file`/`-f` claim
  and predated the harness-hook work completely — didn't mention that
  `init` now writes into harness config files at all. Fixed, and added two
  new glossary entries (**harness adapter**, **protocol block**) for the
  module boundaries `11`–`14` introduced, since `CLAUDE.md` tells sessions
  to read `CONTEXT.md` before touching module boundaries and this one had
  none for the newest module in the tree.
- **README's "Not locked to one agent" bullet** described only the
  instruction-file fallback, predating this band's actual headline feature.
  Updated in place, plus a new two-row disclosure table per this ticket's
  own scope item 7 (absorbed from the closed `19`).

### Test results

**400/405 unit tests green** (43 files, 4 failing). The 4 failures
(`cli.test.ts`, `history.test.ts` ×2, `learn.test.ts`, `memory.test.ts`) are
[ticket `42`](42-isolate-cli-tests-from-real-store.md)'s already-tracked,
pre-existing issue — CLI tests that read/write this repo's real populated
`.neuron/` store instead of an isolated fixture, inherited from `31`'s
`md`-default flip, not introduced here. `memory.test.ts`'s failure
(`category enforcement > refuses to delete when --category does not match`)
is new to that list but matches the identical root cause and file-ownership
pattern `42` already describes — not touched by this ticket's changes.
**Running the suite pollutes `.neuron/{decisions,history,learning}.md` with
test-authored entries** (confirmed, then restored via `git checkout --`
before continuing) — this is `42`'s hazard, live and unfixed, worth noting
loudly since it means any session running `npm test` on this repo needs to
check `git status .neuron/` afterward.

**12/13 E2E pillars pass.** Pillar 8 (multi-process contention) drops 1 of
50 writes this run (vs. 3/50 on `09`'s run) — same class of pre-existing
SQLite write-lock contention, still under investigation by no open ticket;
noted rather than newly filed since it's flaky-but-known, not a regression.
Pillar 12 (enrichment non-regression) confirms delta 0.0 unaffected; Pillar
11 confirms centroid still beats model on this run's category A/B.

### Left for the maintainer

**Publish** (`npm login && npm publish --tag rc`) — same reason as `04` and
`09`: irreversible, and this session has no npm credentials to lose by
trying.

## Comments

- 2026-08-04: Claimed via `/wayfinder` work-through-the-map mode. Resolved
  same session — see Answer above.
