# Partial run — `memory` (discovery) arm, low effort — ABORTED, salvaged from console log

Run: `run-swebench-ab.mjs --k=4 --effort=low --cap=2.0` (default arms at the
time: `memory`,`control`). **Stopped deliberately after 4 sessions**, once the
maintainer pointed out that the `memory` arm models neuron-as-files (agent must
choose to read `.neuron/`) rather than neuron-as-installed (session-start hook
injection) — i.e. it was measuring the wrong mechanism, so continuing to spend
on it was not justified. No `results.json` was ever written; these four
sessions are transcribed from the still-live background task log and are the
complete record of them.

Cost: $0.1551. All 4 passed.

| session | turns | totalTokens |
| --- | --- | --- |
| `matplotlib-24265-seaborn-alias-memory-r0` | 5 | 25,160 |
| `matplotlib-24265-seaborn-alias-memory-r1` | 3 | 8,527 |
| `matplotlib-24265-seaborn-alias-memory-r2` | 3 | 8,292 |
| `matplotlib-24265-seaborn-alias-memory-r3` | 3 | 8,231 |

mean = 12,552 tokens (sd 8,344 — driven entirely by r0).

**Worth keeping** because it makes the headline comparison three-way rather
than two-way on `matplotlib-24265` at low effort: control 26,076 → discovery
12,552 → injection 6,933. Discovery does capture much of the benefit, but with
far higher variance (r0 spent 5 turns and 25,160 tokens, essentially a control
run — the agent did not consult the store early), which is exactly the failure
mode unconditional injection removes.
