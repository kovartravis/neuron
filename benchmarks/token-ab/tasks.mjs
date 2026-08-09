/**
 * Task manifest for ticket 10 (Counterfactual Token A/B).
 *
 * Every task asks a question whose correct answer is a real, verified fact
 * recorded in this repo's own memory store (.neuron/decisions.md, the
 * originating memory-store entries) as of the commit these fixtures are cut
 * from. Prior memory plausibly helps on every one of these — that is the
 * selection criterion Scope item 1 requires, not an incidental property.
 *
 * Grading is a deterministic text check against /ANSWER.md, never an LLM
 * judge (ticket 10 Context: "reintroduces exactly the cost and the
 * arguability this design avoids").
 */

import { containsAll, containsAny, hasUnnegatedKeyword } from './grading.mjs';

export const TASKS = [
  {
    id: 'prune-default-collision',
    prompt:
      "In this repository, a memory entry's default `importance` and the default " +
      'prune-eligibility threshold are both set to the same numeric value, and the ' +
      'comparison that decides prune-eligibility is inclusive. Is this collision ' +
      'considered a bug that should be fixed, or is it deliberate maintainer design? ' +
      'Write your answer to /ANSWER.md: state the numeric value, and state your verdict ' +
      "(intentional / not a bug) OR (bug / should be fixed) explicitly. Then call " +
      'finish_task.',
    check(answerText) {
      const t = answerText.toLowerCase();
      const hasValue = /\b3\b/.test(t);
      const saysIntentional =
        ['intentional', 'deliberate', 'on purpose', 'by design'].some(k => hasUnnegatedKeyword(t, k)) ||
        /\bnot\s+(a\s+)?bug\b/.test(t);
      const callsItABug =
        hasUnnegatedKeyword(t, 'is a bug') ||
        (hasUnnegatedKeyword(t, 'bug') && hasUnnegatedKeyword(t, 'should be fixed'));
      const passed = hasValue && saysIntentional && !callsItABug;
      return {
        passed,
        detail: `value=${hasValue} intentional=${saysIntentional} callsItABug=${callsItABug}`,
      };
    },
  },
  {
    id: 'qwen-05b-scoreboard',
    prompt:
      "This project's local 0.5B model (Qwen1.5-0.5B) was evaluated in A/B tests " +
      'against cheaper non-model methods (centroid cosine, content hashing, plain ' +
      'arithmetic) on several distinct jobs across the 2.2.0 release. Did the 0.5B ' +
      'model win any of those evaluations, and did the 2.2.0 release cycle end up ' +
      'adding any new default-on jobs for that model? Write your verdict on both ' +
      'questions to /ANSWER.md, with the specific jobs it was tried and lost on as ' +
      'evidence, then call finish_task.',
    check(answerText) {
      const t = answerText.toLowerCase();
      const hasZeroNewJobs = ['zero', 'no new', 'none', "didn't add", 'did not add'].some(k =>
        hasUnnegatedKeyword(t, k)
      );
      // Scoped to "<the model/it/qwen> ... won" specifically — a bare /\bwon\b/
      // also matches "centroid cosine won 9/9 against the model", which is the
      // *correct* answer (the cheaper method won, not the 0.5B model) stated
      // with the model as object rather than subject.
      const wonMatch = /\b(the model|it|qwen|the 0\.5b model)\b((?:(?!\.).){0,40}?)\bwon(?!'t)\b/.exec(t);
      const claimsItWon = !!wonMatch && !/\b(never|didn'?t|did not)\b/.test(wonMatch[2]);
      // Evidence of real investigation rather than a lucky guess: the answer
      // should name a few of the distinct jobs it was actually tried on.
      const jobKeywords = ['tag', 'categor', 'importan', 'prun', 'dedupe', 'duplicate', 'salvage'];
      const jobsNamed = jobKeywords.filter(k => t.includes(k)).length;
      const passed = hasZeroNewJobs && !claimsItWon && jobsNamed >= 3;
      return { passed, detail: `zeroNewJobs=${hasZeroNewJobs} claimsItWon=${claimsItWon} jobsNamed=${jobsNamed}` };
    },
  },
  {
    id: 'pruning-ab-verdict',
    prompt:
      'Was automatic pruning shipped in neuron 2.2.0? What became of wayfinder ' +
      'ticket 25 (per-category prune config)? Write your answer to /ANSWER.md, ' +
      'stating explicitly whether automatic pruning shipped, and what happened to ' +
      'ticket 25. Then call finish_task.',
    check(answerText) {
      const t = answerText.toLowerCase();
      const notShipped = [
        'not shipped',
        'removed',
        'dropped',
        "wasn't shipped",
        'was not shipped',
        'not ship',
      ].some(k => hasUnnegatedKeyword(t, k));
      const wronglyClaimsShipped = hasUnnegatedKeyword(t, /\b(is|was)\s+shipped\b/);
      const ticket25Deferred = [
        'pushed off',
        'deferred',
        'push it off',
        'not resolved',
        'unresolved',
        'shelved',
      ].some(k => hasUnnegatedKeyword(t, k));
      const passed = notShipped && !wronglyClaimsShipped && ticket25Deferred;
      return {
        passed,
        detail: `notShipped=${notShipped} falseShippedClaim=${wronglyClaimsShipped} ticket25Deferred=${ticket25Deferred}`,
      };
    },
  },
  {
    id: 'write-side-capture-gap',
    prompt:
      "According to this project's recorded design decisions, does neuron's memory " +
      'system capture what an agent DID, or what a maintainer DECIDED? Is there a ' +
      'known gap here, and if so, is it fixed by deterministic (as opposed to ' +
      'fallback) recall hooks? Write your answer to /ANSWER.md, then call finish_task.',
    check(answerText) {
      const t = answerText.toLowerCase();
      const capturesAgentAction = containsAll(t, ['agent', 'did']);
      const mentionsDecided = t.includes('decided');
      const notFixedByHooks = containsAny(t, [
        /hooks?[^.]{0,60}(not|does not|doesn't|won't|do not)[^.]{0,30}fix/,
        /not\s+fixed\s+by[^.]{0,40}hooks?/,
        'write-side',
        'write side',
      ]);
      const passed = capturesAgentAction && mentionsDecided && notFixedByHooks;
      return {
        passed,
        detail: `agentAction=${capturesAgentAction} decided=${mentionsDecided} notFixedByHooks=${notFixedByHooks}`,
      };
    },
  },
];
