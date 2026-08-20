/**
 * Ticket 2 (Map — Cross-Referenced Recall: Scan, Git & Decisions): fresh
 * labeled corpus for validating `cross-encoder/nli-MiniLM2-L6-H768` against
 * the specific text register this map's cross-reference capability will run
 * against — `decisions`/`architecture` category entries as the premise, and
 * a natural-language description of a scan-detected structural change as the
 * hypothesis. Mirrors Ticket 8's methodology (`run-ab.ts` as harness
 * template) but is NOT a copy of Ticket 8's corpus.ts — that corpus paired
 * two free-form decision-style sentences; this one pairs a decision/
 * architecture premise against a hypothesis actually shaped like
 * `neuron scan --diff` output.
 *
 * IMPORTANT — a finding from this ticket's own investigation, not an
 * assumption: `src/scanner/diff.ts` (`calculateArchitecturalDiff`,
 * `formatArchitecturalDiffMarkdown`) tracks exactly three change types —
 * modules added/removed, exports added/removed, and npm dependencies
 * added/removed. It does NOT track internal import edges (the
 * `dependencyGraph` field `analyzer.ts` computes is dead outside the
 * analyzer). So "module `scanner` now imports module `commands`" — the
 * example sentence used when this ticket was chartered — is not a sentence
 * `neuron scan --diff` can literally produce. Every hypothesis below instead
 * uses the diff engine's real vocabulary, taken verbatim from
 * `formatArchitecturalDiffMarkdown`'s bullet templates:
 *   - `New module discovered at \`${path}\`` / `Module removed at \`${path}\``
 *   - `` `${symbol}` added to `${file}`'s exports `` / `removed from`
 *   - `` `${package}` added as a dependency `` / `removed as a dependency`
 *
 * Premises are adapted from real entries in this repo's own `decisions` and
 * `architecture` categories (pulled via `neuron memory list`), not invented
 * facts — same discipline as Ticket 8's corpus, which lifted seed prose from
 * this repo's own store.
 *
 * Three labels, same meaning as Ticket 8's corpus:
 * - `contradiction` — the diff hypothesis negates something the premise
 *   commits to (a module/export/dependency the premise treats as present is
 *   reported removed).
 * - `compatible-paraphrase` — the diff hypothesis is the change the premise
 *   is already describing (an addition the premise frames as having
 *   happened), restated in diff vocabulary. NLI entailment.
 * - `compatible-related` — the diff hypothesis is a true, non-conflicting
 *   event in the same module/subsystem/file the premise discusses, but
 *   about a different symbol/package/module. NLI neutral — the hard
 *   negative a vocabulary-overlap-only signal would false-positive on.
 */

export type PolarityLabel = 'contradiction' | 'compatible-paraphrase' | 'compatible-related';

export interface Pair {
  id: string;
  label: PolarityLabel;
  premise: string;
  hypothesis: string;
}

