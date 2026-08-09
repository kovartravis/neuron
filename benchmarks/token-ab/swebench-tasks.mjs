/**
 * Task manifest for ticket 19 (Run the Counterfactual A/B on Synthetic
 * Repos with Synthetic Memory Sets), sourced from real SWE-bench Lite
 * instances (see swebench-instances.mjs) rather than a hand-authored fake
 * repo, per the ticket's grilled Scope item 2.
 *
 * Each `prompt` is deliberately stripped to symptom-level: it describes
 * what's observably wrong, never the root cause, the fix location, or the
 * function name that needs to change. That's the whole point of this
 * ticket - ticket 10's own confound was a control-arm repeat finding the
 * answer already documented outside the memory store, and a prompt that
 * leaks the diagnosis would reproduce the same problem inside this new
 * harness. `sourceNotes` records, per task, what was verified by hand
 * against the real GitHub issue text before trusting it as symptom-only.
 *
 * `memoryEntry` is the fabricated "prior fix recorded" note the memory arm
 * gets under .neuron/learning.md - written in the same
 * symptom/root-cause/resolution shape CLAUDE.md's own Failure-Fix
 * Recording protocol asks real sessions to write, so this is a direct test
 * of whether having that record actually helps rather than a proxy for it.
 *
 * Grading is a deterministic keyword check against /ANSWER.md, same
 * grading.mjs machinery ticket 10/14 already use - no LLM judge, no
 * execution of the real SWE-bench test suite (Scope item: "we don't need
 * to run the real SWE-bench harness, just borrow its scenarios").
 */

import { containsAny, hasUnnegatedKeyword } from './grading.mjs';
import { SWEBENCH_INSTANCES } from './swebench-instances.mjs';

// Filler/distractor entries in the same shape as the real payload, so the
// memory arm's .neuron/learning.md isn't a single giveaway line - the agent
// still has to find the relevant entry among a few, matching how a real
// store looks (Scope item 3: "written in the same shape real entries
// take").
export const FILLER_LEARNING_ENTRIES = [
  'Fix for flaky CI on macOS runners: tests intermittently timed out during ' +
    'the dependency-install step. Root cause was an unpinned resolver hitting ' +
    'a slow mirror. Resolution: pin the package index mirror in CI config and ' +
    'add a 120s install timeout with one retry.',
  'Fix for inconsistent date formatting in exported reports: some locales ' +
    'rendered day/month reversed. Root cause was relying on the OS default ' +
    'locale instead of an explicit one. Resolution: always pass an explicit ' +
    "locale ('en-US') to the date formatter at the export boundary.",
];

