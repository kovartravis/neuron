/**
 * Cheap edit distance, only ever called on an error path (a typo'd CLI flag
 * or enum value). Shared between `commands/utils.ts` (unknown-flag
 * suggestions) and `NeuronMemory`'s field-schema enforcement (enum-value
 * suggestions, ticket 43) so the two surfaces suggest corrections the same
 * way rather than drifting into two slightly different heuristics.
 */
export function editDistance(a: string, b: string): number {
  const d: number[][] = Array.from({ length: a.length + 1 }, (_, i) =>
    Array.from({ length: b.length + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0))
  );
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      d[i][j] = Math.min(
        d[i - 1][j] + 1,
        d[i][j - 1] + 1,
        d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)
      );
    }
  }
  return d[a.length][b.length];
}

/** Closest candidate within edit distance 2, or undefined if nothing is close. */
export function suggestClosest(value: string, candidates: string[]): string | undefined {
  const near = candidates
    .map(c => [c, editDistance(value, c)] as const)
    .filter(([, dist]) => dist <= 2)
    .sort((x, y) => x[1] - y[1])[0];
  return near?.[0];
}