const CONTRADICTION_PAIRS: Pair[] = [
  {
    id: 'adf-01',
    label: 'contradiction',
    premise: 'The project chose @yao-pkg/pkg over Node SEA, nexe, and Bun build --compile as the standalone binary packaging tool.',
    hypothesis: '`@yao-pkg/pkg` removed as a dependency',
  },
  {
    id: 'adf-02',
    label: 'contradiction',
    premise: '`src/scanner/grammars.ts` bundles eight tree-sitter grammars, weighing ~8.5 MB against a 621 KB package.',
    hypothesis: 'Module removed at `src/scanner/grammars.ts`',
  },
  {
    id: 'adf-03',
    label: 'contradiction',
    premise: 'SUPERSESSION_SIMILARITY_THRESHOLD (0.97) governs when near-duplicate entries are automatically merged, defined in `src/index.ts`.',
    hypothesis: '`SUPERSESSION_SIMILARITY_THRESHOLD` removed from `src/index.ts`\'s exports',
  },
  {
    id: 'adf-04',
    label: 'contradiction',
    premise: 'RERANKER_ACCEPT_THRESHOLD sets the reranker leg\'s raw-logit accept bar at -8, defined in `src/index.ts`.',
    hypothesis: '`RERANKER_ACCEPT_THRESHOLD` removed from `src/index.ts`\'s exports',
  },
  {
    id: 'adf-05',
    label: 'contradiction',
    premise: '`src/components/enricher.ts` selects category by centroid cosine over neuron.yaml-declared tags plus store tags with >=3 entries.',
    hypothesis: 'Module removed at `src/components/enricher.ts`',
  },
  {
    id: 'adf-06',
    label: 'contradiction',
    premise: '`src/scanner/analyzer.ts` exports isIgnoredEntryName, ModuleSummary, ScanResult, and scanProjectTopology — traversal rules shared by the topology scan and the drift fingerprint guard.',
    hypothesis: '`scanProjectTopology` removed from `src/scanner/analyzer.ts`\'s exports',
  },
  {
    id: 'adf-07',
    label: 'contradiction',
    premise: '`src/scanner/ingest.ts` exports blueprintCardId and moduleCardId, the SHA-256-derived deterministic ids for the index card and each per-module detail card.',
    hypothesis: '`moduleCardId` removed from `src/scanner/ingest.ts`\'s exports',
  },
  {
    id: 'adf-08',
    label: 'contradiction',
    premise: 'onnxruntime-node\'s native binding cannot load inside a pkg snapshot, so every ONNX-backed feature runs on the onnxruntime-web WASM backend inside the curl-installed binary.',
    hypothesis: '`onnxruntime-web` removed as a dependency',
  },
  {
    id: 'adf-09',
    label: 'contradiction',
    premise: 'cross-encoder/nli-MiniLM2-L6-H768 is loaded via `@huggingface/transformers` as the polarity signal in `benchmarks/nli-polarity-ab/run-ab.ts`.',
    hypothesis: '`@huggingface/transformers` removed as a dependency',
  },
  {
    id: 'adf-10',
    label: 'contradiction',
    premise: '`benchmarks/near-dup-ab` measures near-duplicate detection via SUPERSESSION_SIMILARITY_THRESHOLD counterfactual sweeps in ab4-counterfactual.ts.',
    hypothesis: 'Module removed at `benchmarks/near-dup-ab`',
  },
  {
    id: 'adf-11',
    label: 'contradiction',
    premise: '`benchmarks/reranker-gate` validates the reranker\'s raw-logit accept threshold against a labeled corpus.',
    hypothesis: 'Module removed at `benchmarks/reranker-gate`',
  },
  {
    id: 'adf-12',
    label: 'contradiction',
    premise: '`src/storage` holds the SQLite-backed persistence layer for memory entries, migrations, and the git_log_index table.',
    hypothesis: 'Module removed at `src/storage`',
  },
  {
    id: 'adf-13',
    label: 'contradiction',
    premise: '`src/harnesses` contains the write-side enrichment and relatedness-gate harnesses that run before a memory entry is committed.',
    hypothesis: 'Module removed at `src/harnesses`',
  },
  {
    id: 'adf-14',
    label: 'contradiction',
    premise: '`src/config`\'s enforceFieldSchema validates every declared field against neuron.yaml\'s schema before a write is accepted.',
    hypothesis: '`enforceFieldSchema` removed from `src/config`\'s exports',
  },
  {
    id: 'adf-15',
    label: 'contradiction',
    premise: '`test/e2e` holds this repo\'s end-to-end test suites, twelve files under test/e2e alone.',
    hypothesis: 'Module removed at `test/e2e`',
  },
];

