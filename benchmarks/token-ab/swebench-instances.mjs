/**
 * SWE-bench Lite instances selected for ticket 19 (Run the Counterfactual
 * A/B on Synthetic Repos with Synthetic Memory Sets).
 *
 * Sourced from princeton-nlp/SWE-bench_Lite (MIT-licensed dataset; the
 * underlying repos - astropy, django - are themselves permissively
 * licensed OSS). Selection criteria per the ticket's grilled Scope: a
 * single-file, single-hunk gold patch (small enough for a keyword-graded
 * diagnose-and-describe question to have a crisp answer), and a GitHub
 * issue whose original text is symptom-level rather than already stating
 * the root cause or fix location - verified by hand for both instances
 * below (see each task's `sourceNotes` in swebench-tasks.mjs).
 *
 * Pinning to `baseCommit` is what gives the "answer absent from the repo"
 * property structurally: the gold patch was merged in a later commit, so
 * checking out exactly `baseCommit` cannot contain the fix or any doc that
 * describes it. Spot-verified by grepping the target file at baseCommit
 * for the fix's own vocabulary (e.g. "memoryview") and finding zero hits.
 */

export const SWEBENCH_INSTANCES = {
  'astropy-12907': {
    instanceId: 'astropy__astropy-12907',
    repo: 'astropy/astropy',
    cloneUrl: 'https://github.com/astropy/astropy.git',
    baseCommit: 'd16bfe05a744909de4b27f5875fe0d4ed41ce607',
    targetFile: 'astropy/modeling/separable.py',
  },
  'django-11133': {
    instanceId: 'django__django-11133',
    repo: 'django/django',
    cloneUrl: 'https://github.com/django/django.git',
    baseCommit: '879cc3da6249e920b8d54518a0ae06de835d7373',
    targetFile: 'django/http/response.py',
  },
  // Added 2026-08-09 after the first pilot came back 0/4 failures (too
  // easy) once the grading bug was fixed - both single-branch, single-line
  // fixes below turned out to be quick for Sonnet 5 to spot. These two
  // replace astropy-12907/django-11133 for a re-run: multi-hunk patches
  // with an algorithmic root cause (an asymmetry between two code paths;
  // a pairwise-merge algorithm that can't see global order across 3+
  // inputs), picked from princeton-nlp/SWE-bench_Lite's own patch-size
  // ranking (hunks/lines-changed) rather than a "difficulty" field, which
  // the dataset doesn't have.
  'matplotlib-24265': {
    instanceId: 'matplotlib__matplotlib-24265',
    repo: 'matplotlib/matplotlib',
    cloneUrl: 'https://github.com/matplotlib/matplotlib.git',
    baseCommit: 'e148998d9bed9d1b53a91587ad48f9bb43c7737f',
    targetFile: 'lib/matplotlib/style/core.py',
  },
  'django-11019': {
    instanceId: 'django__django-11019',
    repo: 'django/django',
    cloneUrl: 'https://github.com/django/django.git',
    baseCommit: '93e892bb645b16ebaf287beb5fe7f3ffe8d10408',
    targetFile: 'django/forms/widgets.py',
  },
};
