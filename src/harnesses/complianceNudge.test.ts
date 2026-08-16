import { describe, it, expect } from 'vitest';
import { buildComplianceNudge, PRE_STOP_NUDGE_TEXT } from './complianceNudge.js';

describe('buildComplianceNudge (src/harnesses/complianceNudge.ts)', () => {
  it('returns the reminder text when it fits the budget', () => {
    const nudge = buildComplianceNudge(PRE_STOP_NUDGE_TEXT.length);
    expect(nudge).toBe(PRE_STOP_NUDGE_TEXT);
  });

  it('points at the real write command, mirroring the proven A/B wording', () => {
    const nudge = buildComplianceNudge(1000);
    expect(nudge).toContain('neuron memory add');
    expect(nudge).toContain('fixed a failing command, build, or test');
  });

  it('returns null when the text does not fit the budget', () => {
    const nudge = buildComplianceNudge(PRE_STOP_NUDGE_TEXT.length - 1);
    expect(nudge).toBeNull();
  });

  it('returns null for a zero or negative budget', () => {
    expect(buildComplianceNudge(0)).toBeNull();
    expect(buildComplianceNudge(-5)).toBeNull();
  });
});
