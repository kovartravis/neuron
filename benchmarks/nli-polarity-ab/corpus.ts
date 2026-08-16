/**
 * Ticket 8 (neuron-2.4.2): labeled corpus for validating
 * `cross-encoder/nli-MiniLM2-L6-H768` as the polarity signal Ticket 9 would
 * hard-block on. Mirrors Ticket 7's near-dup-ab corpus in register and
 * size — same topics, same seed prose lifted from this repo's own
 * decisions/learning/tickets content — so this measures the actual domain
 * the gate will run against.
 *
 * Each pair is `{ premise, hypothesis }`: `premise` mirrors an entry
 * already live in the store, `hypothesis` mirrors a new write being
 * evaluated against it — the same shape a real NLI call would take, layered
 * on top of Ticket 3/6's relatedness gate (this corpus only contains pairs
 * that would already have cleared that gate; polarity detection is never
 * asked to separate related from unrelated, only contradiction from
 * everything else that's already related).
 *
 * Two labels:
 *
 * - `contradiction` — hypothesis asserts a different value/fact for the
 *   same slot the premise fixed (numeric flip, policy reversal, named-value
 *   swap, direct negation). A real gate must catch these — this is Pillar
 *   14 case 2's shape, generalized to 15 pairs.
 * - `compatible` — hypothesis does NOT conflict with the premise. Two
 *   subtypes, both must NOT be caught:
 *     - `compatible-paraphrase` — same fact, reworded (NLI entailment).
 *       Reused verbatim from Ticket 7's near-dup-ab `CORPUS` (`nd-*`
 *       label `near-dup`) — these already cleared the relatedness gate at
 *       a high bar in Ticket 7's own A/B run, so they're exactly the kind
 *       of pair polarity detection would see downstream of Ticket 6.
 *     - `compatible-related` — same topic, different non-conflicting
 *       fact (NLI neutral). Reused verbatim from Ticket 7's near-dup-ab
 *       `CORPUS` (`rd-*` label `related-distinct`) — the hard negative
 *       that a vocabulary-overlap-only signal false-positives on.
 */
import { CORPUS as NEAR_DUP_CORPUS } from '../near-dup-ab/corpus.js';

export type PolarityLabel = 'contradiction' | 'compatible-paraphrase' | 'compatible-related';

export interface Pair {
  id: string;
  label: PolarityLabel;
  premise: string;
  hypothesis: string;
}

const CONTRADICTION_PAIRS: Pair[] = [
  {
    id: 'cd-01',
    label: 'contradiction',
    premise: 'Query results are limited to 10 items by default.',
    hypothesis: 'Query results are limited to 25 items by default.',
  },
  {
    id: 'cd-02',
    label: 'contradiction',
    premise: 'The default request timeout is 30 seconds.',
    hypothesis: 'The default request timeout is 90 seconds.',
  },
  {
    id: 'cd-03',
    label: 'contradiction',
    premise: 'Importance defaults to 3 when omitted.',
    hypothesis: 'Importance defaults to 1 when omitted.',
  },
  {
    id: 'cd-04',
    label: 'contradiction',
    premise: 'Pruning removes entries below the importance ceiling after N days.',
    hypothesis: 'Pruning never removes entries, regardless of importance.',
  },
  {
    id: 'cd-05',
    label: 'contradiction',
    premise: 'Tests must run against a real database, not a mocked one, to catch migration bugs.',
    hypothesis: 'Tests should mock the database so the suite runs faster.',
  },
  {
    id: 'cd-06',
    label: 'contradiction',
    premise: 'The embedder uses bge-small-en-v1.5 for generating vector embeddings.',
    hypothesis: 'The embedder uses bge-large-en-v1.5 for generating vector embeddings.',
  },
  {
    id: 'cd-07',
    label: 'contradiction',
    premise: 'The reranker returns a raw logit, not a probability.',
    hypothesis: 'The reranker returns a normalized probability, not a raw logit.',
  },
  {
    id: 'cd-08',
    label: 'contradiction',
    premise: 'Supersession requires cosine similarity above 0.97 to trigger.',
    hypothesis: 'Supersession requires cosine similarity above 0.80 to trigger.',
  },
  {
    id: 'cd-09',
    label: 'contradiction',
    premise: 'CLI commands are built to dist/cli.js after running the build.',
    hypothesis: 'CLI commands are built to build/index.js after running the build.',
  },
  {
    id: 'cd-10',
    label: 'contradiction',
    premise: 'The blockedBy field lists comma-separated ticket ids.',
    hypothesis: 'The blockedBy field holds a single ticket id — it can never list more than one.',
  },
  {
    id: 'cd-11',
    label: 'contradiction',
    premise: 'Frontier tickets are unclaimed, unblocked, and open.',
    hypothesis: 'A frontier ticket can be claimed by more than one session at the same time.',
  },
  {
    id: 'cd-12',
    label: 'contradiction',
    premise: 'git-notes is a new category distinct from the auto-populated git_log_index.',
    hypothesis: 'git-notes and git_log_index are the same category under two different names.',
  },
  {
    id: 'cd-13',
    label: 'contradiction',
    premise: 'The map is an index, not a store — it never restates ticket detail.',
    hypothesis: 'The map restates the full detail of every ticket so tickets never need to be opened.',
  },
  {
    id: 'cd-14',
    label: 'contradiction',
    premise: 'Declared fields are validated inside enforceFieldSchema.',
    hypothesis: 'Declared fields are validated by the CLI argv parser, not by enforceFieldSchema.',
  },
  {
    id: 'cd-15',
    label: 'contradiction',
    premise: 'The default retry count is 3 attempts.',
    hypothesis: 'The default retry count is 5 attempts.',
  },
];

const COMPATIBLE_PARAPHRASE_PAIRS: Pair[] = NEAR_DUP_CORPUS.filter(p => p.label === 'near-dup').map(p => ({
  id: p.id,
  label: 'compatible-paraphrase' as const,
  premise: p.seed,
  hypothesis: p.candidate,
}));

const COMPATIBLE_RELATED_PAIRS: Pair[] = NEAR_DUP_CORPUS.filter(p => p.label === 'related-distinct').map(p => ({
  id: p.id,
  label: 'compatible-related' as const,
  premise: p.seed,
  hypothesis: p.candidate,
}));

export const CORPUS: Pair[] = [
  ...CONTRADICTION_PAIRS,
  ...COMPATIBLE_PARAPHRASE_PAIRS,
  ...COMPATIBLE_RELATED_PAIRS,
];
