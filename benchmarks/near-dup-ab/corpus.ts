/**
 * Ticket 7 (neuron-2.4.2): labeled corpus for the near-duplicate-detection
 * A/B tests. Extends Pillar 14's case-1 fixture (the real paraphrase pair
 * that slipped past the 0.97 cosine supersession gate uncaught — see
 * `test/e2e/antagonistic-write.test.ts` and
 * `docs/design/write-time-quality/antagonistic-write-findings.md`) into a
 * full labeled set.
 *
 * Each pair is `{ seed, candidate }`: `seed` mirrors an entry already live
 * in the store, `candidate` mirrors a new write being evaluated against it
 * — the same seed/new-write shape `findSupersessionCandidate` and the CLI's
 * `memory add` gate actually compare. Three labels:
 *
 * - `near-dup`   — candidate restates the seed's same fact in different
 *   words. A real gate should catch these (today's 0.97 cosine gate does
 *   not — Pillar 14 case 1).
 * - `related-distinct` — candidate shares the seed's topic/category and
 *   surface vocabulary but states a *different* fact. These are the hard
 *   negatives: a gate tuned only on vocabulary overlap will false-positive
 *   on these, which is exactly what A/B 5 (false-positive friction) checks
 *   for downstream. A gate must NOT catch these.
 * - `unrelated`  — candidate shares no topic with the seed at all. Easy
 *   negative control, included so the frontier (A/B 3) has a floor to
 *   compare the hard negatives against.
 *
 * All content is either lifted verbatim from this repo's own real
 * decisions/learning/tickets prose (paraphrased for the `near-dup` side)
 * or written in the same register, so the corpus measures the actual
 * domain this gate will run against — not generic sentences.
 */

export type PairLabel = 'near-dup' | 'related-distinct' | 'unrelated';

export interface Pair {
  id: string;
  label: PairLabel;
  seed: string;
  candidate: string;
}

