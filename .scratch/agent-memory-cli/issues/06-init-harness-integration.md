# 06 — `neuron init` Harness Integration

**Status:** `ready-for-agent`

## Problem Statement

When a developer runs `neuron init` in a new project, they get a `## Memory Store` block added to their `AGENTS.md` or `CLAUDE.md`, but:

1. The block contains a hardcoded `file://` path to the `neuron-memory` skill specific to the neuron project itself, making it useless in any other project.
2. The `neuron-memory` skill file is never copied into the target project, so the agent harness cannot load it.
3. Only two harnesses (`AGENTS.md` for Antigravity and `CLAUDE.md` for Claude) are accommodated. Copilot, Cursor, and Codex users get no first-class support.

The net result is that agents in harnesses other than Antigravity/Claude have no access to the structured `neuron-memory` skill instructions.

## Solution

Enhance `neuron init` to:

1. Update the `## Memory Store` block in the appropriate target file to reference the `neuron-memory` skill by name (not by path).
2. Auto-detect which agent harnesses are present by probing for their canonical directories in both the project root and the user home directory.
3. Copy the bundled `neuron-memory` skill folder into each detected harness's `skills/` directory. If no harness is detected, fall back to `.agents/skills/`.
4. Report all written/copied paths in the JSON output.

## User Stories

1. As a Cursor user, I want `neuron init` to copy the `neuron-memory` skill into `.cursor/skills/`, so that Cursor can load the skill instructions automatically.
2. As a Claude Code user, I want `neuron init` to copy the `neuron-memory` skill into `.claude/skills/`, so that Claude can invoke the skill without me locating the file manually.
3. As a GitHub Copilot user, I want `neuron init` to copy the `neuron-memory` skill into `.github/skills/`, so that Copilot discovers the skill at its expected location.
4. As a Codex user, I want `neuron init` to copy the `neuron-memory` skill into `.codex/skills/`, so that Codex can load the memory workflow instructions.
5. As an Antigravity user, I want `neuron init` to copy the `neuron-memory` skill into `.agents/skills/`, so that Antigravity can auto-load it.
6. As a developer using multiple harnesses in the same project, I want `neuron init` to copy the skill to all detected harness directories in one run, so that every active agent has the skill.
7. As a developer in a fresh project with no harness config yet, I want `neuron init` to fall back to `.agents/skills/neuron-memory/` when no harness is detected, so that I always get a usable default.
8. As a developer, I want `neuron init` to detect harnesses by checking both the project root and my home directory (`~`), so that globally-installed harnesses (e.g. `~/.cursor/`) are also recognised.
9. As a developer, I want the `## Memory Store` block to refer to the `neuron-memory` skill by name rather than a hardcoded file path, so that the block is portable across machines and operating systems.
10. As a developer, I want the `neuron init` JSON output to list every path that was written (target markdown file + each skill destination), so that I can confirm what was scaffolded.
11. As a developer running `neuron init` a second time, I want the skill file to be overwritten with the latest version from the installed package, so that the skill stays in sync with upgrades.
12. As a developer, I want `neuron init` to automatically detect the `CLAUDE.md` or `AGENTS.md` target file exactly as it does today, while also supporting the explicit `--file` flag, so that the harness target-file logic remains unchanged.

## Implementation Decisions

- **Harness directory map**: The five supported harnesses and their project-level skills paths are:

  | Harness        | Canonical base dirs to probe | Skills destination                    |
  |----------------|------------------------------|---------------------------------------|
  | Antigravity    | `.agents/`                   | `.agents/skills/neuron-memory/`       |
  | Claude Code    | `.claude/`                   | `.claude/skills/neuron-memory/`       |
  | Cursor         | `.cursor/`                   | `.cursor/skills/neuron-memory/`       |
  | GitHub Copilot | `.github/`                   | `.github/skills/neuron-memory/`       |
  | Codex          | `.codex/`                    | `.codex/skills/neuron-memory/`        |

