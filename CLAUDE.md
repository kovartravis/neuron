# AGENT OPERATING MANUAL

<!-- neuron:protocol:start -->
## Memory Store Protocol (`@kovartravis/neuron`)

Follow this loop when working in this project. Memory categories configured in `neuron.yaml`: `learning`, `decisions`, `architecture`, `tickets`, `git-notes`. Architecture scan settings: enabled: true, category: `architecture`, depth: 3.

## 1. Failure-Fix Recording

When a failing command/build/test gets fixed, record it before moving on. Write 3-4 sentences: context/symptom, root cause, exact resolution (with a command/code example), any edge cases:
```bash
neuron memory add --category learning "Fix for <error>: <context & symptom>. <verified root cause>. <exact resolution steps & code/command example>." --importance 4
```

## 2. Session Conclusion

Before finishing, write a `decisions`/`learning` entry if this session made an architectural choice, or fixed something reusable:
```bash
# ADRs / design choices, or a new rule/failure-fix:
neuron memory add --category decisions "<rationale and details>" --task-id <ticket-id>
neuron memory add --category learning "<rule or fix, 3-4 sentences>" --task-id <ticket-id>
```
If nothing was decided — pure execution — there's nothing else to log.

If module boundaries, subsystems, or a public export contract changed, also refresh the blueprint:
```bash
neuron exec -- neuron scan --diff   # review what moved
neuron exec -- neuron scan          # upsert the blueprint card
```

### Metadata flags

- `--tags`: omit — write-side enrichment infers tags from the store's vocabulary, which converges it; hand-written tags widen it instead.
- `--importance`: omit defaults to `3`, `neuron memory prune`'s default ceiling — anything left at 3 is prune-eligible past `--days`. Pass `4` or `5` to survive a prune.
- `--category`: always pass — omitting it can cost a model load or hard-fail the write.
<!-- neuron:protocol:end -->

---

## Agent Skills & Domain Docs
- **Issue Tracker**: Tickets live in neuron's own `tickets` category (ADR 0018). See `docs/agents/issue-tracker.md`.
- **Domain Docs**: Read `CONTEXT.md` and relevant `docs/adr/*.md` before modifying module boundaries. See `docs/agents/domain.md`.
