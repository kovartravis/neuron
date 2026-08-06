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
   * config key. Round-trips through markdown frontmatter today; SQLite
   * column storage for `vector-only`/`split` categories ships in ticket 44,
   * so a value set here is not yet guaranteed to survive a pure-vector row.
   */
  fields?: Record<string, string>;
}

/**
 * `enrichedAt` marks a write as having been through write-side enrichment.
 * It is set by `NeuronMemory.transact`, never by a caller: an entry that
 * reaches storage with it unset is in the enrichment backlog and will be
 * drained on the next memory command. `category` is optional on `upsert` only
 * — enrichment fills it, or the write fails naming the cause.
 */
export type MemoryMutation =
  | { op: 'upsert'; category?: string; id?: string; content: string; tags?: string[]; importance?: number; taskId?: string; createdAt?: string; enrichedAt?: string | null; fields?: Record<string, string>;
      /** @deprecated Use `category` instead. */ kind?: string; }
  | { op: 'update'; category: string; id: string; content?: string; tags?: string[]; importance?: number; taskId?: string; createdAt?: string; enrichedAt?: string | null; fields?: Record<string, string>;
      /** @deprecated Use `category` instead. */ kind?: string; }
  | { op: 'delete'; category: string; id: string;
      /** @deprecated Use `category` instead. */ kind?: string; };

export interface MutationResult {
  id: string;
  status: string; // 'created' | 'updated' | 'deleted' | 'not_found'
  project: string;
}
