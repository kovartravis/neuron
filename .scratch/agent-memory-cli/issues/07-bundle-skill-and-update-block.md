# 07 — Bundle skill file and update Memory Store block

**What to build:** Ship the `neuron-memory` SKILL.md file inside the published npm package and replace the current hardcoded Memory Store block template with clean prose that references the skill by name only.

A developer running `neuron init` after this ticket will see a portable Memory Store block with no bash snippets and no `file://` link. The SKILL.md file will be present in the npm tarball so subsequent tickets can copy it into target projects.

**Blocked by:** None — can start immediately

**Status:** done

- [x] `.agents/skills/` is added to the `files` array in `package.json`
- [x] The `MEMORY_STORE_BLOCK` constant in `cli.ts` is replaced with the prose-only template:
  ```
  ## Memory Store

  This repository uses `@kovartravis/neuron` (globally linked as the `neuron` command) to persist learnings and task history.

  Agents MUST invoke and strictly follow the `neuron-memory` skill at the beginning of every run (for context loading), at the end of every run (for memory recording), and during periodic maintenance (for clean & refresh).
  ```
- [x] The existing init test that asserts the block contains `neuron learn query` is updated to assert the new prose text instead
- [x] All existing tests pass
