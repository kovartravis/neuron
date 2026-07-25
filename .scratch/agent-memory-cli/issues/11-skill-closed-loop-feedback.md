# 11 — Skill & Harness Closed-Loop Feedback Integration

**What to build:** Updated `.agents/skills/neuron-memory/SKILL.md` and `AGENTS.md` to instruct agents to perform pre-command memory lookups via `neuron exec` for critical shell tasks, and mandate failure-triggered learning capture (`neuron learn add "Fix for <error>: <solution>" --tags failure-fix,<topic> --importance 3`) immediately after investigating and resolving command/build errors.

**Blocked by:** 09 — `neuron exec` CLI Core & Stderr Banner

**Status:** resolved

- [x] Add Pre-Command Memory Lookup section to `.agents/skills/neuron-memory/SKILL.md`.
- [x] Add Failure-Triggered Learning Capture rules to `.agents/skills/neuron-memory/SKILL.md`.
- [x] Update `AGENTS.md` Memory Store section to reference closed-loop feedback rules.
