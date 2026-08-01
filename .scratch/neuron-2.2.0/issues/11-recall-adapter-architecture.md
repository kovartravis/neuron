Type: grilling
Status: unclaimed
Blocked by: 09, 10
Band: 2.2.0-rc3

# 11 — Recall Adapter Architecture

## Question

What is the interface between neuron and a harness, such that five backends with
genuinely unequal capabilities can sit behind it without the abstraction lying
about what any of them does?

## Context

Ticket `10` establishes what each harness can do. This ticket decides the shape
that accommodates them.

The central design hazard: an abstraction that makes all five look alike will
hide that some are deterministic and some are best-effort. That is precisely the
unreliability 2.2.0 exists to eliminate. **Capability must be a first-class part
of the interface**, not a footnote — ticket `19` has to report it to the user, and
per settled decision the `CLAUDE.md` protocol changes *differently* depending on
whether a given harness enforces recall.

## Decisions this ticket must resolve

1. **The adapter interface.** What does a harness adapter implement — detect,
   install, uninstall, verify, report-capability? What does `install` mean for a
   harness with no hook surface (answer: write the `AGENTS.md` fallback)?
2. **Capability model.** Is fidelity an enum (`deterministic` / `best-effort` /
   `instruction-only`), or per-lifecycle-point (a harness might do deterministic
   session-start but not pre-prompt)? The latter is more truthful and more complex.
3. **What gets injected, and when.** Session start seeds the blueprint card once;
   pre-prompt injects query results per turn. Are both always on? Configurable in
   `neuron.yaml`?
4. **Payload budget.** The hard one. The PersonaMem run retrieved 28k tokens
   successfully and the *large* model then over-reasoned on it. Auto-injecting on
   every turn makes this worse, not better. Decide the token ceiling, the
   relevance floor, and the truncation strategy. Ticket `09` supplies the measured
   query latency this must fit inside.
5. **Detection vs. consent.** `neuron init` writing into `.claude/settings.json`
   or `~/.codex/config.toml` modifies files the user did not ask it to touch. Is
   that opt-in, opt-out, or prompted? What about uninstall?
6. **Multi-harness projects.** A repo may have both `.claude/` and `AGENTS.md`.
   Do all detected harnesses get wired, or only a chosen one?
7. **Idempotency and upgrades.** Re-running `neuron init`, or a neuron upgrade
   that changes the hook command, must not duplicate or orphan hook entries.
8. **Existing-config safety.** Users have their own hooks. Merging into their
   config without clobbering it is a hard requirement — and a likely source of
   the worst bug in this release.

## Deliverables

- [ ] ADR recording the adapter interface and capability model
- [ ] Payload budget: token ceiling, relevance floor, truncation strategy
- [ ] Consent/opt-in policy for writing harness config, plus an uninstall path
- [ ] Multi-harness resolution rule
- [ ] Idempotency + config-merge safety requirements for `12`–`13` and `16`–`18`

## Comments

- 2026-07-31: Decision ticket — resolve with `/grilling` and `/domain-modeling`
  before any adapter is built. `12` and `13` are the two implementations that
  test whether this interface survives contact.
