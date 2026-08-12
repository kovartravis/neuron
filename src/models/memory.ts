/** @deprecated Use plain `string` for category names instead. */
export type MemoryKind = 'learning' | 'history';

export interface MemoryQuery {
  text?: string;
  /** Filter by a single category. */
  category?: string;
  /** Filter by one or more categories. */
  categories?: string[];
  /** @deprecated Use `categories` or `category` instead. Kept for backward compatibility. */
  kind?: MemoryKind;
  limit?: number;
  /**
   * Include rows with `supersededBy` set (ticket 17 / ADR 0015). Default
   * `false`: superseded rows hard-exclude from every read path, matching
   * ADR 0010 §6's dedupe precedent. Query-only — `neuron exec`'s injection
   * path never sets this, keeping its existing minimal-injection posture.
   */
  includeSuperseded?: boolean;
}

export interface Memory {
  id: string;
  category: string;
  /** @deprecated Use `category` instead. */
  kind: string;
  content: string;
  tags: string[];
  importance?: number;
  taskId?: string | null;
  createdAt: string;
  score?: number;
  /** Raw cosine similarity against the query embedding, before RRF fusion. Ticket 39 gate calibration; not persisted. */
  similarity?: number;
  /** Whether the FTS5 lexical leg matched this entry at all. Ticket 39 gate calibration; not persisted. */
  ftsMatched?: boolean;
  /**
   * Config-declared per-category fields (ticket 43 / ADR 0013), keyed by
   * config key. Round-trips through markdown frontmatter, and — since
   * ticket 44 — as additive SQLite columns on `memories`, so a value set
   * here survives regardless of a category's resolved storage.
   */
  fields?: Record<string, string>;
  /**
   * Ticket 17 / ADR 0015: the id of the entry this one was marked superseded
   * by, or `null`/undefined if it is live. Set only via the write-time gate's
   * `--supersedes` resolution — never on creation. One-way, no undo: a wrong
   * mark is corrected by a new forward-linking entry, not by clearing this.
   */
  supersededBy?: string | null;
  /** Timestamp `supersededBy` was set, or `null`/undefined if it is live. */
  supersededAt?: string | null;
}

/**
 * `enrichedAt` marks a write as having been through write-side enrichment.
 * It is set by `NeuronMemory.transact`, never by a caller: an entry that
 * reaches storage with it unset is in the enrichment backlog and will be
 * drained on the next memory command. `category` is optional on `upsert` only
 * — enrichment fills it, or the write fails naming the cause.
 */
export type MemoryMutation =
  | { op: 'upsert'; category?: string; id?: string; content: string; tags?: string[]; importance?: number; taskId?: string; createdAt?: string; enrichedAt?: string | null; fields?: Record<string, string>; supersededBy?: string | null; supersededAt?: string | null;
      /** @deprecated Use `category` instead. */ kind?: string; }
  | { op: 'update'; category: string; id: string; content?: string; tags?: string[]; importance?: number; taskId?: string; createdAt?: string; enrichedAt?: string | null; fields?: Record<string, string>; supersededBy?: string | null; supersededAt?: string | null;
      /** @deprecated Use `category` instead. */ kind?: string; }
  | { op: 'delete'; category: string; id: string;
      /** @deprecated Use `category` instead. */ kind?: string; };

export interface MutationResult {
  id: string;
  status: string; // 'created' | 'updated' | 'deleted' | 'not_found'
  project: string;
}

/**
 * One live entry violating its category's *currently*-declared field schema
 * (ticket 13 / ADR 0013's "Pre-existing entries: read and report, never
 * refuse to read" — a required field declared after the entry was written
 * is reported here, never a read-time error).
 */
export interface FieldComplianceViolation {
  id: string;
  category: string;
  /** Config keys (not flag names) of every required field with no stored value. */
  missingRequiredFields: string[];
}

/**
 * `neuron status --repair`'s outcome for one violating entry (ticket 13 /
 * ADR 0013). `applied` is what was safely written back — a configured
 * `default:`, or centroid-based inference for an enum-typed field. `unresolved`
 * is left exactly as reported: either a free-text identity field (never
 * fabricated) or an enum field with no confident centroid match yet.
 */
export interface FieldRepairOutcome {
  id: string;
  category: string;
  applied: Record<string, string>;
  unresolved: string[];
}

/** One member of a {@link DuplicateGroup}. */
export interface DuplicateGroupEntry {
  id: string;
  category: string;
  content: string;
}

/**
 * A cluster of live (non-superseded) entries whose pairwise embedding cosine
 * clears the same threshold the write-time supersession gate uses
 * (`SUPERSESSION_SIMILARITY_THRESHOLD`), transitively linked — every member
 * is within threshold of at least one other member, not necessarily all
 * (ticket 20 / neuron-2.4.0). `minSimilarity` is the weakest linking edge,
 * i.e. how confidently every member of the group can be called a
 * near-duplicate of at least one other member.
 */
export interface DuplicateGroup {
  entries: DuplicateGroupEntry[];
  minSimilarity: number;
}

/**
 * Store-health signals a maintainer previously had to compute by hand
 * (ticket 20 / neuron-2.4.0): near-duplicate clusters that slipped past the
 * write-time gate, importance's write-time-only distribution, and how much
 * of the store is dead weight (superseded, never surfaced again).
 */
export interface StoreHealth {
  duplicateGroups: DuplicateGroup[];
  /** Keyed by importance 1-5 (string keys, JSON-object convention); an absent key means zero entries at that level. */
  importanceHistogram: Record<number, number>;
  supersededCount: number;
}
