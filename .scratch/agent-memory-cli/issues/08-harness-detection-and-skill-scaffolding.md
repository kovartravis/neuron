# 08 — Harness auto-detection and skill scaffolding

**What to build:** Make `neuron init` detect which agent harnesses are present and copy the bundled `neuron-memory` SKILL.md into each one's skills directory. If no harness is found, fall back to `.agents/skills/`. Report all written paths in the JSON output.

A developer running `neuron init` in a project that has (for example) `.claude/` and `.cursor/` directories will find `SKILL.md` copied into both `.claude/skills/neuron-memory/` and `.cursor/skills/neuron-memory/`, with both paths listed in the `skillsWritten` array of the JSON response.

**Blocked by:** 07 — Bundle skill file and update Memory Store block

**Status:** done

- [x] The `init` branch of `cli.ts` probes for each of the five harness base dirs (`.agents/`, `.claude/`, `.cursor/`, `.github/`, `.codex/`) in both `process.cwd()` and `os.homedir()`
- [x] For every detected harness, the bundled `SKILL.md` (resolved relative to `import.meta.url`) is copied into `<projectDir>/<harness>/skills/neuron-memory/SKILL.md`, creating parent dirs as needed
- [x] If no harness dir is found in either location, the skill is copied to `<projectDir>/.agents/skills/neuron-memory/SKILL.md`
- [x] Copying is always overwrite — running `neuron init` twice does not error
- [x] The JSON output shape gains a `skillsWritten` array of absolute paths:
  `{ status, file, projectRoot, skillsWritten: string[] }`
- [x] Test: in a temp dir with `.agents/` present, `SKILL.md` lands in `.agents/skills/neuron-memory/` and its path is in `skillsWritten`
- [x] Test: in a temp dir with `.claude/` and `.cursor/` present, both destinations are written and both appear in `skillsWritten`
- [x] Test: in a temp dir with no harness dirs, fallback writes to `.agents/skills/neuron-memory/`
- [x] Test: running `neuron init` twice in the same dir succeeds (idempotent overwrite)
- [x] All existing tests still pass
