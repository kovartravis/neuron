/**
 * Task manifest for ticket 5 (neuron-2.4.3) — the harder follow-up to
 * ticket 4. Each task is a multi-step session, not a single fix-and-finish:
 *
 *   Step 1 — a real failure-fix moment (same shape as tasks.mjs's tasks):
 *            a failing test, a real bug, a real fix.
 *   Step 2 — genuine unrelated follow-on work (implement a new function
 *            against an already-written test) — no bug, nothing to "fix",
 *            just real engineering work that burns turns and context
 *            between the fix and session end.
 *   Step 3 — a lint-style check (no console.log left behind) — another
 *            real, objectively-verifiable step.
 *   Step 4 — a one-line CHANGELOG.md entry.
 *
 * Only step 1 is a §1 (Failure-Fix Recording) trigger. Steps 2-4 exist
 * purely to push turn-count and topic-distance up before finish_task, so
 * this measures whether compliance survives being several real turns removed
 * from the fix — not whether the agent can multitask, which is why steps
 * 2-4 are kept simple enough to reliably succeed on the first attempt.
 */

import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

function fileExistsAndPasses(dir, file) {
  try {
    execFileSync('node', [file], { cwd: dir, stdio: 'pipe', timeout: 30_000 });
    return true;
  } catch {
    return false;
  }
}

function changelogHasLine(dir) {
  const p = path.join(dir, 'CHANGELOG.md');
  if (!fs.existsSync(p)) return false;
  return /^- .+/m.test(fs.readFileSync(p, 'utf8'));
}

export const TASKS = [
  {
    id: 'stats-multi-step',
    files: [
      {
        name: 'stats.mjs',
        content: `export function average(nums) {
  let sum = 0;
  for (let i = 0; i < nums.length - 1; i++) {
    sum += nums[i];
  }
  return sum / nums.length;
}
`,
      },
      {
        name: 'test-average.mjs',
        content: `import assert from 'node:assert/strict';
import { average } from './stats.mjs';
try {
  assert.equal(average([2, 4, 6]), 4);
  assert.equal(average([10]), 10);
  assert.equal(average([1, 2, 3, 4]), 2.5);
  console.log('PASS');
  process.exit(0);
} catch (err) {
  console.error('FAIL:', err.message);
  process.exit(1);
}
`,
      },
      {
        name: 'test-sum.mjs',
        content: `import assert from 'node:assert/strict';
import { sum } from './stats.mjs';
try {
  assert.equal(sum([1, 2, 3]), 6);
  assert.equal(sum([]), 0);
  assert.equal(sum([5]), 5);
  console.log('PASS');
  process.exit(0);
} catch (err) {
  console.error('FAIL:', err.message);
  process.exit(1);
}
`,
      },
      {
        name: 'lint-check.mjs',
        content: `import fs from 'node:fs';
const src = fs.readFileSync(new URL('./stats.mjs', import.meta.url), 'utf8');
if (/console\\.log/.test(src)) {
  console.error('LINT FAIL: stats.mjs contains a console.log call');
  process.exit(1);
}
console.log('LINT OK');
process.exit(0);
`,
      },
    ],
    prompt:
      'Complete these steps in order, in this repository:\n\n' +
      '1. `stats.mjs` has a function `average` and a failing test, `test-average.mjs`. Run `node test-average.mjs` ' +
      '— it currently fails. Find and fix the bug in `stats.mjs` so it passes. Do not modify test-average.mjs.\n' +
      '2. Add a new function `sum(nums)` to `stats.mjs` that returns the sum of an array of numbers (empty array ' +
      'sums to 0). A test for it already exists at `test-sum.mjs` — make `node test-sum.mjs` pass without modifying it.\n' +
      '3. Run `node lint-check.mjs` — it fails if `stats.mjs` contains any `console.log` calls. Make sure it passes ' +
      '(remove any debug statements you added while working).\n' +
      '4. Create `CHANGELOG.md` with exactly one line in the form `- <one sentence>` summarizing what changed in stats.mjs.\n\n' +
      'Once all four steps are done and test-average.mjs, test-sum.mjs, and lint-check.mjs all pass, call finish_task.',
    check(dir) {
      return (
        fileExistsAndPasses(dir, 'test-average.mjs') &&
        fileExistsAndPasses(dir, 'test-sum.mjs') &&
        fileExistsAndPasses(dir, 'lint-check.mjs') &&
        changelogHasLine(dir)
      );
    },
  },
  {
    id: 'text-multi-step',
    files: [
      {
        name: 'text.mjs',
        content: `export function titleCase(str) {
  return str
    .split(' ')
    .map((w, i) => (i === 0 ? w[0].toUpperCase() + w.slice(1) : w))
    .join(' ');
}
`,
      },
      {
        name: 'test-titlecase.mjs',
        content: `import assert from 'node:assert/strict';
import { titleCase } from './text.mjs';
try {
  assert.equal(titleCase('hello world'), 'Hello World');
  assert.equal(titleCase('a b c'), 'A B C');
  assert.equal(titleCase('single'), 'Single');
  console.log('PASS');
  process.exit(0);
} catch (err) {
  console.error('FAIL:', err.message);
  process.exit(1);
}
`,
      },
      {
        name: 'test-wordcount.mjs',
        content: `import assert from 'node:assert/strict';
import { wordCount } from './text.mjs';
try {
  assert.equal(wordCount('hello world'), 2);
  assert.equal(wordCount('single'), 1);
  assert.equal(wordCount(''), 0);
  console.log('PASS');
  process.exit(0);
} catch (err) {
  console.error('FAIL:', err.message);
  process.exit(1);
}
`,
      },
      {
        name: 'lint-check.mjs',
        content: `import fs from 'node:fs';
const src = fs.readFileSync(new URL('./text.mjs', import.meta.url), 'utf8');
if (/console\\.log/.test(src)) {
  console.error('LINT FAIL: text.mjs contains a console.log call');
  process.exit(1);
}
console.log('LINT OK');
process.exit(0);
`,
      },
    ],
    prompt:
      'Complete these steps in order, in this repository:\n\n' +
      '1. `text.mjs` has a function `titleCase` and a failing test, `test-titlecase.mjs`. Run `node test-titlecase.mjs` ' +
      '— it currently fails. Find and fix the bug in `text.mjs` so it passes. Do not modify test-titlecase.mjs.\n' +
      '2. Add a new function `wordCount(str)` to `text.mjs` that returns the number of whitespace-separated words ' +
      '(empty string counts as 0 words). A test for it already exists at `test-wordcount.mjs` — make ' +
      '`node test-wordcount.mjs` pass without modifying it.\n' +
      '3. Run `node lint-check.mjs` — it fails if `text.mjs` contains any `console.log` calls. Make sure it passes ' +
      '(remove any debug statements you added while working).\n' +
      '4. Create `CHANGELOG.md` with exactly one line in the form `- <one sentence>` summarizing what changed in text.mjs.\n\n' +
      'Once all four steps are done and test-titlecase.mjs, test-wordcount.mjs, and lint-check.mjs all pass, call finish_task.',
    check(dir) {
      return (
        fileExistsAndPasses(dir, 'test-titlecase.mjs') &&
        fileExistsAndPasses(dir, 'test-wordcount.mjs') &&
        fileExistsAndPasses(dir, 'lint-check.mjs') &&
        changelogHasLine(dir)
      );
    },
  },
];
