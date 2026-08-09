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

import { containsAny, hasUnnegatedKeyword, normalizeForMatch } from './grading.mjs';
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

// Retired 2026-08-09: the pilot (after a grading-bug fix — see ticket 19's
// Comments) came back 0/4 failures on these two, outside the 15-40%
// difficulty-calibration band on the too-easy side. Kept, not deleted, for
// provenance and because RETIRED_TASKS is still valid input to `check()`/
// `runSession` if a future session wants to widen back to N=4. Not part of
// the default `TASKS` export, so a plain `npm run bench:swebench-ab*` no
// longer spends on them.
export const RETIRED_TASKS = [
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
      'responsible for the bug, what exactly is wrong with it, and how would you fix it? ' +
      'Write your answer to /ANSWER.md, then call finish_task.',
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
      const t = normalizeForMatch(answerText);
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
      'determine: which function is responsible, exactly what is wrong with it, and how ' +
      'would you fix it? Write your answer to /ANSWER.md, then call finish_task.',
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
      const t = normalizeForMatch(answerText);
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
        'handle memoryview',
        'handles memoryview',
        'handling memoryview',
        'support memoryview',
        'supports memoryview',
        'bytes(memoryview',
        'isinstance(value, memoryview)',
      ]);
      const passed = mentionsFunction && mentionsCheck && mentionsFix;
      return {
        passed,
        detail: `mentionsFunction=${mentionsFunction} mentionsCheck=${mentionsCheck} mentionsFix=${mentionsFix}`,
      };
    },
  },
];

