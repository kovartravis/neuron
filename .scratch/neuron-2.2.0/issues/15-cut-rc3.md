Type: task
Status: unclaimed
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
   and `AGENTS.md` not double-injecting.
7. Run `npm test` and `npm run test:e2e`.
8. Tag and publish under the `rc` dist-tag.

## Deliverables

- [ ] `2.2.0-rc3` published under the `rc` dist-tag
- [ ] CHANGELOG flagging harness-config writes prominently
- [ ] Protocol change documented, including the upgrade path
- [ ] Deterministic-recall demonstration included in the notes
- [ ] Per-turn latency reported against the rc2 budget
- [ ] Config-safety cases verified
- [ ] Unit + E2E suites green
