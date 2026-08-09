import { execSync } from 'node:child_process';
const split = process.argv[2] ?? 'lite';
const subs = JSON.parse(execSync(
  `gh api repos/SWE-bench/experiments/contents/evaluation/${split} --jq '[.[].name]'`,
  { encoding: 'utf8', maxBuffer: 1 << 26 }));
const counts = new Map();
let ok = 0;
for (const s of subs) {
  let j;
  try {
    j = JSON.parse(execSync(
      `curl -sfL https://raw.githubusercontent.com/SWE-bench/experiments/main/evaluation/${split}/${s}/results/results.json`,
      { encoding: 'utf8', maxBuffer: 1 << 26 }));
  } catch { continue; }
  if (!Array.isArray(j.resolved)) continue;
  ok++;
  for (const id of j.resolved) counts.set(id, (counts.get(id) ?? 0) + 1);
}
console.log(`split=${split} submissions_with_results=${ok}/${subs.length}`);
const rows = [...counts.entries()].sort((a, b) => a[1] - b[1]);
console.log(`instances_solved_by_at_least_one=${rows.length}`);
console.log('\n--- rarest solved (bottom 25) ---');
for (const [id, n] of rows.slice(0, 25)) console.log(String(n).padStart(3), (n / ok * 100).toFixed(1).padStart(5) + '%', id);
const probe = process.argv.slice(3);
if (probe.length) {
  console.log('\n--- probed instances ---');
  for (const p of probe) {
    const n = counts.get(p) ?? 0;
    console.log(String(n).padStart(3), (n / ok * 100).toFixed(1).padStart(5) + '%', p);
  }
}
