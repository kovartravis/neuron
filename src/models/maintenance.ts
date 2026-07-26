import { Memory } from './memory.js';

export interface MaintenancePolicy {
  pruneHistoryBeforeDays?: number;
  maxPruneImportance?: number;
  autoPromote?: boolean;
  consolidate?: boolean;
}

export interface MaintenanceReport {
  consolidated?: {
    entries: Memory[];
    consolidatedAt: string;
    previousCursor: string | null;
  };
  promotions?: {
    promoted: Array<{ id: string; from: string; to: string }>;
    demoted: Array<{ id: string; from: string; to: string }>;
  };
  prunedCount?: number;
  project: string;
}
