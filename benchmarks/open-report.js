import { spawn } from 'node:child_process';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { generateDashboard } from './generate-dashboard.js';

/**
 * Regenerates the dashboard from whatever artifacts are on disk and opens it.
 * Kept separate from the runner so the report can be viewed without re-running
 * a benchmark that takes minutes.
 */
const reportDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), 'reports');

if (!fs.existsSync(path.join(reportDir, 'e2e-benchmark-scorecard.json'))) {
  console.error('No benchmark results found. Run `npm run test:e2e` (sanity) or `npm run bench` (full) first.');
  process.exit(1);
}

const out = generateDashboard(reportDir);
console.log(`Dashboard: ${out}`);

const opener = process.platform === 'darwin' ? 'open' : process.platform === 'win32' ? 'start' : 'xdg-open';
spawn(opener, [out], { stdio: 'ignore', detached: true, shell: process.platform === 'win32' }).unref();
