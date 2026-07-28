import { spawnSync, spawn } from 'node:child_process';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const ambDir = path.join(rootDir, 'benchmarks', 'agent-memory-benchmark');

const args = process.argv.slice(2);
const isView = args.includes('--view');
const isFull = args.includes('--full');
const isSanity = args.includes('--sanity') || (!isView && !isFull && !args.some(a => a.startsWith('--limit')));

console.log('==================================================');
console.log(' 🧠 Neuron Agent Memory Benchmark Orchestrator');
console.log('==================================================\n');

if (isView) {
  console.log('Launching Agent Memory Benchmark Web Viewer...');
  console.log('Dashboard available at: http://localhost:7979\n');
  const child = spawn('neuron', ['exec', '--', '/Users/Travis/Library/Python/3.9/bin/uv', 'run', 'omb', 'view', '--port', '7979'], {
    cwd: ambDir,
    stdio: 'inherit'
  });
  child.on('exit', (code) => process.exit(code || 0));
} else {
  console.log('Step 1: Rebuilding latest Neuron typescript package...');
  const buildResult = spawnSync('npm', ['run', 'build'], { cwd: rootDir, stdio: 'inherit' });
  if (buildResult.status !== 0) {
    console.error('❌ Build failed. Aborting benchmark.');
    process.exit(1);
  }

  console.log('\nStep 2: Cleaning old benchmark output state to prevent data poisoning...');
  const outputStore = path.join(ambDir, 'outputs', 'personamem', 'neuron');
  if (fs.existsSync(outputStore)) {
    fs.rmSync(outputStore, { recursive: true, force: true });
  }

  let limitArg = '';
  if (isSanity) {
    console.log('\nStep 3: Running Sanity Check Benchmark (20 queries)...');
    limitArg = '--query-limit 20';
  } else if (isFull) {
    console.log('\nStep 3: Running Full Benchmark Suite (589 queries, overnight mode)...');
  } else {
    const limitIdx = args.indexOf('--limit');
    if (limitIdx !== -1 && args[limitIdx + 1]) {
      limitArg = `--query-limit ${args[limitIdx + 1]}`;
    }
  }

  const runCmd = `neuron exec -- /Users/Travis/Library/Python/3.9/bin/uv run omb run --dataset personamem --split 32k --memory neuron ${limitArg}`.trim();
  console.log(`Executing: ${runCmd}\n`);

  const runResult = spawnSync('sh', ['-c', runCmd], { cwd: ambDir, stdio: 'inherit' });
  if (runResult.status !== 0) {
    console.error('❌ Benchmark execution failed.');
    process.exit(runResult.status || 1);
  }

  console.log('\nStep 4: Compressing results & updating dashboard manifest...');
  spawnSync('sh', ['-c', 'neuron exec -- /Users/Travis/Library/Python/3.9/bin/uv run omb compress'], { cwd: ambDir, stdio: 'inherit' });
  spawnSync('sh', ['-c', 'neuron exec -- /Users/Travis/Library/Python/3.9/bin/uv run python scripts/update_manifest.py'], { cwd: ambDir, stdio: 'inherit' });

  console.log('\n==================================================');
  console.log(' ✅ Benchmark completed successfully!');
  console.log(' 📊 View results at http://localhost:7979');
  console.log('==================================================\n');
}
