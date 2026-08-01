/**
 * Adversarial retrieval corpus.
 *
 * The baseline recall pillar scores 1.0 because its distractors are only
 * *lexically* noisy — templated strings that share vocabulary but are
 * semantically unrelated, which hybrid search separates trivially. A metric
 * pinned at its ceiling can detect a regression but can never show an
 * improvement, and it predicts nothing about real retrieval quality.
 *
 * These cases are built to be genuinely hard, in four families:
 *
 *   lexical-decoy  the wrong answer shares MORE query keywords than the right
 *                  one, so keyword scoring alone picks the decoy
 *   paraphrase     near-miss neighbours that are topically identical but
 *                  answer a different question
 *   contradiction  an outdated memory superseded by a newer one; the newer
 *                  must win
 *   multi-hop      the query names none of the gold's salient terms and must
 *                  be bridged conceptually
 */

export type AdversarialFamily = 'lexical-decoy' | 'paraphrase' | 'contradiction' | 'multi-hop';

export interface AdversarialCase {
  family: AdversarialFamily;
  id: string;
  query: string;
  /** The single correct memory. */
  gold: string;
  /** Wrong answers deliberately engineered to outrank the gold. */
  hardNegatives: string[];
  /** Older superseded content; must rank below gold when present. */
  superseded?: string;
}

export const ADVERSARIAL_CASES: AdversarialCase[] = [
  // ---- lexical decoys: the decoy echoes the query wording, gold does not ----
  {
    family: 'lexical-decoy',
    id: 'decoy-retry-budget',
    query: 'retry budget exhausted on the payment webhook retry handler retry limit',
    gold: 'Once a charge is confirmed downstream, replaying the callback double-bills the customer, so the handler must stop after the first success rather than continuing to attempt delivery',
    hardNegatives: [
      'The retry budget for the payment webhook retry handler is configured by the retry limit setting in config',
      'Retry limit, retry budget, and retry handler options all live under the webhook retry section of the payment config',
      'When a retry budget is exhausted the retry handler logs a retry limit warning for the payment webhook',
    ],
  },
  {
    family: 'lexical-decoy',
    id: 'decoy-index-rebuild',
    query: 'search index rebuild slow index rebuild takes hours index rebuild job',
    gold: 'Dropping and recreating the analyzer before a bulk load is what makes the operation take hours; incremental refresh of only changed documents finishes in minutes',
    hardNegatives: [
      'The search index rebuild job is slow because the index rebuild runs nightly and index rebuild jobs are queued',
      'Index rebuild takes hours when the index rebuild job competes with other index rebuild tasks',
      'To trigger a search index rebuild, run the index rebuild job from the index rebuild dashboard',
    ],
  },

  // ---- paraphrase near-misses: same topic, different question ----
  {
    family: 'paraphrase',
    id: 'para-token-expiry',
    query: 'why are users being logged out earlier than the configured session length',
    gold: 'The refresh token inherits the shortest lifetime among the chained providers, so the effective session ends when the fastest-expiring upstream credential does, not at the value set locally',
    hardNegatives: [
      'Session length is configured in the auth settings and controls how long a user session remains valid before logout',
      'Users can be logged out manually by revoking their session from the admin console at any time',
      'Increasing the configured session length requires a coordinated rollout because existing sessions keep their original expiry',
      'The logout endpoint clears the session cookie and redirects the user to the login page',
    ],
  },
  {
    family: 'paraphrase',
    id: 'para-memory-growth',
    query: 'process memory keeps climbing across long runs but heap snapshots look flat',
    gold: 'Native buffers allocated by the ONNX session are held outside the JS heap, so snapshots stay flat while RSS grows; the session must be disposed between batches',
    hardNegatives: [
      'Heap snapshots are taken with the inspector protocol and show retained JS objects across long runs',
      'Memory growth in long runs is usually caused by unbounded caches retaining objects on the JS heap',
      'The process memory limit can be raised with --max-old-space-size when the heap grows across long runs',
      'Flat heap snapshots indicate the garbage collector is reclaiming objects correctly during long runs',
    ],
  },

  // ---- contradictions: newer supersedes older ----
  {
    family: 'contradiction',
    id: 'contra-storage-default',
    query: 'what is the default storage mode for new projects',
    superseded: 'The default storage mode for new projects is vector-only, writing solely to the SQLite vector database',
    gold: 'UPDATED: the default storage mode for new projects is now dual, writing to both the SQLite vector database and .neuron markdown files',
    hardNegatives: [
      'Storage mode for new projects can be set to md-only so that no SQLite database is created at all',
      'The storage mode setting for a project is declared under the storage key of neuron.yaml',
    ],
  },
  {
    family: 'contradiction',
    id: 'contra-scan-category',
    query: 'which memory category do architecture scan cards get written to',
    superseded: 'Architecture scan blueprint cards are ingested into the decisions category by default',
    gold: 'UPDATED: architecture scan blueprint cards are now ingested into the architecture category by default, not decisions',
    hardNegatives: [
      'The scan category can be overridden per run with the --category flag when invoking the scan command',
      'Memory categories such as decisions and learning are declared in the categories block of neuron.yaml',
    ],
  },

  // ---- multi-hop: query shares almost no salient terms with the gold ----
  {
    family: 'multi-hop',
    id: 'hop-cold-start',
    query: 'first command of the day is always sluggish, later ones are instant',
    gold: 'Model weights are lazily loaded on first use and then cached in the process, so the initial invocation pays the full ONNX initialization cost that subsequent ones skip',
    hardNegatives: [
      'Commands can be made faster by reducing the number of categories searched during a query',
      'The daily maintenance job runs at midnight and may hold a write lock briefly',
      'Sluggish commands are often caused by an oversized memory store that needs pruning',
    ],
  },
  {
    family: 'multi-hop',
    id: 'hop-ci-only-failure',
    query: 'passes on my machine, fails only in the pipeline',
    gold: 'The runner sets NODE_ENV=test, which short-circuits the summarizer and changes behaviour relative to a local run where that variable is unset',
    hardNegatives: [
      'Pipeline failures are usually caused by missing environment secrets that are present locally',
      'Local runs use a warm cache while the pipeline starts cold, so timing-sensitive assertions can differ',
      'The pipeline runs on Linux while local development is on macOS, so path separators may differ',
    ],
  },
];

/**
 * Topical filler that is plausible but never the answer. Distinct from the
 * templated distractors used by the baseline pillar: these read like real
 * engineering notes, so they sit much closer to the queries in embedding space.
 */
export function buildFiller(count: number): string[] {
  const subjects = [
    'the migration runner', 'the websocket gateway', 'the config loader',
    'the batch scheduler', 'the audit log writer', 'the feature flag client',
    'the rate limiter', 'the template renderer', 'the metrics exporter',
    'the session store', 'the queue consumer', 'the asset pipeline',
  ];
  const observations = [
    'buffers writes and flushes them on an interval, so a crash can lose the most recent window',
    'validates its input eagerly and rejects malformed payloads before any side effects occur',
    'was refactored to remove a circular import that previously broke tree shaking',
    'holds a connection open for the lifetime of the process and reconnects with backoff',
    'emits structured logs that downstream tooling parses by field name rather than position',
    'caches computed results keyed by content hash and evicts least-recently-used entries',
    'runs on a separate thread so a slow handler cannot block the main event loop',
    'serializes timestamps in UTC and converts to local time only at the presentation layer',
  ];

  return Array.from({ length: count }, (_, i) => {
    const s = subjects[i % subjects.length];
    const o = observations[Math.floor(i / subjects.length) % observations.length];
    return `Note ${i}: ${s} ${o}`;
  });
}
