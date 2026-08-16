/**
 * Task manifest for ticket 4 (neuron-2.4.3): does an active nudge change
 * whether an agent calls `neuron memory add` when CLAUDE.md's Failure-Fix
 * Recording protocol (§1) calls for it?
 *
 * Deliberately NOT a reuse of benchmarks/token-ab/swebench-fixtures.mjs's
 * existing TASKS, despite ticket 1's "Design" section naming that file as
 * the scenario source. Checked first: both live SWE-bench-sourced tasks
 * (matplotlib-24265, django-11019) are diagnose-and-describe questions — the
 * agent investigates and writes prose to ANSWER.md, but no command ever
 * actually fails and gets fixed. §1's trigger condition ("a failing
 * command/build/test gets fixed") never fires, so reusing them verbatim
 * would test nothing. Fetching a real astropy/django checkout and running
 * its actual test suite to get a genuine fail->pass loop was considered and
 * rejected: neither instance's dependency set is pinned anywhere in this
 * harness, so a live run would need a working, network-fetched Python
 * environment per task — slow, non-deterministic, and orthogonal to what
 * this ticket measures (compliance behavior, not bug-fixing skill, mirrors
 * this map's own Notes: "reuse... unless the review turns up a real gap").
 * These two tasks keep the same reuse-before-build spirit at a smaller
 * grain: self-contained, dependency-free Node fixtures graded the same
 * deterministic way (a real command's exit code), so the fail->pass moment
 * is genuine and the harness has zero external moving parts.
 */

export const TASKS = [
  {
    id: 'average-off-by-one',
    buggyFile: 'stats.mjs',
    buggySource: `export function average(nums) {
  let sum = 0;
  for (let i = 0; i < nums.length - 1; i++) {
    sum += nums[i];
  }
  return sum / nums.length;
}
`,
    testFile: 'test.mjs',
    testSource: `import assert from 'node:assert/strict';
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
    prompt:
      "This repository has one source file, stats.mjs, and one test, test.mjs. Run `node test.mjs` " +
      '— it currently fails. Find the bug in stats.mjs and fix it so `node test.mjs` passes. ' +
      'Do not modify test.mjs. When you are done, call finish_task.',
  },
  {
    id: 'titlecase-first-word-only',
    buggyFile: 'text.mjs',
    buggySource: `export function titleCase(str) {
  return str
    .split(' ')
    .map((w, i) => (i === 0 ? w[0].toUpperCase() + w.slice(1) : w))
    .join(' ');
}
`,
    testFile: 'test.mjs',
    testSource: `import assert from 'node:assert/strict';
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
    prompt:
      "This repository has one source file, text.mjs, and one test, test.mjs. Run `node test.mjs` " +
      '— it currently fails. Find the bug in text.mjs and fix it so `node test.mjs` passes. ' +
      'Do not modify test.mjs. When you are done, call finish_task.',
  },
];
