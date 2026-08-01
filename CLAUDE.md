# AGENT OPERATING MANUAL

> [!CRITICAL]
> **MANDATORY MEMORY STORE PROTOCOL (`@kovartravis/neuron`)**
> You MUST follow this 4-step memory loop on EVERY task. Failure to execute these steps is an unacceptable protocol violation.
> Memory store categories configured in `neuron.yaml`: `learning` (rules & fixes), `history` (task logs), `decisions` (ADRs & design choices). Architecture scan settings: `enabled: true`, category: `decisions`, depth: `3`.

## 1. FIRST ACTION (Mandatory Step 1)
BEFORE viewing files, editing code, or taking any action, your VERY FIRST tool call MUST be to query the memory store for context:
```bash
neuron memory query "<task topic or goal>" --categories learning,decisions
# Omit --categories to search every category:
neuron memory query "<task topic or goal>"
```
*If no results return, try a broader keyword (`git`, `tdd`, `db`, etc.).*

> `neuron learn` and `neuron history` are deprecated as of 2.1.0. They still
> work, but they warn on `stderr` and delegate to `neuron memory --category`.

## 2. COMMAND EXECUTION (Mandatory Step 2)
NEVER run raw shell commands for builds, tests, or git operations directly. You MUST wrap them with `neuron exec`:
```bash
neuron exec -- <command>
```
*Example:* `neuron exec -- npm test` or `neuron exec -- git commit`

## 3. FAILURE-FIX RECORDING (Mandatory Step 3)
Whenever a command, build, or test fails and you fix it, you MUST immediately record the resolution before moving on. Entries MUST be comprehensive, multi-sentence explanations (at least 3-4 sentences) covering context, root cause, exact resolution, and any edge cases—do NOT write brief 1-sentence summaries:
```bash
neuron memory add --category learning "Fix for <error>: <context & symptom>. <verified root cause>. <exact resolution steps & code/command example>." --tags failure-fix,<topic> --importance 4
```

## 4. SESSION CONCLUSION (Mandatory Step 4)
NEVER finish your turn or declare a task complete without logging the history entry and recording any new learnings or decisions as detailed multi-sentence entries (3-4 sentences minimum):
```bash
neuron memory add --category history "<detailed summary of work completed>" --tags <topic> --task-id <ticket-id>
# For architectural decisions / ADRs:
neuron memory add --category decisions "<ADR / design choice rationale and details>" --tags adr,<topic>
```

If the task changed module boundaries, added/removed a subsystem, or changed a
public export contract, also refresh the architectural blueprint:
```bash
neuron exec -- neuron scan --diff   # review what moved
neuron exec -- neuron scan          # upsert the blueprint card
```

---

## Agent Skills & Domain Docs
- **Issue Tracker**: Markdown tickets under `.scratch/`. See `docs/agents/issue-tracker.md`.
- **Domain Docs**: Read `CONTEXT.md` and relevant `docs/adr/*.md` before modifying module boundaries. See `docs/agents/domain.md`.

