import { describe, it, expect } from 'vitest';
import type { MaintenancePolicy, MaintenanceReport } from './maintenance.js';

describe('Maintenance Component Contracts (src/components/maintenance.ts)', () => {
  it('should validate MaintenancePolicy configuration', () => {
    const policy: MaintenancePolicy = {
      pruneHistoryBeforeDays: 30,
      maxPruneImportance: 2,
      autoPromote: true,
      consolidate: true
    };

    expect(policy.pruneHistoryBeforeDays).toBe(30);
    expect(policy.maxPruneImportance).toBe(2);
    expect(policy.autoPromote).toBe(true);
  });

  it('should construct a valid MaintenanceReport structure', () => {
    const report: MaintenanceReport = {
      consolidated: {
        entries: [],
        consolidatedAt: new Date().toISOString(),
        previousCursor: null
      },
      promotions: {
        promoted: [{ id: 'hist-1', from: 'history', to: 'learning' }],
        demoted: []
      },
      prunedCount: 5,
      project: 'neuron'
    };

    expect(report.prunedCount).toBe(5);
    expect(report.promotions?.promoted).toHaveLength(1);
    expect(report.project).toBe('neuron');
  });
});
