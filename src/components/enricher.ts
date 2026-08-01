/**
 * Write-side enrichment: inferring the metadata a caller did not supply.
 *
 * The three fields are inferred by different machinery, chosen by what each
 * field actually is (see `.scratch/write-side-enrichment/spec.md`):
 *
 *   tags       — *selected* from a closed vocabulary by centroid cosine. No
 *                model: the embedder is already loaded on the write path, and
 *                ADR 0010 §4 forbids the model from minting a tag, which makes
 *                tagging a ranking problem rather than a generation one.
 *   category   — inferred by the model, which can read a category's
 *                `description` as an instruction rather than merely as a
 *                similarity target. A centroid strategy ships alongside it for
 *                the A/B.
 *   importance — inferred by the model, unclamped, free alongside category.
 */
import { getTextGenerator } from './generator.js';
import { withTimeout, TimeoutError } from './timeout.js';

// --- Vocabulary & centroids ------------------------------------------------

export interface Centroid {
  /** The tag or category name this centroid represents. */
  label: string;
  /** L2-normalised mean of the embeddings of the entries carrying it. */
  vector: Float32Array;
  /** How many entries contributed. Declared tags may sit below the floor. */
  support: number;
}

export interface VocabularyEntry {
  tags: string[];
  embedding: Float32Array;
}

/**
 * The default frequency floor. This is a requirement of the centroid method,
 * not a tuning knob: a tag carried by a single entry has a centroid identical
 * to that entry, so selecting it is just "most similar entry" wearing a label.
 */
export const DEFAULT_TAG_SUPPORT_FLOOR = 3;

/**
 * Build the tag vocabulary from entries already in the store.
 *
 * `declaredTags` (from `neuron.yaml`) are exempt from the frequency floor so
 * intentional vocabulary is never crowded out by frequency statistics. A
 * declared tag carried by *no* entry still has no centroid and so cannot be
 * selected — it becomes selectable as soon as one entry uses it explicitly.
 */
export function buildTagVocabulary(
  entries: VocabularyEntry[],
  declaredTags: string[] = [],
  minSupport: number = DEFAULT_TAG_SUPPORT_FLOOR
): Centroid[] {
  const declared = new Set(declaredTags);
  const sums = new Map<string, { sum: Float64Array; count: number }>();

  for (const entry of entries) {
    if (!entry.embedding || entry.embedding.length === 0) continue;
    for (const tag of new Set(entry.tags)) {
      if (!tag) continue;
      let acc = sums.get(tag);
      if (!acc) {
        acc = { sum: new Float64Array(entry.embedding.length), count: 0 };
        sums.set(tag, acc);
      }
      for (let i = 0; i < entry.embedding.length; i++) acc.sum[i] += entry.embedding[i];
      acc.count++;
    }
  }

  const vocabulary: Centroid[] = [];
  for (const [label, acc] of sums) {
    if (acc.count < minSupport && !declared.has(label)) continue;
    vocabulary.push({ label, vector: normalise(acc.sum, acc.count), support: acc.count });
  }
  vocabulary.sort((a, b) => b.support - a.support || a.label.localeCompare(b.label));
  return vocabulary;
}

/** Build one centroid per category from entries already in the store. */
export function buildCategoryCentroids(
  entries: Array<{ category: string; embedding: Float32Array }>,
  allowed: string[]
): Centroid[] {
  const allowedSet = new Set(allowed);
  const sums = new Map<string, { sum: Float64Array; count: number }>();

  for (const entry of entries) {
    if (!entry.embedding || entry.embedding.length === 0) continue;
    if (!allowedSet.has(entry.category)) continue;
    let acc = sums.get(entry.category);
    if (!acc) {
      acc = { sum: new Float64Array(entry.embedding.length), count: 0 };
      sums.set(entry.category, acc);
    }
    for (let i = 0; i < entry.embedding.length; i++) acc.sum[i] += entry.embedding[i];
    acc.count++;
  }

  return [...sums].map(([label, acc]) => ({
    label,
    vector: normalise(acc.sum, acc.count),
    support: acc.count,
  }));
}

export interface TagSelectionOptions {
  maxTags?: number;
  minSimilarity?: number;
}

/**
 * Top-K by cosine against the entry's embedding, subject to a similarity floor
 * so that a weakly-related entry receives few tags or none.
 */
