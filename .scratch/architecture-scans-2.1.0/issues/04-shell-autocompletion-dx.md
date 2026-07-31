Type: task
Status: unclaimed
Blocked by: none

# 04 — Shell Autocompletion & DX Enhancements (`2.1.0-rc5`)

## Goal

Add shell tab-completion, automated Termux post-build fixes, and system metadata feedback.

## Requirements

1. Implement `neuron completion <bash|zsh|fish>` in `src/commands/completion.ts` to generate shell tab-completion scripts.
2. Auto-complete subcommands (`init`, `exec`, `status`, `memory`, `learn`, `history`, `sync`, `ui`, `feedback`, `scan`, `completion`) and flags.
3. Update `package.json` build scripts so TypeScript compilation automatically runs `termux-fix-shebang dist/cli.js`.
4. Add `--sysinfo` flag to `neuron feedback` to append Node/OS/Storage metadata to generated GitHub issue links.
5. Add test coverage in `src/commands/completion.test.ts`.

## Deliverables

- [ ] `src/commands/completion.ts`
- [ ] `src/commands/completion.test.ts`
- [ ] Update `package.json` build scripts
- [ ] `package.json` version bump to `2.1.0-rc5`
