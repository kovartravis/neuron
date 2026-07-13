	## Agent skills

### Issue tracker

Issues are tracked locally in markdown files under `.scratch/`. See `docs/agents/issue-tracker.md`.

### Triage labels

Using the default triage labels (`needs-triage`, `needs-info`, etc.). See `docs/agents/triage-labels.md`.

### Domain docs

Single-context repository layout. See `docs/agents/domain.md`.

## Memory Store

This repository uses `@kovartravis/neuron` (globally linked as the `neuron` command) to persist learnings and task history. Agents MUST interact with it at the start and end of every run.

### 1. Beginning of Run (Context Loading)
Before performing any task, the agent must query the memory store for relevant learnings, rules, or previous solutions:
```bash
neuron learn query "<query matching current task>"
```
Read the retrieved learnings and apply them as system rules/guidelines for the session.

### 2. End of Run (Memory Recording)
After completing a task, the agent must log the action to the history log:
```bash
neuron history add "<summary of what was built/fixed>" --tags <related-topics> [--task-id <id>]
```
If new learnings, rules, or conventions were established during the session, add them explicitly to the learnings store:
```bash
neuron learn add "<new rule/learning established>" --tags <topic>
```
