import { execSync } from 'node:child_process';
const all = [];
for (let off = 0; off < 300; off += 100) {
  const j = JSON.parse(execSync(
    `curl -sfL "https://datasets-server.huggingface.co/rows?dataset=princeton-nlp%2FSWE-bench_Lite&config=default&split=test&offset=${off}&length=100"`,
    { encoding: 'utf8', maxBuffer: 1 << 26 }));
  for (const r of j.rows) all.push(r.row.instance_id);
}
const subs = JSON.parse(execSync(
  `gh api repos/SWE-bench/experiments/contents/evaluation/lite --jq '[.[].name]'`, { encoding: 'utf8', maxBuffer: 1 << 26 }));
const solved = new Set();
let ok = 0;
for (const s of subs) {
  let j; try {
    j = JSON.parse(execSync(`curl -sfL https://raw.githubusercontent.com/SWE-bench/experiments/main/evaluation/lite/${s}/results/results.json`, { encoding: 'utf8', maxBuffer: 1 << 26 }));
  } catch { continue; }
  if (!Array.isArray(j.resolved)) continue;
  ok++; for (const id of j.resolved) solved.add(id);
}
const never = all.filter(id => !solved.has(id));
console.log(`Lite instances: ${all.length}; submissions: ${ok}; never solved by any: ${never.length}\n`);
const byRepo = {};
for (const id of never) { const r = id.split('__')[0]; (byRepo[r] ??= []).push(id); }
for (const [r, ids] of Object.entries(byRepo).sort((a,b)=>b[1].length-a[1].length)) console.log(`${r} (${ids.length}): ${ids.join(', ')}`);
