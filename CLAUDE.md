# AGENT OPERATING MANUAL

<!-- neuron:protocol:start -->
## Memory Store Protocol (`@kovartravis/neuron`)

Follow this loop when working in this project. Memory categories configured in `neuron.yaml`: `learning`, `history`, `decisions`. Architecture scan settings: enabled: true, category: `decisions`, depth: 3.

## 1. Command Execution

Never run raw shell commands for builds, tests, or git operations directly. Wrap them with `neuron exec`:
```bash
neuron exec -- <command>
```
*Example:* `neuron exec -- npm test` or `neuron exec -- git commit`

## 2. Failure-Fix Recording

Whenever a command, build, or test fails and you fix it, record the resolution before moving on. Entries must be comprehensive, multi-sentence explanations (at least 3-4 sentences) covering context, root cause, exact resolution, and any edge cases:
```bash
neuron memory add --category learning "Fix for <error>: <context & symptom>. <verified root cause>. <exact resolution steps & code/command example>." --importance 4
```

## 3. Session Conclusion

Before finishing your turn, log the history entry and record any new learnings or decisions as detailed multi-sentence entries (3-4 sentences minimum):
```bash
neuron memory add --category history "<detailed summary of work completed>" --task-id <ticket-id>
# For architectural decisions / ADRs:
neuron memory add --category decisions "<ADR / design choice rationale and details>"
```

If the task changed module boundaries, added/removed a subsystem, or changed a public export contract, also refresh the architectural blueprint:
```bash
neuron exec -- neuron scan --diff   # review what moved
neuron exec -- neuron scan          # upsert the blueprint card
```

### On the metadata flags

`--tags` is optional — write-side enrichment fills it in from the vocabulary already in the store when it is omitted, which converges the vocabulary; hand-written tags widen it instead. Prefer omitting `--tags`.

`--importance` is optional too, but it is never inferred. An omitted `--importance` is stored as the default `3`, which is also `neuron memory prune`'s default ceiling — every entry written without `--importance` becomes prune-eligible once past `--days`. Pass `--importance 4` or `5` on anything that must survive a prune.

`--category` is also optional, but keep passing it — it is the only field whose omission can cost a model load or hard-fail the write.
<!-- neuron:protocol:end -->

---

## Agent Skills & Domain Docs
- **Issue Tracker**: Markdown tickets under `.scratch/`. See `docs/agents/issue-tracker.md`.
- **Domain Docs**: Read `CONTEXT.md` and relevant `docs/adr/*.md` before modifying module boundaries. See `docs/agents/domain.md`.