const COMPATIBLE_PARAPHRASE_PAIRS: Pair[] = [
  {
    id: 'adp-01',
    label: 'compatible-paraphrase',
    premise: 'Ticket 28 split architecture output into one index card (blueprintCardId) and one per-module detail card each (moduleCardId), written into `src/scanner/ingest.ts`.',
    hypothesis: '`moduleCardId` added to `src/scanner/ingest.ts`\'s exports',
  },
  {
    id: 'adp-02',
    label: 'compatible-paraphrase',
    premise: 'The standalone binary build gains a build-binaries job driven by @yao-pkg/pkg for the six-target cross-compile matrix.',
    hypothesis: '`@yao-pkg/pkg` added as a dependency',
  },
  {
    id: 'adp-03',
    label: 'compatible-paraphrase',
    premise: 'cross-encoder/nli-MiniLM2-L6-H768, loaded through @huggingface/transformers, was adopted as the polarity signal for write-time contradiction detection.',
    hypothesis: '`@huggingface/transformers` added as a dependency',
  },
  {
    id: 'adp-04',
    label: 'compatible-paraphrase',
    premise: '`benchmarks/nli-polarity-ab` is a new benchmark subsystem added to validate the NLI polarity model.',
    hypothesis: 'New module discovered at `benchmarks/nli-polarity-ab`',
  },
  {
    id: 'adp-05',
    label: 'compatible-paraphrase',
    premise: '`benchmarks/salvage-expansion` is a new benchmark subsystem added to this repo.',
    hypothesis: 'New module discovered at `benchmarks/salvage-expansion`',
  },
  {
    id: 'adp-06',
    label: 'compatible-paraphrase',
    premise: '`benchmarks/reranker-gate` is a new benchmark subsystem added to validate the reranker\'s raw-logit accept threshold.',
    hypothesis: 'New module discovered at `benchmarks/reranker-gate`',
  },
  {
    id: 'adp-07',
    label: 'compatible-paraphrase',
    premise: 'isIgnoredEntryName was added to `src/scanner/analyzer.ts`\'s exported surface to share traversal rules between the topology scan and the drift fingerprint guard.',
    hypothesis: '`isIgnoredEntryName` added to `src/scanner/analyzer.ts`\'s exports',
  },
  {
    id: 'adp-08',
    label: 'compatible-paraphrase',
    premise: 'scanProjectTopology became the exported entry point for the topology scan in `src/scanner/analyzer.ts`.',
    hypothesis: '`scanProjectTopology` added to `src/scanner/analyzer.ts`\'s exports',
  },
  {
    id: 'adp-09',
    label: 'compatible-paraphrase',
    premise: 'The onnxruntime-web WASM backend was adopted so ONNX-backed features keep working inside the curl-installed binary.',
    hypothesis: '`onnxruntime-web` added as a dependency',
  },
  {
    id: 'adp-10',
    label: 'compatible-paraphrase',
    premise: 'env-paths was adopted to resolve the per-OS model cache directory.',
    hypothesis: '`env-paths` added as a dependency',
  },
  {
    id: 'adp-11',
    label: 'compatible-paraphrase',
    premise: 'web-tree-sitter and its eight bundled grammars were added to power AST-fidelity parsing in the scanner.',
    hypothesis: '`web-tree-sitter` added as a dependency',
  },
  {
    id: 'adp-12',
    label: 'compatible-paraphrase',
    premise: 'blueprintCardId was added to `src/scanner/ingest.ts` as the deterministic id function for the architecture index card.',
    hypothesis: '`blueprintCardId` added to `src/scanner/ingest.ts`\'s exports',
  },
  {
    id: 'adp-13',
    label: 'compatible-paraphrase',
    premise: 'A new `site/src` subsystem was added to host the astro-based marketing site.',
    hypothesis: 'New module discovered at `site/src`',
  },
  {
    id: 'adp-14',
    label: 'compatible-paraphrase',
    premise: '`benchmarks/longmemeval` is a new benchmark subsystem for long-memory evaluation.',
    hypothesis: 'New module discovered at `benchmarks/longmemeval`',
  },
  {
    id: 'adp-15',
    label: 'compatible-paraphrase',
    premise: '`benchmarks/near-dup-ab` is a new benchmark subsystem measuring near-duplicate detection.',
    hypothesis: 'New module discovered at `benchmarks/near-dup-ab`',
  },
];

