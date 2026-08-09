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

const DEPENDENCIES = [
  '@anthropic-ai/sdk',
  '@huggingface/transformers',
  '@types/better-sqlite3',
  '@types/node',
  'env-paths',
  'onnxruntime-web',
  'tsx',
  'typescript',
  'vitest',
  'web-tree-sitter',
  'yaml',
  'zod',
];

// The scanner's own module-boundary judgment call, not derivable from a
// plain directory listing alone: e.g. `benchmarks/longmemeval` counts as its
// own module separate from `benchmarks`, and both `src/e2e` and `test/e2e`
// count as distinct modules sharing the name "e2e".
const SUBSYSTEM_PATHS = [
  'benchmarks',
  'benchmarks/longmemeval',
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
      const passed = matched >= 10; // 10 of 12
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
      const passed = matched >= 10; // 10 of 14
      return { passed, detail: `matched=${matched}/${SUBSYSTEM_PATHS.length}` };
    },
  },
];
