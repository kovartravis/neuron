import { defineConfig } from 'vitest/config';

/**
 * Runs the salvage calibration probe on demand without letting it join the
 * normal suites. The probe is named `.probe.ts` rather than `.test.ts` so a
 * bare `vitest` run never collects it; this config names it explicitly.
 *
 *   node ./node_modules/vitest/vitest.mjs run \
 *     --config benchmarks/salvage-expansion/vitest.probe.config.ts
 */
export default defineConfig({
  root: process.cwd(),
  test: {
    include: ['benchmarks/salvage-expansion/salvage-calibration.probe.ts'],
    testTimeout: 600000,
    hookTimeout: 600000,
  },
});
