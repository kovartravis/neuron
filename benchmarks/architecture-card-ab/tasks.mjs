/**
 * Task manifest for ticket 24 (Architecture Card A/B).
 *
 * Both tasks ask for facts stated verbatim in the real captured architecture
 * card (captured-card.txt) — verified against this repo's actual current
 * structure, not stale content (ticket 25's own finding: the general
 * `decisions` log can be dated, but the scan-produced blueprint itself is
 * kept fresh by `autoRescanIfDriftDetected`). Grading is deterministic
 * substring/count matching against /ANSWER.md, never an LLM judge, matching
 * ticket 10's own discipline.
 */

// Real runtime `dependencies` only (package.json), matching the prompt's own
// "not devDependencies" instruction. Refreshed 2026-08-14 after a live run
// found the card's undifferentiated "Dependency Contract" section (all 12,
// prod+dev mixed) doesn't match that instruction: every session in both arms
// correctly excluded `@anthropic-ai/sdk`/`@types/better-sqlite3`/
// `@types/node`/`tsx`/`typescript`/`vitest` (real devDependencies) and was
// graded as a 6/12 failure for doing so — a grading-target bug, not a card
// or model failure. See ticket 05's own Answer for the archived before-fix
// run (results-pre-devdeps-fix.json).
const DEPENDENCIES = [
  '@huggingface/transformers',
  'env-paths',
  'onnxruntime-web',
  'web-tree-sitter',
  'yaml',
  'zod',
];

// The scanner's own module-boundary judgment call, not derivable from a
// plain directory listing alone: e.g. `benchmarks/longmemeval` counts as its
// own module separate from `benchmarks`, and both `src/e2e` and `test/e2e`
// count as distinct modules sharing the name "e2e". Refreshed 2026-08-14
// against the current captured card (16 subsystems, up from 14 when this
// ticket last touched it) — `benchmarks/reranker-gate` and
// `benchmarks/salvage-expansion` were added by tickets 28/29 since.
const SUBSYSTEM_PATHS = [
  'benchmarks',
  'benchmarks/longmemeval',
  'benchmarks/reranker-gate',
  'benchmarks/salvage-expansion',
  'src',
  'src/commands',
  'src/components',
  'src/config',
  'src/e2e',
  'src/harnesses',
  'src/models',
  'src/scanner',
  'src/shared',
  'src/storage',
  'src/ui',
  'test/e2e',
];

function countMatches(text, needles) {
  const lower = text.toLowerCase();
  return needles.filter(n => lower.includes(n.toLowerCase())).length;
}

export const TASKS = [
  {
    id: 'dependency-contract',
    prompt:
      "List every third-party npm package this project's architecture depends on " +
      '(its runtime dependency contract, not devDependencies). Write the full list to ' +
      '/ANSWER.md, one package per line, then call finish_task.',
    check(answerText) {
      const matched = countMatches(answerText, DEPENDENCIES);
      const passed = matched >= 5; // 5 of 6, same ~83% bar as the original 10-of-12
      return { passed, detail: `matched=${matched}/${DEPENDENCIES.length}` };
    },
  },
  {
    id: 'subsystem-inventory',
    prompt:
      'This repository is organized into a specific set of top-level architectural ' +
      "modules/subsystems, each with a directory path. List every one of this project's " +
      'primary modules with its directory path to /ANSWER.md, one per line, then call ' +
      'finish_task.',
    check(answerText) {
      const matched = countMatches(answerText, SUBSYSTEM_PATHS);
      const passed = matched >= 12; // 12 of 16, same ~4-miss allowance as the original 10-of-14 bar
      return { passed, detail: `matched=${matched}/${SUBSYSTEM_PATHS.length}` };
    },
  },
];