export const TASKS = [
  {
    id: 'astropy-12907-separability',
    instance: SWEBENCH_INSTANCES['astropy-12907'],
    prompt:
      'Consider this code, run against the modeling package in this repository:\n\n' +
      '```python\n' +
      'from astropy.modeling import models as m\n' +
      'from astropy.modeling.separable import separability_matrix\n\n' +
      'cm = m.Linear1D(10) & m.Linear1D(5)\n' +
      '```\n\n' +
      "separability_matrix(m.Pix2Sky_TAN() & m.Linear1D(10) & m.Linear1D(5)) correctly " +
      'shows the linear models as separable and independent of each other. But ' +
      'separability_matrix(m.Pix2Sky_TAN() & cm) - nesting the same two Linear1D models ' +
      'inside a compound model first - incorrectly shows them as no longer separable. ' +
      'Investigate the source in this repository and determine: which function is ' +
      'responsible for the bug, and what exactly is wrong with it? Write your answer to ' +
      '/ANSWER.md, then call finish_task.',
    memoryEntry:
      'Fix for separability_matrix giving wrong results on nested CompoundModels: ' +
      'nesting compound models (e.g. `Pix2Sky_TAN() & (Linear1D(10) & Linear1D(5))`) ' +
      'produced spurious cross-dependencies between separate inputs/outputs in the ' +
      'output matrix. Root cause: `_cstack()` in astropy/modeling/separable.py, in the ' +
      "branch where `right` is not itself a compound model, filled right's sub-block of " +
      '`cright` with the constant `1` instead of `right`\'s real coordinate matrix - ' +
      '`cright[-right.shape[0]:, -right.shape[1]:] = 1`. Resolution: change that line to ' +
      '`cright[-right.shape[0]:, -right.shape[1]:] = right` so the sub-matrix carries the ' +
      'real separability values instead of a placeholder constant.',
    sourceNotes:
      'Original GitHub issue text (verbatim reproduction case) never names `_cstack`, ' +
      '`cright`, or the constant-1 placeholder - confirmed by reading the full issue ' +
      'before stripping. Verified absent from astropy/modeling/separable.py at ' +
      'baseCommit: `grep -n cright separable.py` shows the buggy `= 1` line, no mention ' +
      "of the fix (base commit predates the real fix's merge).",
    check(answerText) {
      const t = answerText.toLowerCase();
      const mentionsFunction = /_?cstack/i.test(t);
      const identifiesConstant = containsAny(t, [
        'constant 1',
        'hardcoded 1',
        'hard-coded 1',
        'literal 1',
        'placeholder 1',
        'value of 1',
        'assigns 1',
        'set to 1',
        'filled with 1',
        'set to the value 1',
      ]);
      const identifiesFix = containsAny(t, [
        '= right',
        'assign right',
        'assigns right',
        'use right',
        'should be right',
        "right's coordinate",
        'right instead of 1',
        'replace 1 with right',
        "actual values of right",
        'placeholder 1',
      ]) && hasUnnegatedKeyword(t, 'right');
      const passed = mentionsFunction && identifiesConstant && identifiesFix;
      return {
        passed,
        detail: `mentionsFunction=${mentionsFunction} identifiesConstant=${identifiesConstant} identifiesFix=${identifiesFix}`,
      };
    },
  },
  {
    id: 'django-11133-memoryview',
    instance: SWEBENCH_INSTANCES['django-11133'],
    prompt:
      'A view in this repository builds an HttpResponse from binary content read out of a ' +
      "BinaryField. When the underlying database is SQLite this works fine, but with " +
      'PostgreSQL the driver returns the field content as a `memoryview` object instead ' +
      'of `bytes`, and the resulting HttpResponse content comes out wrong. Passing a ' +
      '`bytes` object directly to HttpResponse works correctly; passing an equivalent ' +
      '`memoryview` object does not. Investigate the source in this repository and ' +
      'determine: which function is responsible, and exactly what is wrong with it? ' +
      'Write your answer to /ANSWER.md, then call finish_task.',
    memoryEntry:
      'Fix for HttpResponse mangling memoryview content from PostgreSQL BinaryField ' +
      'results: HttpResponse(value).content came out wrong when value was a memoryview ' +
      '(e.g. psycopg2 BinaryField reads), even though passing raw bytes worked fine. ' +
      'Root cause: HttpResponseBase.make_bytes() in django/http/response.py only ' +
      'special-cased `isinstance(value, bytes)`, so a memoryview fell through to the ' +
      'wrong branch instead of being converted via bytes(value). Resolution: change the ' +
      'check to `isinstance(value, (bytes, memoryview))` so memoryview content converts ' +
      'the same way bytes does.',
    sourceNotes:
      'Original GitHub issue text names the symptom (memoryview from PostgreSQL breaks ' +
      'HttpResponse) but never names `make_bytes` or the isinstance check - confirmed by ' +
      'reading the full issue before stripping. Verified absent from ' +
      'django/http/response.py at baseCommit: `grep -in memoryview response.py` returns ' +
      'zero hits (base commit predates the real fix\'s merge).',
    check(answerText) {
      const t = answerText.toLowerCase();
      const mentionsFunction = /make_bytes/i.test(t);
      const mentionsCheck = t.includes('isinstance');
      const mentionsFix = containsAny(t, [
        '(bytes, memoryview)',
        'bytes, memoryview)',
        'add memoryview',
        'adding memoryview',
        'include memoryview',
        'also accept memoryview',
        'or memoryview',
        'memoryview) to',
        'and memoryview',
      ]);
      const passed = mentionsFunction && mentionsCheck && mentionsFix;
      return {
        passed,
        detail: `mentionsFunction=${mentionsFunction} mentionsCheck=${mentionsCheck} mentionsFix=${mentionsFix}`,
      };
    },
  },
];
