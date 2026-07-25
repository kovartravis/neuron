	## Agent skills

### Issue tracker

Issues are tracked locally in markdown files under `.scratch/`. See `docs/agents/issue-tracker.md`.

### Triage labels

Using the default triage labels (`needs-triage`, `needs-info`, etc.). See `docs/agents/triage-labels.md`.

### Domain docs

Single-context repository layout. See `docs/agents/domain.md`.

## Memory Store

This repository uses `@kovartravis/neuron` (globally linked as the `neuron` command) to persist learnings and task history.

Agents MUST invoke and strictly follow the `neuron-memory` skill at the beginning of every run (for context loading), before executing critical shell commands via `neuron exec` (for pre-command lookup), after resolving failures (for closed-loop learning capture), at the end of every run (for memory recording), and during periodic maintenance (for clean & refresh).

