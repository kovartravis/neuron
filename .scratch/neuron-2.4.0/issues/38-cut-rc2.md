Type: task
Status: open
Blocked by: none
Band: 2.4.0-rc2

# 38 — Cut and Publish 2.4.0-rc2

## Question

Once more of this map's frontier has landed on `main` after `2.4.0-rc1`, is
trunk safe to cut and publish as `2.4.0-rc2`?

## Context

**Continued from [37 — Cut and Publish
2.4.0-rc1](37-cut-rc1.md).** Not blocked on it formally — matching
[neuron-2.3.0's own `34`](../../neuron-2.3.0/issues/34-cut-rc2.md), which
carried no `Blocked by` edge on its own rc1 predecessor either, since rc
cuts are maintainer-paced snapshots of whatever is real on trunk at the
time, not a dependency graph — but sequentially meaningless before `37`
lands, since there is nothing to diff against yet.

This map's frontier was unusually wide at charter time (`37`'s own Context
lists 13+ open or blocked tickets) and this ticket deliberately does **not**
pre-declare which of them it waits for — unlike
[neuron-2.2.0's `09`](../../neuron-2.2.0/issues/09-cut-rc2.md), whose rc2 was
blocked on four specific, already-known tickets. Here, which tickets have
landed by the time someone picks this up is genuinely unknown in advance
(this map has repeatedly resolved tickets out of number order and graduated
new ones mid-session — see map.md's own running frontier notes). **Audit
`git log v2.4.0-rc1..HEAD` directly at cut time**, per this map's own
established precedent (`37`, and before it `neuron-2.2.0`'s `09` /
`neuron-2.3.0`'s `34`), rather than assuming a nominal scope now.

By the time this ticket is worked, `37` will already have merged
`feat/2.4.0-rc1` to `main` and the automated `publish.yml` pipeline (see
`37`'s own Context for its shape) will already be proven live against a real
prerelease version — so this cut's own risk is lower than `37`'s: the
mechanism is known-good, only the diff content is new.

## Scope

1. Version bump `package.json` to `2.4.0-rc2`.
2. CHANGELOG entry audited from `git log v2.4.0-rc1..HEAD` directly — do not
   assume which tickets from `37`'s open list landed; check.
3. Run `npm test` and `npm run test:e2e`; disclose any pre-existing failures.
4. Get explicit maintainer go-ahead before pushing to `main` (still the real
   publish trigger, per `37`).
5. Push to `main` (by this point likely a direct push rather than a branch
   merge, since `37` already merged `feat/2.4.0-rc1`) — confirm the working
   branch's actual relationship to `main` at the time rather than assuming
   `37`'s fast-forward shape still applies.
6. Verify live: `npm view @kovartravis/neuron dist-tags` shows `rc:
   '2.4.0-rc2'`, `git ls-remote --tags origin` shows `v2.4.0-rc2`.

## Deliverables

- [ ] `2.4.0-rc2` version-bumped and committed
- [ ] CHANGELOG entry covering the real `v2.4.0-rc1..HEAD` diff
- [ ] Unit + E2E suites run, results disclosed
- [ ] Maintainer go-ahead obtained before the push to `main`
- [ ] Pushed to `main`
- [ ] `2.4.0-rc2` verified live on npm's `rc` dist-tag and `v2.4.0-rc2`
      verified on `origin`'s tags

## Answer

_Not yet resolved._

## Comments
