Type: task
Status: unclaimed
Blocked by: 01, 02, 03
Band: 2.2.0-rc1

# 04 — Cut and Publish 2.2.0-rc1

## Question

Is the Tree-Sitter AST engine releasable, and what does the release say about
what changed for existing users?

## Scope

1. Version bump to `2.2.0-rc1`.
2. CHANGELOG section covering the AST engine, the grammar fetch added to
   `neuron init`, and — prominently — the **baseline migration** existing users
   face (ticket `03`).
3. Restore the wording that 2.1.0 deliberately walked back: `CONTEXT.md` entries
   for `TreeSitterScanner` and `Architectural Drift`, `README.md`, `SCAN_HELP`,
   and the accuracy caveat in `.claude/skills/neuron-memory/SKILL.md` may now
   describe real AST parsing again — **but only for the 9 languages ticket `02`
   actually covers.** The remaining extensions stay described as regex fidelity.
   Do not re-introduce the overstatement 2.1.0 corrected.
4. Mark ADR 0003 as implemented; land ADR 0008 from ticket `01`.
5. Run `npm test` and `npm run test:e2e`. Pillar 4 needs the fresh baseline from
   ticket `03`; Pillar 1 (Polyglot AST Traversal) is the one that should visibly
   improve.
6. Verify the packed tarball is still ~621 KB — if grammars leaked into `files`,
   ticket `01`'s central decision has been silently undone.
7. Tag and publish to npm under the `rc` dist-tag, not `latest`.
8. Refresh the architectural blueprint: `neuron scan --diff` then `neuron scan`.

## Deliverables

- [ ] `2.2.0-rc1` published under the `rc` dist-tag
- [ ] CHANGELOG with an explicit upgrade/re-baseline note
- [ ] Docs restored to describe AST parsing, scoped to the 9 supported languages
- [ ] ADR 0003 marked implemented; ADR 0008 landed
- [ ] Unit + E2E suites green; tarball size verified
- [ ] Blueprint card refreshed