export const CORPUS: Pair[] = [
  // --- near-dup: same fact, reworded ---------------------------------
  {
    id: 'nd-01',
    label: 'near-dup',
    seed: 'The default request timeout is 30 seconds.',
    candidate: 'By default, requests time out after 30 seconds.',
  },
  {
    id: 'nd-02',
    label: 'near-dup',
    seed: 'Query results are limited to 10 items by default.',
    candidate: 'The default page size for query results is 10.',
  },
  {
    id: 'nd-03',
    label: 'near-dup',
    seed: 'We chose SQLite for local storage because it requires no separate server process.',
    candidate: 'SQLite was selected as the local storage engine since it needs no standalone server.',
  },
  {
    id: 'nd-04',
    label: 'near-dup',
    seed: 'The embedder uses bge-small-en-v1.5 for generating vector embeddings.',
    candidate: 'Vector embeddings are generated using the bge-small-en-v1.5 model.',
  },
  {
    id: 'nd-05',
    label: 'near-dup',
    seed: 'Supersession requires cosine similarity above 0.97 to trigger.',
    candidate: 'The supersession gate only fires once cosine similarity exceeds 0.97.',
  },
  {
    id: 'nd-06',
    label: 'near-dup',
    seed: "Tests must run against a real database, not a mocked one, to catch migration bugs.",
    candidate: "We avoid mocking the database in tests so migration bugs aren't hidden.",
  },
  {
    id: 'nd-07',
    label: 'near-dup',
    seed: 'The reranker returns a raw logit, not a probability.',
    candidate: 'Reranker scores are raw logits rather than probabilities.',
  },
  {
    id: 'nd-08',
    label: 'near-dup',
    seed: 'CLI commands are built to dist/cli.js after running the build.',
    candidate: 'After running the build, the CLI entrypoint lives at dist/cli.js.',
  },
  {
    id: 'nd-09',
    label: 'near-dup',
    seed: 'Declared fields are validated inside enforceFieldSchema.',
    candidate: 'enforceFieldSchema is where declared-field validation happens.',
  },
  {
    id: 'nd-10',
    label: 'near-dup',
    seed: 'The blockedBy field lists comma-separated ticket ids.',
    candidate: 'Comma-separated ticket ids go in the blockedBy field.',
  },
  {
    id: 'nd-11',
    label: 'near-dup',
    seed: 'Importance defaults to 3 when omitted.',
    candidate: "If you don't pass --importance, it defaults to 3.",
  },
  {
    id: 'nd-12',
    label: 'near-dup',
    seed: 'Pruning removes entries below the importance ceiling after N days.',
    candidate: 'After N days, pruning drops any entry under the importance ceiling.',
  },
  {
    id: 'nd-13',
    label: 'near-dup',
    seed: 'The map is an index, not a store — it never restates ticket detail.',
    candidate: 'Detail lives in the ticket, not the map; the map only indexes it.',
  },
  {
    id: 'nd-14',
    label: 'near-dup',
    seed: 'Frontier tickets are unclaimed, unblocked, and open.',
    candidate: 'An open, unblocked, unclaimed ticket sits on the frontier.',
  },
  {
    id: 'nd-15',
    label: 'near-dup',
    seed: 'git-notes is a new category distinct from the auto-populated git_log_index.',
    candidate: 'Unlike git_log_index, which is auto-populated, git-notes is a new, separate category.',
  },

  // --- related-distinct: same topic, different fact (hard negative) --
  {
    id: 'rd-01',
    label: 'related-distinct',
    seed: 'The default request timeout is 30 seconds.',
    candidate: 'The default retry count is 3 attempts.',
  },
  {
    id: 'rd-02',
    label: 'related-distinct',
    seed: 'Query results are limited to 10 items by default.',
    candidate: 'Query results can be sorted by relevance or recency.',
  },
  {
    id: 'rd-03',
    label: 'related-distinct',
    seed: 'We chose SQLite for local storage because it requires no separate server process.',
    candidate: 'We chose TypeScript for this project because of its static typing.',
  },
  {
    id: 'rd-04',
    label: 'related-distinct',
    seed: 'The embedder uses bge-small-en-v1.5 for generating vector embeddings.',
    candidate: 'The reranker uses ms-marco-MiniLM-L-6-v2 for scoring candidates.',
  },
  {
    id: 'rd-05',
    label: 'related-distinct',
    seed: 'Supersession requires cosine similarity above 0.97 to trigger.',
    candidate: "The reranker gate's accept threshold is -8.",
  },
  {
    id: 'rd-06',
    label: 'related-distinct',
    seed: 'Tests must run against a real database, not a mocked one, to catch migration bugs.',
    candidate: 'Tests must spawn the real CLI binary, not call in-process, to catch argv-parsing bugs.',
  },
  {
    id: 'rd-07',
    label: 'related-distinct',
    seed: 'The reranker returns a raw logit, not a probability.',
    candidate: 'The embedder returns a normalized 384-dimension vector.',
  },
  {
    id: 'rd-08',
    label: 'related-distinct',
    seed: 'CLI commands are built to dist/cli.js after running the build.',
    candidate: 'Test reports are written to benchmarks/reports after a run.',
  },
  {
    id: 'rd-09',
    label: 'related-distinct',
    seed: 'Declared fields are validated inside enforceFieldSchema.',
    candidate: 'Category inference happens inside enrichUpsert.',
  },
  {
    id: 'rd-10',
    label: 'related-distinct',
    seed: 'The blockedBy field lists comma-separated ticket ids.',
    candidate: "The map field names a child ticket's parent map id.",
  },
  {
    id: 'rd-11',
    label: 'related-distinct',
    seed: 'Importance defaults to 3 when omitted.',
    candidate: 'Status defaults to unclaimed when omitted.',
  },
  {
    id: 'rd-12',
    label: 'related-distinct',
    seed: 'Pruning removes entries below the importance ceiling after N days.',
    candidate: 'Pruning skips entries a category marks as pinned.',
  },
  {
    id: 'rd-13',
    label: 'related-distinct',
    seed: 'The map is an index, not a store — it never restates ticket detail.',
    candidate: "A ticket's content is its full body — there's no separate file per ticket.",
  },
  {
    id: 'rd-14',
    label: 'related-distinct',
    seed: 'Frontier tickets are unclaimed, unblocked, and open.',
    candidate: 'A blocked ticket waits on every id in blockedBy resolving first.',
  },
  {
    id: 'rd-15',
    label: 'related-distinct',
    seed: 'git-notes is a new category distinct from the auto-populated git_log_index.',
    candidate: 'The decisions category declares no fields block at all in this repo\'s neuron.yaml.',
  },

  // --- unrelated: no shared topic (easy negative control) ------------
  {
    id: 'un-01',
    label: 'unrelated',
    seed: 'The default request timeout is 30 seconds.',
    candidate: 'The team decided to use dark mode as the default editor theme.',
  },
  {
    id: 'un-02',
    label: 'unrelated',
    seed: 'Query results are limited to 10 items by default.',
    candidate: 'The onboarding doc needs a new section on Slack channel etiquette.',
  },
  {
    id: 'un-03',
    label: 'unrelated',
    seed: 'We chose SQLite for local storage because it requires no separate server process.',
    candidate: 'The office coffee machine was replaced last week.',
  },
  {
    id: 'un-04',
    label: 'unrelated',
    seed: 'The embedder uses bge-small-en-v1.5 for generating vector embeddings.',
    candidate: 'Quarterly planning starts the first Monday of next month.',
  },
  {
    id: 'un-05',
    label: 'unrelated',
    seed: 'Supersession requires cosine similarity above 0.97 to trigger.',
    candidate: 'The mascot for the internal hackathon is a rubber duck.',
  },
  {
    id: 'un-06',
    label: 'unrelated',
    seed: 'Tests must run against a real database, not a mocked one, to catch migration bugs.',
    candidate: 'The release notes template lives in .github/RELEASE_TEMPLATE.md.',
  },
  {
    id: 'un-07',
    label: 'unrelated',
    seed: 'The reranker returns a raw logit, not a probability.',
    candidate: 'Lunch orders are due by 11am on Fridays.',
  },
  {
    id: 'un-08',
    label: 'unrelated',
    seed: 'CLI commands are built to dist/cli.js after running the build.',
    candidate: 'The conference room on the third floor was repainted.',
  },
  {
    id: 'un-09',
    label: 'unrelated',
    seed: 'Declared fields are validated inside enforceFieldSchema.',
    candidate: 'The team standup moved from 9am to 9:30am.',
  },
  {
    id: 'un-10',
    label: 'unrelated',
    seed: 'The blockedBy field lists comma-separated ticket ids.',
    candidate: 'The printer on the second floor is out of toner again.',
  },
];