export function selectTags(
  embedding: Float32Array,
  vocabulary: Centroid[],
  options: TagSelectionOptions = {}
): string[] {
  const maxTags = options.maxTags ?? 3;
  const minSimilarity = options.minSimilarity ?? 0.5;
  if (maxTags <= 0 || !embedding || embedding.length === 0) return [];

  return vocabulary
    .map(c => ({ label: c.label, similarity: cosine(embedding, c.vector) }))
    .filter(c => c.similarity >= minSimilarity)
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, maxTags)
    .map(c => c.label);
}

/** Nearest category by cosine, or `undefined` when nothing clears the floor. */
export function selectCategory(
  embedding: Float32Array,
  centroids: Centroid[],
  minSimilarity = 0.3
): string | undefined {
  if (!embedding || embedding.length === 0 || centroids.length === 0) return undefined;
  let best: { label: string; similarity: number } | null = null;
  for (const c of centroids) {
    const similarity = cosine(embedding, c.vector);
    if (!best || similarity > best.similarity) best = { label: c.label, similarity };
  }
  return best && best.similarity >= minSimilarity ? best.label : undefined;
}

// --- The model-backed half -------------------------------------------------

export interface CategoryOption {
  name: string;
  description?: string;
}

export interface CategoryInferenceInput {
  content: string;
  categories: CategoryOption[];
}

export interface CategoryInferenceResult {
  category?: string;
  importance?: number;
  /** Machine-readable reason the inference did not produce a value. */
  degraded?: string;
}

export interface ImportanceInferenceResult {
  importance?: number;
  degraded?: string;
}

/**
 * The seam enrichment is injected through. Mirrors
 * `SummarizerOptions.forceFallback` — ADR 0010 §7 names that as the A/B
 * mechanism, and a stub implementing this interface is how tests assert on
 * stored metadata without loading a 500M-parameter model.
 */
export interface EnrichmentModel {
  inferCategoryAndImportance(input: CategoryInferenceInput): Promise<CategoryInferenceResult>;
  inferImportance(input: { content: string }): Promise<ImportanceInferenceResult>;
}

export interface LocalEnrichmentModelOptions {
  timeoutMs?: number;
  /** Force the degraded path without loading anything. The A/B control arm. */
  forceFallback?: boolean;
}

export const DEFAULT_ENRICHMENT_TIMEOUT_MS = 15000;

export class LocalEnrichmentModel implements EnrichmentModel {
  private timeoutMs: number;
  private forceFallback: boolean;

  constructor(options: LocalEnrichmentModelOptions = {}) {
    this.timeoutMs = options.timeoutMs ?? DEFAULT_ENRICHMENT_TIMEOUT_MS;
    this.forceFallback = options.forceFallback ?? false;
  }

  async inferCategoryAndImportance(input: CategoryInferenceInput): Promise<CategoryInferenceResult> {
    const declared = input.categories.map(c => c.name);
    if (declared.length === 0) return { degraded: 'no_declared_categories' };

    const raw = await this.generate(buildCategoryPrompt(input), 6);
    if (typeof raw !== 'string') return { degraded: raw.degraded };

    const category = matchDeclaredCategory(raw, declared);
    // A second generation rather than a second field of the first: at 0.5B a
    // multi-field answer is not reliably parseable, while a second call
    // against an already-resident model costs ~183ms.
    const { importance } = await this.inferImportance({ content: input.content });

    if (!category) return { importance, degraded: 'category_not_declared' };
    return { category, importance };
  }

  async inferImportance(input: { content: string }): Promise<ImportanceInferenceResult> {
    const raw = await this.generate(buildImportancePrompt(input.content), 4);
    if (typeof raw !== 'string') return { degraded: raw.degraded };

    const importance = parseImportance(raw);
    return importance === undefined ? { degraded: 'importance_unparseable' } : { importance };
  }