- **Detection**: For each harness, check whether its canonical base directory exists in `process.cwd()` **or** `os.homedir()`. Both locations are checked; at least one match triggers inclusion.

- **Fallback**: If no harness base directory is found in either location, copy the skill to `.agents/skills/neuron-memory/SKILL.md` in the project root and create all parent directories.

- **Skill source**: The `neuron-memory/SKILL.md` file is bundled inside the published npm package under `.agents/skills/neuron-memory/SKILL.md`. The CLI reads it at runtime using a path resolved relative to `import.meta.url`, so it works whether the package is globally installed or locally linked.

- **Copy behaviour**: The CLI creates the destination directory (recursively) and copies `SKILL.md`. If the destination file already exists it is overwritten, so users always get the latest version after a package upgrade.

- **Updated Memory Store block**: The template written to `AGENTS.md` / `CLAUDE.md` changes to:

  ```markdown
  ## Memory Store

  This repository uses `@kovartravis/neuron` (globally linked as the `neuron` command) to persist learnings and task history.

  Agents MUST invoke and strictly follow the `neuron-memory` skill at the beginning of every run (for context loading), at the end of every run (for memory recording), and during periodic maintenance (for clean & refresh).
  ```

- **JSON output shape**: The existing `{ status, file, projectRoot }` response gains a `skillsWritten` array listing the absolute path of every `SKILL.md` that was written:

  ```json
  {
    "status": "initialized",
    "file": "AGENTS.md",
    "projectRoot": "/path/to/project",
    "skillsWritten": [
      "/path/to/project/.agents/skills/neuron-memory/SKILL.md",
      "/path/to/project/.claude/skills/neuron-memory/SKILL.md"
    ]
  }
  ```

- **Only `cli.ts` changes**: All logic is self-contained in the `init` branch of `cli.ts`. No changes to `index.ts` (the library) are required.

- **`package.json` `files` field**: The `.agents/skills/` directory must be added to the `files` array in `package.json` so it is included in the published tarball.

## Testing Decisions

- **What makes a good test**: Tests should assert observable external behaviour only — what files are written, what their contents contain, and what JSON is emitted to stdout. Implementation internals (which functions are called internally) must not be asserted.

- **Module under test**: `src/cli.ts` via `execSync`, following the same end-to-end pattern as the existing `init` test in `src/cli.test.ts`.

- **Test cases**:
  1. In a temp directory with a `.agents/` folder present, `neuron init` copies `SKILL.md` to `.agents/skills/neuron-memory/SKILL.md` and includes that path in `skillsWritten`.
  2. In a temp directory with `.claude/` and `.cursor/` both present, `neuron init` copies to both and both paths appear in `skillsWritten`.
  3. In a temp directory with no harness directories present, `neuron init` falls back to writing `.agents/skills/neuron-memory/SKILL.md`.
  4. Running `neuron init` twice in the same directory overwrites the skill file without error (idempotent).
  5. The written `AGENTS.md` contains the updated Memory Store block prose (no `file://` link, no bash snippets).

- **Prior art**: The existing `it('should support the init command …')` test in `src/cli.test.ts` creates a temp directory under `src/__tests__/temp/` and cleans up in `afterAll`. New tests follow the same pattern.

## Out of Scope

- Global (home directory) skill installation. Skills are always written to the project root.
- Auto-detection via environment variables (e.g. `CLAUDECODE`, `CURSOR_CLI`). Only directory presence is used.
- Harnesses beyond the five listed (e.g. Windsurf, Gemini CLI standalone).
- Modifying the `neuron-memory` skill content as part of this issue.
- Updating `README.md` to document the new harness scaffold behaviour.

## Further Notes

- The `CONTEXT.md` definition of `init` and `neuron-memory` should be updated to reflect the expanded behaviour once this issue is shipped.
- The `map.md` "Not yet specified" item — *Harness Integration Guidelines* — is resolved by this issue.
