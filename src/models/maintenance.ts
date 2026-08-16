import { Memory } from './memory.js';

export interface MaintenancePolicy {
  /** Category `pruneHistoryBeforeDays`/`consolidate` operate on. Required whenever either is set. */
  category?: string;
  pruneHistoryBeforeDays?: number;
  maxPruneImportance?: number;
  consolidate?: boolean;
}

export interface MaintenanceReport {
  consolidated?: {
    entries: Memory[];
    consolidatedAt: string;
    previousCursor: string | null;
  };
  prunedCount?: number;
  project: string;
}
