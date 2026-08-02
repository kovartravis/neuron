Type: task
Status: deferred — maintainer decision 2026-08-01, do not implement
Blocked by: none
Band: 2.2.0-rc2
Priority: ~~high~~ — deferred by the maintainer on 2026-08-01

> [!IMPORTANT]
> **Do not implement.** The maintainer pushed this ticket off on 2026-08-01,
> after ticket `24` removed automatic pruning from 2.2.0. The header below still
> reads "ships regardless of ticket `24`'s verdict" — that was the pre-`24`
> position and it is **superseded**.
>
> The live hazard in "The hazard" section is **still real and still unfixed**:
> default importance `3`, default `maxPruneImportance` `3`, inclusive
> comparison, so a bare `neuron memory prune` remains destructive from
> **2026-08-10**. Deferring the ticket does not defer the hazard.
>
> *Rationale for the deferral is not yet recorded here — see the postmortem
> below.*

## Why this ticket was almost re-implemented by mistake

A fresh session on 2026-08-01 read this map, found `25` unblocked and marked
"the highest-value thing on the frontier", and claimed it — because **every
durable artifact said to**. The deferral existed only in the maintainer's head
and in the harness's own scratch memory, never in `neuron` and never in this
file. A correctly-executed `neuron memory query` returned the ticket-`23` ADR at
score `0.976` and the ticket-`24` verdict, **both of which say `25` ships**.

The lesson is a write-side one: protocol step 4 records what the *agent did*,
and nothing records what the *maintainer decided* — least of all a decision that
reverses a planned ticket. Recorded in the store as a `learning` entry.

# 25 — Per-Category Prune Config, the Importance Collision Fix, and the Setup Skill

## Question

What does per-category prune configuration look like in `neuron.yaml`, how does
the default-importance / default-threshold collision get closed, and how does a
user ever learn the feature exists?

## Why this is separate from ticket `24`

`24` decides whether *automatic* pruning ships. This ticket ships **whatever
`24` concludes**, because it fixes a hazard that exists today with no model and
no new feature involved. It is therefore **unblocked immediately** and should
not wait on the A/B.

## The hazard

`src/index.ts:984-991` deletes on `category = 'history' AND created_at < ? AND
importance <= ?`. Default entry importance is `3`; default `maxPruneImportance`
is `3` (`src/commands/memory.ts:110-112`); the comparison is inclusive. The
`CLAUDE.md` step-4 protocol passes no `--importance`, so **155 of this project's
157 history entries sit at 3** and a bare `neuron memory prune` deletes
essentially all of them once they pass 30 days. The earliest cross that line on
**2026-08-10**. There is no undo.

The hardcoded `category = 'history'` is currently the only thing protecting the
**9 `decisions` entries at importance 3** — ADRs. So configurability removes an
accidental safeguard: **this ticket's two halves must ship together or not at
all.**

## Scope

1. **Per-category config**, extending `CategoryConfigSchema`
   (`src/config/neuronYaml.ts:19-23`):
   ```yaml
   categories:
     history:
       defaultImportance: 2      # applied when --importance is omitted
       prune:                    # omit the block and nothing is ever deleted
         after: 30d
         maxImportance: 2
   ```
   **Absent `prune` block means never pruned.** No existing `neuron.yaml` has
   one, so no upgrade can delete anything — that is the whole migration story.
2. **Retire** `pruneHistoryBeforeDays` / `maxPruneImportance` from
   `MaintenancePolicy` (`src/models/maintenance.ts`) in favour of the resolved
   per-category policy; keep `neuron memory prune` working.
3. **The lazy trigger** — pruning runs off the back of `neuron memory query`,
   guarded by a `last_prune_check_at` key in `meta` with a 24h skip, so the
   common path costs one indexed lookup rather than a count per read. Precedent:
   `drainEnrichmentIfPending` (`src/index.ts:694`).
   **Gate this on ticket `24`'s verdict** — if `24` returns a double null, ship
   items 1, 2 and 4 only, and pruning stays a manual command.
4. **The `neuron-memory` skill becomes the one-stop setup shop.** It is where
   pruning is explained and configured, alongside the rest of `neuron.yaml`
   setup. A user must be able to discover and configure this feature without
   reading source.

## Decisions already made — do not relitigate

Hard `DELETE`, no undo, no soft-delete column, no reuse of ticket `08`'s
supersession. Opt-in only, no defaults-on upgrade prompt. No usage-based gate —
rejected because it punishes the rare-but-critical failure fix. Full rationale
and the rejected-alternatives list are in
[`.scratch/configurable-pruning/ab-test-plan.md`](../../configurable-pruning/ab-test-plan.md) §2 and §7.

## Notes

- Takes a bite out of the map's fog patch *"Restructuring the packaged
  `neuron-memory` skill"*; the remainder still hangs on ticket `14`.
- `neuron init` should scaffold the `prune` block **commented out**, so it is
  discoverable without being armed.
