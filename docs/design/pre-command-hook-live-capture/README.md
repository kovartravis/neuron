# Pre-command hook: live injection captures

Verbatim `system-reminder` blocks received inside a real Claude Code session
when its `PreToolUse` hook called `neuron hook claude-code pre-command`
(ticket 24, Map — neuron 2.4.0). They are the evidence that the `pre-command`
lifecycle point (`src/commands/hook.ts`) fires on a genuine `Bash` tool call,
matches this repo's own `neuron.yaml` `onExec` rules by command text, and
that Claude Code surfaces the resulting `additionalContext` to the model —
not just that `hook.test.ts` passes.

- [`capture-1.txt`](capture-1.txt) — a `git diff` / `cat` / `sed` command
  matching only the catch-all `".*"` → `learning` rule.
- [`capture-2.txt`](capture-2.txt) — `npm test`, matching the narrower
  `^(npm test|git commit)` rule, injecting a different set of entries and
  confirming rule selection is by real pattern match, not a fixed payload.

These files lived at the repo root under `tmp/` until 2.5.0; they moved here
so the directory name stops implying they are disposable scratch output.
