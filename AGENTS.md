# AGENT OPERATING MANUAL

> [!CRITICAL]
> **MANDATORY MEMORY STORE PROTOCOL (`@kovartravis/neuron`)**
> You MUST follow this 4-step memory loop on EVERY task. Failure to execute these steps is an unacceptable protocol violation.

## 1. FIRST ACTION (Mandatory Step 1)
BEFORE viewing files, editing code, or taking any action, your VERY FIRST tool call MUST be to query the memory store for context:
```bash
neuron learn query "<task topic or goal>"
```
*If no results return, try a broader keyword (`git`, `tdd`, `db`, etc.).*

## 2. COMMAND EXECUTION (Mandatory Step 2)
NEVER run raw shell commands for builds, tests, or git operations directly. You MUST wrap them with `neuron exec`:
```bash
neuron exec -- <command>
```
*Example:* `neuron exec -- npm test` or `neuron exec -- git commit`

## 3. FAILURE-FIX RECORDING (Mandatory Step 3)
Whenever a command, build, or test fails and you fix it, you MUST immediately record the resolution before moving on:
```bash
neuron learn add "Fix for <error>: <verified root cause and fix>" --tags failure-fix,<topic> --importance 4
```

## 4. SESSION CONCLUSION (Mandatory Step 4)
NEVER finish your turn or declare a task complete without logging the history entry:
```bash
neuron history add "<summary of work completed>" --tags <topic> --task-id <ticket-id>
```

---

## Agent Skills & Domain Docs
- **Issue Tracker**: Markdown tickets under `.scratch/`. See `docs/agents/issue-tracker.md`.
- **Domain Docs**: Read `CONTEXT.md` and relevant `docs/adr/*.md` before modifying module boundaries. See `docs/agents/domain.md`.