// Added 2026-08-09, replacing RETIRED_TASKS above after the pilot (post
// grading-bug fix) came back 0/4 failures on those two - too easy. Picked
// from princeton-nlp/SWE-bench_Lite by patch complexity (multi-hunk, an
// algorithmic root cause rather than a single wrong-value line), diversified
// away from astropy/django's separable.py/response.py so this isn't the
// same two files again. Both verified against their real baseCommit content
// (fetched directly from GitHub, not inferred from the patch alone) per the
// same rigor RETIRED_TASKS' sourceNotes used.
export const TASKS = [
  {
    id: 'matplotlib-24265-seaborn-alias',
    instance: SWEBENCH_INSTANCES['matplotlib-24265'],
    prompt:
      "Consider this code, run against matplotlib's style subsystem in this repository:\n\n" +
      '```python\n' +
      "import matplotlib.pyplot as plt\n" +
      "plt.style.use('seaborn-colorblind')       # works, with a deprecation warning\n" +
      "the_rc = plt.style.library['seaborn-colorblind']  # raises KeyError\n" +
      '```\n\n' +
      "`plt.style.use('seaborn-colorblind')` works fine (it prints a deprecation warning " +
      "about the style being renamed, then applies it). But directly indexing " +
      "`plt.style.library['seaborn-colorblind']` raises `KeyError: 'seaborn-colorblind'` " +
      'even though nothing else in the process has changed between the two calls. ' +
      'Investigate the source in this repository and determine: which mechanism is ' +
      'responsible for this inconsistency between the two access paths, what exactly ' +
      'is wrong with it, and how would you fix it? Write your answer to /ANSWER.md, ' +
      'then call finish_task.',
    memoryEntry:
      "Fix for KeyError when directly indexing matplotlib.style.library with a deprecated " +
      "seaborn style name (e.g. plt.style.library['seaborn-colorblind']): plt.style.use(...) " +
      "already worked for the same name (with a deprecation warning) because use()'s internal " +
      'fix_style() helper translates the old seaborn-* names to their renamed ' +
      "seaborn-v0_8-* equivalents before looking them up. But the module-level library dict " +
      'itself is populated only with the new seaborn-v0_8-* keys and was never taught the ' +
      'same translation, so any code indexing plt.style.library[...] directly (bypassing ' +
      'use()) hits a plain KeyError on the old name. Resolution: wrap library in a small ' +
      'dict subclass (_StyleLibrary) whose __getitem__ applies the same seaborn-name ' +
      'translation and deprecation warning before falling through to the normal dict lookup, ' +
      'so both access paths behave consistently.',
    sourceNotes:
      "Original GitHub issue text (verbatim reproduction case) only reports " +
      "plt.style.library['seaborn-colorblind'] raising KeyError - never mentions use(), " +
      "fix_style, or that use() and library disagree; confirmed by reading the full issue " +
      'before stripping. Verified against baseCommit ' +
      '(`e148998d9bed9d1b53a91587ad48f9bb43c7737f`, fetched directly from GitHub): `library ' +
      '= None` at module scope, populated by `reload_library()` called at import time, so ' +
      "library is a plain dict of the (already-renamed) style directory's contents by the " +
      "time user code touches it; fix_style()'s old inline seaborn-alias list (visible in " +
      'the diff as removed lines) already existed at baseCommit inside use(), confirming ' +
      "use() already remapped the alias while library[...] didn't - the asymmetry the task " +
      'asks about, not a fix that had not landed yet. `grep -n _StyleLibrary core.py` at ' +
      'baseCommit returns zero hits (the fix\'s own class name is absent, as expected).',
    check(answerText) {
      const t = normalizeForMatch(answerText);
      const mentionsMechanism = /library/i.test(t) && /(use\(\)|style\.use|fix_style)/i.test(t);
      const identifiesAsymmetry = containsAny(t, [
        /library[\s\S]{0,120}(doesn'?t|does not|isn'?t|is not|never|nothing|no)[\s\S]{0,40}(translat|remap|alias)/i,
        /(translat|remap|alias)[\s\S]{0,120}(doesn'?t|does not|isn'?t|is not|never|nothing|no)[\s\S]{0,40}library/i,
        /nothing[\s\S]{0,40}(translat|remap|alias)[\s\S]{0,60}library/i,
        /library[\s\S]{0,60}(bypass|skip)/i,
        'use() remaps',
        'use() translates',
        'only applied in use',
        'only happens in use',
      ]);
      const identifiesFix = containsAny(t, [
        'getitem',
        '__getitem__',
        'subclass',
        'intercept',
        'override the lookup',
        'custom dict',
        'apply the same',
        'same translation',
        'same remap',
        'also translate',
        'also remap',
        'wrap the library',
        'wrap library',
      ]);
      const passed = mentionsMechanism && identifiesAsymmetry && identifiesFix;
      return {
        passed,
        detail: `mentionsMechanism=${mentionsMechanism} identifiesAsymmetry=${identifiesAsymmetry} identifiesFix=${identifiesFix}`,
      };
    },
  },
  {
    id: 'django-11019-media-merge-order',
    instance: SWEBENCH_INSTANCES['django-11019'],
    prompt:
      "Consider this repository's form-media combination logic. Given three widgets:\n\n" +
      '```python\n' +
      'class ColorPicker(forms.Widget):\n' +
      '    class Media:\n' +
      "        js = ['color-picker.js']\n\n" +
      'class SimpleTextWidget(forms.Widget):\n' +
      '    class Media:\n' +
      "        js = ['text-editor.js']\n\n" +
      'class FancyTextWidget(forms.Widget):\n' +
      '    class Media:\n' +
      "        js = ['text-editor.js', 'text-editor-extras.js', 'color-picker.js']\n\n" +
      'class MyForm(forms.Form):\n' +
      '    background_color = forms.CharField(widget=ColorPicker())\n' +
      '    intro = forms.CharField(widget=SimpleTextWidget())\n' +
      '    body = forms.CharField(widget=FancyTextWidget())\n' +
      '```\n\n' +
      "Combining these three widgets' media (`MyForm().media`) should be able to resolve the " +
      "JS files into the order `text-editor.js, text-editor-extras.js, color-picker.js` - the " +
      "only real ordering constraint FancyTextWidget states. Instead it raises a " +
      "MediaOrderConflictWarning claiming text-editor-extras.js and text-editor.js are in " +
      "conflicting order (they are not - FancyTextWidget lists them in the same relative " +
      "order both times), and the final combined order it produces violates FancyTextWidget's " +
      "own ordering. Investigate the source in this repository and determine: which function " +
      'is responsible for combining these lists, what exactly is wrong with its approach, ' +
      'and how would you fix it? Write your answer to /ANSWER.md, then call finish_task.',
    memoryEntry:
      'Fix for spurious MediaOrderConflictWarning when merging 3+ Django form Media objects: ' +
      'combining ColorPicker/SimpleTextWidget/FancyTextWidget media raised a ' +
      'MediaOrderConflictWarning between files that were never actually in conflict, and ' +
      'produced a final JS order that violated the real constraint. Root cause: Media.merge() ' +
      '(django/forms/widgets.py) only ever merges two lists at a time, called pairwise as each ' +
      "widget's media is added to the running total via __add__ - so by the time a third list " +
      'arrives, the running merged list has already lost track of which relative orderings ' +
      'came from which original list, and a later pairwise merge can misread an artifact of an ' +
      'earlier merge as a real conflict between the wrong pair of files. Resolution: replaced ' +
      'the pairwise merge with a real dependency graph over ALL input lists at once, then a ' +
      'topological sort (django.utils.topological_sort.stable_topological_sort) to produce the ' +
      'final order - a conflict is now only reported on an actual cycle in that graph, built ' +
      'once from every list rather than accumulated through a chain of two-at-a-time merges.',
    sourceNotes:
      'Original GitHub issue text (the ColorPicker/SimpleTextWidget/FancyTextWidget ' +
      'reproduction, reused near-verbatim above since it is example code describing symptom, ' +
      'not implementation) never names merge, Media, topological sort, or any internal ' +
      'mechanism - confirmed by reading the full issue before stripping the prompt down to ' +
      'the repro plus the observed-vs-expected behavior. Verified against baseCommit ' +
      '(`93e892bb645b16ebaf287beb5fe7f3ffe8d10408`, fetched directly from GitHub): ' +
      '`grep -n topological django/forms/widgets.py` at baseCommit returns zero hits, and the ' +
      'diff\'s removed lines confirm Media.merge(list_1, list_2) at baseCommit takes exactly ' +
      'two positional lists (the pairwise signature the task asks about), not the *lists ' +
      'variadic form the fix introduces.',
    check(answerText) {
      const t = normalizeForMatch(answerText);
      const mentionsFunction = /\bmerge\b/i.test(t) && /media/i.test(t);
      const identifiesRootCause = containsAny(t, [
        'pairwise',
        'two lists at a time',
        'two at a time',
        'only compares two',
        'only merges two',
        'combining pairs',
        'merged one pair at a time',
        'lost transitive',
        'lost the dependency',
        'does not consider all',
        "doesn't consider all",
        'no global order',
        'not a true dependency',
        'no dependency graph',
        'called pairwise',
        'chain of merges',
        'accumulated through',
        'running merged list',
      ]);
      const identifiesFix = containsAny(t, [
        'topological sort',
        'topological',
        'dependency graph',
        'treat as a graph',
        'build a graph',
        'graph-based',
        'consider all lists together',
        'merge all lists at once',
        'single pass over all',
        'all lists at once',
      ]);
      const passed = mentionsFunction && identifiesRootCause && identifiesFix;
      return {
        passed,
        detail: `mentionsFunction=${mentionsFunction} identifiesRootCause=${identifiesRootCause} identifiesFix=${identifiesFix}`,
      };
    },
  },
];