  /** Generated text, or the reason there is none. */
  private async generate(prompt: string, maxNewTokens: number): Promise<string | Degraded> {
    if (this.forceFallback) return { degraded: 'model_disabled' };
    // The model is disabled under NODE_ENV=test, so the E2E suite is the only
    // place these jobs can be measured at all (ADR 0010 §7).
    if (process.env.NODE_ENV === 'test') return { degraded: 'model_disabled' };

    try {
      const generator = await withTimeout(getTextGenerator(), this.timeoutMs, 'enrichment model load');
      if (!generator) return { degraded: 'model_unavailable' };

      const output = await withTimeout<any>(
        generator(prompt, { max_new_tokens: maxNewTokens, return_full_text: false }),
        this.timeoutMs,
        'enrichment inference'
      );
      const text = output?.[0]?.generated_text;
      if (typeof text !== 'string' || text.trim().length === 0) return { degraded: 'empty_generation' };
      return text;
    } catch (err) {
      return { degraded: err instanceof TimeoutError ? 'timeout' : 'model_error' };
    }
  }
}

interface Degraded {
  degraded: string;
}

// --- Prompting & parsing ---------------------------------------------------

/**
 * Both prompts are few-shot. Measured on the shipped model: an instruction-only
 * prompt asking for `category: <name>` / `importance: <digit>` was answered by
 * continuing the note instead — 12 of 12 importance inferences were
 * unparseable. The same task with worked examples answers with a bare token
 * every time. The examples buy format compliance, not judgement; judgement is
 * what Pillar 10 and Pillar 11 measure.
 */
function shot(user: string, assistant: string): string {
  return `<|im_start|>user\n${user}<|im_end|>\n<|im_start|>assistant\n${assistant}<|im_end|>\n`;
}

export function buildCategoryPrompt(input: CategoryInferenceInput): string {
  const list = input.categories
    .map(c => `${c.name} = ${c.description ?? 'notes filed under ' + c.name}`)
    .join('\n');
  // The examples are built from the declared categories' own descriptions, so
  // they teach this project's taxonomy rather than a hardcoded one.
  const examples = input.categories
    .map(c => shot(c.description ?? `A note belonging under ${c.name}.`, c.name))
    .join('');

  return `<|im_start|>system
File the note into exactly one category.
${list}
Reply with one word: the category name.<|im_end|>
${examples}<|im_start|>user
${input.content.slice(0, 700)}<|im_end|>
<|im_start|>assistant
`;
}

export function buildImportancePrompt(content: string): string {
  return `<|im_start|>system
Rate how important it is to keep a note. Reply with one digit from 1 to 5.
5 = losing it causes real damage. 3 = ordinary. 1 = losing it costs nothing.<|im_end|>
${shot(
    'Deleting the production database backup schedule would make recovery impossible after any outage.',
    '5'
  )}${shot('Renamed a local variable for readability. No behaviour changed.', '1')}${shot(
    'The queue consumer reconnects with exponential backoff after a dropped connection.',
    '3'
  )}<|im_start|>user
${content.slice(0, 700)}<|im_end|>
<|im_start|>assistant
`;
}

export function parseImportance(raw: string): number | undefined {
  const labelled = raw.match(/importance\s*[:=]\s*([1-5])/i);
  if (labelled) return Number(labelled[1]);
  // Few-shot answers are a bare digit; take the first one that appears.
  const bare = raw.match(/[1-5]/);
  return bare ? Number(bare[0]) : undefined;
}

function matchDeclaredCategory(raw: string, declared: string[]): string | undefined {
  const answer = raw.trim().toLowerCase();
  // Exact first, then a prefix match: the model reliably emits the right stem
  // with the wrong inflection ("learned" for "learning").
  return (
    declared.find(d => d.toLowerCase() === answer) ??
    declared.find(d => answer.startsWith(d.toLowerCase()))
  );
}

// --- Vector helpers --------------------------------------------------------

function normalise(sum: Float64Array, count: number): Float32Array {
  const out = new Float32Array(sum.length);
  let norm = 0;
  for (let i = 0; i < sum.length; i++) {
    const mean = sum[i] / count;
    out[i] = mean;
    norm += mean * mean;
  }
  norm = Math.sqrt(norm);
  if (norm > 0) {
    for (let i = 0; i < out.length; i++) out[i] /= norm;
  }
  return out;
}

/**
 * Entry embeddings arrive L2-normalised from the embedder and centroids are
 * re-normalised above, so a dot product is the cosine.
 */
function cosine(a: Float32Array, b: Float32Array): number {
  const n = Math.min(a.length, b.length);
  let s = 0;
  for (let i = 0; i < n; i++) s += a[i] * b[i];
  return s;
}