/**
 * Distractor-only seeds: no pair targets these, they exist purely to widen
 * the pool a real "widen by cosine across the whole store" gate would
 * search — 40 pair-seeds alone can't exercise the N=50 leg of A/B 2's
 * sweep meaningfully. Drawn from the same register as `CORPUS` (short
 * technical/decision prose) so they're plausible near-neighbors, not
 * trivially-separable filler.
 */
export const DISTRACTOR_SEEDS: string[] = [
  'The FTS index is rebuilt automatically after a bulk import.',
  'Category names are case-sensitive throughout the schema.',
  'The scanner walks module boundaries to a configurable depth.',
  'Architecture cards are upserted, never appended, on each scan.',
  'The hook adapter degrades to a no-op when the model fails to load.',
  'Write-side enrichment infers tags from the store\'s own vocabulary.',
  'A dangling blockedBy id leaves a ticket blocked, never silently unblocked.',
  'The relevance gate rejects a result with no FTS match on its top hit.',
  'ADR 0011 named markdown the store of record, not a cache of it.',
  'Every declared field is either type string or type enum today.',
  'The content-hash dedup catches byte-identical writes, not paraphrases.',
  'Superseded entries are never deleted, only marked supersededBy.',
  'The CLI reserves --type as a built-in flag name.',
  'A map entry carries no map value of its own.',
  'neuron init scaffolds a starter neuron.yaml for a new project.',
  'The benchmark harness ingests LongMemEval-S as a 500-question corpus.',
  'Recall cost is measured in characters per epoch, not raw tokens.',
  'The dualStorageRouter keeps markdown and sqlite in sync on every write.',
  'A pruned entry is deleted outright, not marked superseded.',
  'The mock embedder returns an all-zero vector for any input text.',
  'Tags are stored as a JSON array column on the memories table.',
  'The reranker model is loaded lazily on first score() call.',
  'git-log entries are auto-populated from the repo\'s own commit history.',
  'The store health check groups near-duplicates with a union-find.',
  'Config validation runs before any category is queried.',
  'The onnx runtime falls back to WASM when native bindings are missing.',
  'A claimed ticket is assigned to the session driving the map.',
  'Domain-modeling sessions ask one question at a time.',
  'The grilling skill is invoked for HITL tickets by default.',
  'Field schema errors report the offending category by name.',
  'The e2e runner tags each pillar with a stable numeric id.',
  'Token-economics benchmarks compare recall cost across storage modes.',
  'The scaffold command refuses to overwrite an existing neuron.yaml.',
  'Embeddings are normalized before being written to the vector column.',
  'The hint-follow benchmark measures whether agents act on discovery hints.',
  "A resolved ticket's answer is appended to its own content, not replaced.",
  'The gitLog harness shells out to git rev-parse for existence checks.',
  'Salvage expansion recovers partial writes after a crashed transaction.',
  'The pruning command accepts a --days flag with no default cutoff.',
  'Contention tests simulate two sessions writing the same category at once.',
  'The architecture scan diff reports moved exports as renamed, not dropped.',
];
