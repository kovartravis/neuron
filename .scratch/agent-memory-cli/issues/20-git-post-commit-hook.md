# 20 — Automated Git Post-Commit Hook Integration

**What to build:** Add a `neuron init --git-hooks` flag that automatically installs a lightweight `.git/hooks/post-commit` script into the project repository. The hook will passively log every commit message and list of modified files directly to `neuron history` in the background after every commit.

**Blocked by:** 06 — Init Harness Integration, 08 — Harness Auto-Detection

**Status:** todo

- [ ] Add `--git-hooks` flag to `handleInitCommand` in `src/commands/init.ts`.
- [ ] Create `.git/hooks/post-commit` script that runs `neuron history add "$(git log -1 --pretty=%B)" --tags git,auto &` in background.
- [ ] Ensure hook installation is idempotent and does not overwrite existing custom post-commit hooks without user confirmation.
- [ ] Add unit tests verifying `neuron init --git-hooks` installs and permissions the hook.
