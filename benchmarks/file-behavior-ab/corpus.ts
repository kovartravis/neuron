/**
 * Ticket 3 (Map — Cross-Referenced Recall: Scan, Git & Decisions): ten real
 * files from this repo, each with a genuine human-authored file-purpose
 * JSDoc header. The header text is the GOLD reference — never shown to any
 * of the three candidate modes, only used afterward to score their output.
 * `stripLines` is the 1-indexed inclusive [start, end] line range of that
 * header in the real file on disk (verified against the current tree at
 * ticket-authoring time), removed before any mode sees the file's content —
 * without stripping, the "deterministic" mode could win by trivially
 * echoing the file's own header back, which would test nothing.
 */

export interface FileCase {
  id: string;
  path: string;
  stripLines: [number, number];
  gold: string;
}

export const CASES: FileCase[] = [
  {
    id: 'fb-01',
    path: 'src/scanner/analyzer.ts',
    stripLines: [14, 23],
    gold: 'Traversal rules shared by the topology scan and the drift fingerprint guard. Both must agree on exactly which files feed a scan: if the guard watches a narrower set than the scanner reads, edits to the difference are invisible and drift is never re-checked. Derived from the parser\'s own language list so the filter can never be narrower than what TreeSitterScanner can actually parse — a mismatch here silently hides whole languages (previously .tsx/.jsx/.cpp) from every scan.',
  },
  {
    id: 'fb-02',
    path: 'src/components/enricher.ts',
    stripLines: [1, 23],
    gold: 'Write-side enrichment: inferring the metadata a caller did not supply. Two fields are inferred, by different machinery chosen from what each field actually is: tags are selected from a closed vocabulary by centroid cosine (no model — the embedder is already loaded on the write path, and tagging is a ranking problem not a generation one); category is centroid cosine by default, which beat the model 9/9 to 1/9 on the same corpus, with the model strategy surviving as an opt-in. Importance was a third inferred field and is not inferred any more — the shipped 0.5B model\'s judgement measured as noise, so it shipped off and was later removed outright; an omitted --importance takes the column default.',
  },
  {
    id: 'fb-03',
    path: 'src/components/nliClassifier.ts',
    stripLines: [20, 43],
    gold: 'The validated model choice for a 3-way NLI cross-encoder, same on-disk/cache conventions as the reranker, with two deliberate differences: full precision with no dtype override (a quantized variant was never measured against the calibrated bar), and env.allowRemoteModels is always set explicitly rather than left unset on a cache miss, since the transformers library\'s env is a process-wide singleton shared with the reranker and a prior reranker load could otherwise silently block this model\'s first download. id2label is asserted rather than assumed, since label-index order varies by model and a silently-wrong assumption would score the wrong class as "contradiction" with no visible failure.',
  },
  {
    id: 'fb-04',
    path: 'src/scanner/grammars.ts',
    stripLines: [6, 16],
    gold: 'Tree-Sitter grammar acquisition. Compiled .wasm grammars are fetched at neuron init and cached on disk rather than bundled in the npm tarball. Eight grammars weigh ~8.5 MB against a 621 KB package, and the ONNX models already establish the fetch-at-init pattern, so grammars follow it. Artifacts come from the official tree-sitter-<lang> packages on the npm registry, which ship both a prebuilt .wasm and a queries/tags.scm.',
  },
  {
    id: 'fb-05',
    path: 'src/components/modelCacheLock.ts',
    stripLines: [4, 17],
    gold: 'A cross-process mkdir-based lock guarding a model\'s on-disk cache directory during first-time download. The transformers library has no protection against two processes downloading the same model concurrently — on a cold cache, two overlapping downloads writing to the same .onnx path can interleave and corrupt it. Every model loader in this codebase shares one on-disk cache dir, so this guards all of them uniformly rather than special-casing whichever loader last happened to flake.',
  },
  {
    id: 'fb-06',
    path: 'src/harnesses/complianceNudge.ts',
    stripLines: [1, 9],
    gold: 'The write-side analog of the read-side discovery hint — delivered once per session via pre-stop. Wording reuses a prior A/B\'s proven copy, the exact text that moved compliance from 20% to 100% in that benchmark, adapted for a real hook rather than that benchmark\'s simulated tool.',
  },
  {
    id: 'fb-07',
    path: 'src/scanner/fingerprint.ts',
    stripLines: [11, 22],
    gold: 'Cheap change-detection for the implicit drift re-scan. The full topology scan parses every source file\'s AST, which is far too expensive to run on every memory query, so a stat-only walk over the same file set — orders of magnitude cheaper — fingerprints the tree and skips the scan entirely when nothing has moved since the last reconcile. This guard only gates the implicit re-scan; an explicit scan, --diff, or --check always performs a real scan, so CI and explicit checks are never served a cached verdict.',
  },
  {
    id: 'fb-08',
    path: 'src/components/reranker.ts',
    stripLines: [18, 26],
    gold: 'The gate-layer reranker: a plain-BERT cross-encoder with a single logit output, same on-disk/cache conventions as the embedder. Loaded via the low-level tokenizer+model pair rather than the text-classification pipeline, because that pipeline\'s default softmax normalization is a no-op on this model\'s single-logit output head — it would always report 1.0 instead of the raw score this class needs.',
  },
  {
    id: 'fb-09',
    path: 'src/harnesses/discoveryHint.ts',
    stripLines: [1, 8],
    gold: 'A per-turn hint that teaches the agent the broader memory query surface exists, fired only when this turn\'s relevance-gated recall actually left something on the table — never a generic "you can search" note, always the real command with the real count. Counts against the same per-turn character budget as everything else the hook injects, so a tight budget just drops it.',
  },
  {
    id: 'fb-10',
    path: 'src/components/generator.ts',
    stripLines: [1, 9],
    gold: 'The shared text-generation model. Loading it costs ~3.2s and dominates its total cost — the load is 87% of a single-inference invocation, and every CLI command is its own process. The loader is therefore a module-level singleton so that a scan which has already paid for the model can hand it to write-side enrichment for free, rather than each consumer loading its own copy.',
  },
];