const COMPATIBLE_RELATED_PAIRS: Pair[] = [
  {
    id: 'adr-01',
    label: 'compatible-related',
    premise: '`src/scanner/grammars.ts` bundles eight tree-sitter grammars, weighing ~8.5 MB against a 621 KB package.',
    hypothesis: '`typescript` added as a dependency',
  },
  {
    id: 'adr-02',
    label: 'compatible-related',
    premise: 'SUPERSESSION_SIMILARITY_THRESHOLD (0.97) governs when near-duplicate entries are automatically merged, defined in `src/index.ts`.',
    hypothesis: '`RERANKER_ACCEPT_THRESHOLD` removed from `src/index.ts`\'s exports',
  },
  {
    id: 'adr-03',
    label: 'compatible-related',
    premise: '`src/components/enricher.ts` selects category by centroid cosine over neuron.yaml-declared tags plus store tags with >=3 entries.',
    hypothesis: 'New module discovered at `src/components`',
  },
  {
    id: 'adr-04',
    label: 'compatible-related',
    premise: '`src/scanner/analyzer.ts` exports isIgnoredEntryName, ModuleSummary, ScanResult, and scanProjectTopology.',
    hypothesis: 'Module removed at `src/scanner/grammars.ts`',
  },
  {
    id: 'adr-05',
    label: 'compatible-related',
    premise: '`src/scanner/ingest.ts` exports blueprintCardId and moduleCardId.',
    hypothesis: '`isIgnoredEntryName` added to `src/scanner/analyzer.ts`\'s exports',
  },
  {
    id: 'adr-06',
    label: 'compatible-related',
    premise: 'onnxruntime-node\'s native binding cannot load inside a pkg snapshot, so ONNX-backed features run on WASM only in the curl-installed binary.',
    hypothesis: '`@yao-pkg/pkg` added as a dependency',
  },
  {
    id: 'adr-07',
    label: 'compatible-related',
    premise: 'cross-encoder/nli-MiniLM2-L6-H768 is loaded via @huggingface/transformers as the polarity signal in `benchmarks/nli-polarity-ab/run-ab.ts`.',
    hypothesis: 'New module discovered at `benchmarks/near-dup-ab`',
  },
  {
    id: 'adr-08',
    label: 'compatible-related',
    premise: '`benchmarks/near-dup-ab` measures near-duplicate detection via SUPERSESSION_SIMILARITY_THRESHOLD counterfactual sweeps.',
    hypothesis: '`vitest` added as a dependency',
  },
  {
    id: 'adr-09',
    label: 'compatible-related',
    premise: '`benchmarks/reranker-gate` validates the reranker\'s raw-logit accept threshold against a labeled corpus.',
    hypothesis: 'New module discovered at `benchmarks/nli-polarity-ab`',
  },
  {
    id: 'adr-10',
    label: 'compatible-related',
    premise: '`src/storage` holds the SQLite-backed persistence layer for memory entries, migrations, and the git_log_index table.',
    hypothesis: '`@types/better-sqlite3` added as a dependency',
  },
  {
    id: 'adr-11',
    label: 'compatible-related',
    premise: '`src/harnesses` contains the write-side enrichment and relatedness-gate harnesses that run before a memory entry is committed.',
    hypothesis: 'Module removed at `src/e2e`',
  },
  {
    id: 'adr-12',
    label: 'compatible-related',
    premise: '`src/config`\'s enforceFieldSchema validates every declared field against neuron.yaml\'s schema before a write is accepted.',
    hypothesis: '`zod` added as a dependency',
  },
  {
    id: 'adr-13',
    label: 'compatible-related',
    premise: '`test/e2e` holds this repo\'s end-to-end test suites, twelve files under test/e2e alone.',
    hypothesis: 'New module discovered at `src/e2e`',
  },
  {
    id: 'adr-14',
    label: 'compatible-related',
    premise: '@yao-pkg/pkg cross-compiles the standalone binary from a single Linux CI runner across all six macOS/Linux/Windows x64/arm64 targets.',
    hypothesis: '`esbuild` added as a dependency',
  },
  {
    id: 'adr-15',
    label: 'compatible-related',
    premise: '`src/models` holds the model-loading and inference wrappers for the embedder, reranker, and NLI classifier.',
    hypothesis: 'New module discovered at `src/models`',
  },
];

export const CORPUS: Pair[] = [
  ...CONTRADICTION_PAIRS,
  ...COMPATIBLE_PARAPHRASE_PAIRS,
  ...COMPATIBLE_RELATED_PAIRS,
];
