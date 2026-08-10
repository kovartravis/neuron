import fs from 'node:fs';
import path from 'node:path';

/**
 * Renders the benchmark dashboard from the artifacts the suites write.
 *
 * Self-contained output: inline CSS/SVG, no network fetches, no chart library.
 * Charts use a single series hue because every plot here shows one measure
 * across categories (magnitude), not competing identities — categorical colors
 * would imply a distinction that does not exist. Pass/fail uses the reserved
 * status palette and always pairs color with an icon and a text label, so state
 * is never carried by hue alone.
 */

const LIGHT = {
  surface: '#fcfcfb', plane: '#f9f9f7', ink: '#0b0b0b', ink2: '#52514e',
  muted: '#898781', grid: '#e1e0d9', axis: '#c3c2b7', series: '#2a78d6',
  good: '#0ca30c', warning: '#fab219', critical: '#d03b3b',
  border: 'rgba(11,11,11,0.10)',
};
const DARK = {
  surface: '#1a1a19', plane: '#0d0d0d', ink: '#ffffff', ink2: '#c3c2b7',
  muted: '#898781', grid: '#2c2c2a', axis: '#383835', series: '#3987e5',
  good: '#0ca30c', warning: '#fab219', critical: '#d03b3b',
  border: 'rgba(255,255,255,0.10)',
};

export function generateDashboard(reportDir) {
  const scorecard = readJson(path.join(reportDir, 'e2e-benchmark-scorecard.json'));
  const adversarial = readJson(path.join(reportDir, 'adversarial-metrics.json'));
  const contention = readJson(path.join(reportDir, 'contention-metrics.json'));
  const history = readJson(path.join(reportDir, 'history.json')) ?? [];
  const tokenEconomics = readJson(path.join(reportDir, 'token-economics.json'));

  const advPillar = adversarial?.pillars?.find(p => p.pillar.includes('Adversarial'));
  const scalePillar = adversarial?.pillars?.find(p => p.pillar.includes('Scale Curve'));
  const contPillar = contention?.pillars?.find(p => p.pillar.includes('Contention'));

  const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Neuron Benchmark Report</title>
<style>
  :root {
    color-scheme: light;
${cssVars(LIGHT)}
  }
  @media (prefers-color-scheme: dark) {
    :root:where(:not([data-theme="light"])) {
      color-scheme: dark;
${cssVars(DARK)}
    }
  }
  :root[data-theme="dark"] {
    color-scheme: dark;
${cssVars(DARK)}
  }
  * { box-sizing: border-box; }
  body {
    margin: 0; padding: 0 1.5rem 4rem;
    background: var(--plane); color: var(--ink);
    font: 15px/1.55 system-ui, -apple-system, "Segoe UI", sans-serif;
  }
  .wrap { max-width: 1100px; margin: 0 auto; }
  header { padding: 2.5rem 0 1.5rem; }
  h1 { font-size: 1.5rem; margin: 0 0 .25rem; letter-spacing: -0.01em; }
  .sub { color: var(--ink2); font-size: .875rem; }
  h2 {
    font-size: .8125rem; text-transform: uppercase; letter-spacing: .07em;
    color: var(--muted); margin: 2.5rem 0 .875rem; font-weight: 600;
  }
  .card {
    background: var(--surface); border: 1px solid var(--border);
    border-radius: 10px; padding: 1.125rem 1.25rem;
  }
  .tiles { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: .75rem; }
  .tile .label { font-size: .75rem; color: var(--muted); text-transform: uppercase; letter-spacing: .05em; }
  .tile .value { font-size: 1.875rem; line-height: 1.15; margin-top: .35rem; }
  .tile .note { font-size: .8125rem; color: var(--ink2); margin-top: .15rem; }
  .pillars { display: flex; flex-direction: column; gap: .5rem; }
  .pillar { display: flex; gap: .875rem; align-items: flex-start; }
  .pillar .name { font-weight: 550; }
  .pillar .metrics {
    font-size: .8125rem; color: var(--ink2); margin-top: .3rem;
    font-variant-numeric: tabular-nums;
  }
  .status { display: inline-flex; align-items: center; gap: .3rem; font-size: .8125rem; font-weight: 600; white-space: nowrap; }
  .status.pass { color: var(--good); }
  .status.fail { color: var(--critical); }
  .status.warn { color: var(--warning); }
  .badge {
    display: inline-flex; align-items: center; gap: .35rem; padding: .2rem .5rem;
    border: 1px solid var(--border); border-radius: 999px;
    font-size: .75rem; color: var(--ink2);
  }
  table { border-collapse: collapse; width: 100%; font-size: .875rem; }
  th, td { text-align: left; padding: .5rem .6rem; border-bottom: 1px solid var(--grid); }
  th { color: var(--muted); font-weight: 600; font-size: .75rem; text-transform: uppercase; letter-spacing: .05em; }
  td.num, th.num { text-align: right; font-variant-numeric: tabular-nums; }
  .scroll { overflow-x: auto; }
  .muted { color: var(--muted); }
  .fail-list { font-size: .8125rem; color: var(--ink2); margin: .5rem 0 0; padding-left: 1.1rem; }
  .fail-list li { margin-bottom: .3rem; }
  .fail-list code { font-size: .78rem; color: var(--ink); }
  svg .grid { stroke: var(--grid); stroke-width: 1; }
  svg .axis { stroke: var(--axis); stroke-width: 1; }
  svg text { fill: var(--muted); font-size: 11px; }
  svg text.val { fill: var(--ink2); font-variant-numeric: tabular-nums; }
  svg .bar { fill: var(--series); }
  svg .bar:hover { opacity: .82; }
  svg .line { fill: none; stroke: var(--series); stroke-width: 2; }
  svg .dot { fill: var(--series); stroke: var(--surface); stroke-width: 2; }
  footer { margin-top: 3rem; font-size: .8125rem; color: var(--muted); }
</style>
</head>
<body>
<div class="wrap">
  <header>
    <h1>Neuron Benchmark Report</h1>
    <div class="sub">${escapeHtml(scorecard?.timestamp ?? 'no run recorded')} · tier <strong>${escapeHtml(adversarial?.tier ?? contention?.tier ?? 'unknown')}</strong></div>
  </header>

  ${renderHeadline(scorecard)}
  ${renderPillars(scorecard)}
  ${renderAdversarial(advPillar)}
  ${renderScaleCurve(scalePillar)}
  ${renderContention(contPillar)}
  ${renderTokenEconomics(tokenEconomics)}
  ${renderHistory(history)}

  <footer>
    Generated from <code>e2e-benchmark-scorecard.json</code>, <code>adversarial-metrics.json</code>,
    <code>contention-metrics.json</code>, and <code>token-economics.json</code>.
    Regenerate with <code>npm run bench:report</code>.
  </footer>
</div>
</body>
</html>`;

  const outPath = path.join(reportDir, 'index.html');
  fs.writeFileSync(outPath, html, 'utf8');
  return outPath;
}

// ---------- sections ----------

function renderHeadline(sc) {
  if (!sc) return '<div class="card muted">No scorecard found — run the benchmark first.</div>';
  const floorOk = sc.meetsRuntimeFloor;
  return `
  <div class="tiles">
    <div class="card tile">
      <div class="label">Grade</div>
      <div class="value">${escapeHtml(sc.grade ?? '—')}</div>
      <div class="note">${sc.pillarsPassed}/${sc.pillarsRan} pillars passed</div>
    </div>
    <div class="card tile">
      <div class="label">Status</div>
      <div class="value">${statusMark(sc.overallStatus === 'PASSED')}</div>
      <div class="note">${escapeHtml(sc.overallStatus ?? '—')}</div>
    </div>
    <div class="card tile">
      <div class="label">Duration</div>
      <div class="value">${sc.durationMin ?? '—'}<span style="font-size:.9rem;color:var(--ink2)"> min</span></div>
      <div class="note">${floorOk ? 'meets 5-min floor' : 'under 5-min floor'}</div>
    </div>
    <div class="card tile">
      <div class="label">Pass rate</div>
      <div class="value">${sc.scorePercent ?? 0}%</div>
      <div class="note">${sc.pillarsFailed ?? 0} failing</div>
    </div>
  </div>`;
}

function renderPillars(sc) {
  if (!sc?.pillars?.length) return '';
  const rows = sc.pillars.map(p => {
    const m = p.metrics ?? {};
    const bits = [];
    if (m.samples) bits.push(`n=${m.samples}`);
    if (m.p50Ms != null) bits.push(`p50 ${fmtMs(m.p50Ms)}`);
    if (m.p95Ms != null) bits.push(`p95 ${fmtMs(m.p95Ms)}`);
    if (m.p99Ms != null) bits.push(`p99 ${fmtMs(m.p99Ms)}`);
    return `
    <div class="pillar">
      <div style="min-width:5.5rem">${statusLabel(p.status)}</div>
      <div style="flex:1;min-width:0">
        <div class="name">${escapeHtml(p.pillar)}</div>
        ${bits.length ? `<div class="metrics">${bits.join(' · ')}</div>` : ''}
        ${(p.failureMessages ?? []).length ? `<div class="metrics" style="color:var(--critical)">↳ ${escapeHtml(String(p.failureMessages[0]).split('\n')[0].slice(0, 160))}</div>` : ''}
      </div>
    </div>`;
  }).join('');
  return `<h2>Pillars</h2><div class="card pillars">${rows}</div>`;
}

function renderAdversarial(p) {
  if (!p?.extra) return '';
  const e = p.extra;
  const fams = Object.entries(e.byFamily ?? {});
  const bars = fams.map(([name, s]) => ({ label: name, value: s.recallAt1, note: `MRR ${s.mrr}` }));

  const missed = (e.missedAtRank1 ?? []).map(f =>
    `<li><code>${escapeHtml(f.id)}</code> <span class="muted">(${escapeHtml(f.family)})</span> — gold at rank ${f.rank ?? '&gt;10'}<br><span class="muted">top hit: ${escapeHtml(f.topResult)}…</span></li>`
  ).join('');

  return `
  <h2>Adversarial retrieval</h2>
  <div class="card">
    <div class="tiles" style="margin-bottom:1.25rem">
      ${tile('recall@1', e.recallAt1, `${e.cases} cases`)}
      ${tile('recall@5', e.recallAt5, '')}
      ${tile('MRR', e.mrr, '')}
      ${tile('corpus', e.corpusSize, `${e.evaluations} evaluations`)}
    </div>
    ${bars.length ? `<div style="font-size:.8125rem;color:var(--ink2);margin-bottom:.5rem">recall@1 by adversary family — lower is a weakness</div>${hBarChart(bars, 1)}` : ''}
    ${e.supersededViolations != null ? `<div class="metrics" style="margin-top:.75rem;font-size:.8125rem;color:var(--ink2)">superseded-outranks-current violations: <strong>${e.supersededViolations}</strong></div>` : ''}
    ${missed ? `<div style="margin-top:1rem;font-size:.8125rem;color:var(--muted);text-transform:uppercase;letter-spacing:.05em">Missed at rank 1</div><ul class="fail-list">${missed}</ul>` : ''}
  </div>`;
}

function renderScaleCurve(p) {
  const curve = p?.extra?.curve;
  if (!curve?.length) return '';
  return `
  <h2>Retrieval scale curve</h2>
  <div class="card">
    <div style="font-size:.8125rem;color:var(--ink2);margin-bottom:.75rem">query latency (p50) as the corpus grows</div>
    ${lineChart(curve.map(c => ({ x: c.corpusSize, y: c.p50Ms })))}
    <div class="scroll" style="margin-top:1rem">
      <table>
        <thead><tr><th>Corpus</th><th class="num">p50</th><th class="num">p95</th><th class="num">recall@1</th></tr></thead>
        <tbody>${curve.map(c => `<tr><td>${c.corpusSize.toLocaleString()}</td><td class="num">${fmtMs(c.p50Ms)}</td><td class="num">${fmtMs(c.p95Ms)}</td><td class="num">${c.recallAt1}</td></tr>`).join('')}</tbody>
      </table>
    </div>
  </div>`;
}

function renderContention(p) {
  if (!p?.extra) return '';
  const e = p.extra;
  const lossOk = (e.lostWrites ?? 0) === 0;
  const crash = e.crashRecovery ?? [];
  return `
  <h2>Multi-process contention</h2>
  <div class="card">
    <div class="tiles">
      ${tile('processes', e.processes, `${e.writesPerWorker}/worker`)}
      ${tile('committed', e.committed, `of ${e.attempted} attempted`)}
      ${tile('dropped', e.droppedWrites, `${pct(e.droppedWriteRatio)} rejected on locks`)}
      ${tile('throughput', e.writesPerSec, 'writes/sec')}
    </div>
    <div class="metrics" style="margin-top:1rem;display:flex;gap:1.25rem;flex-wrap:wrap">
      <span class="status ${lossOk ? 'pass' : 'fail'}">${lossOk ? '✔' : '✖'} silent data loss: ${e.lostWrites}</span>
      <span class="status ${(e.initErrors ?? 0) === 0 ? 'pass' : 'fail'}">${(e.initErrors ?? 0) === 0 ? '✔' : '✖'} init crashes: ${e.initErrors ?? 0}</span>
      <span class="status ${(e.lockErrors ?? 0) === 0 ? 'pass' : 'warn'}">${(e.lockErrors ?? 0) === 0 ? '✔' : '!'} lock errors: ${e.lockErrors ?? 0}</span>
    </div>
    ${crash.length ? `<div class="scroll" style="margin-top:1rem"><table>
      <thead><tr><th>Crash round</th><th class="num">Seeded</th><th class="num">Survivors</th><th>Readable + writable after SIGKILL</th></tr></thead>
      <tbody>${crash.map(c => `<tr><td>${c.round}</td><td class="num">${c.seeded}</td><td class="num">${c.survivorsAfterCrash}</td><td>${statusLabel(c.readableAndWritableAfterCrash ? 'PASSED' : 'FAILED')}</td></tr>`).join('')}</tbody>
    </table></div>` : ''}
  </div>`;
}

function honestyBadge(band) {
  const cls = band === 'established' ? 'pass' : 'warn';
  const icon = band === 'established' ? '✔' : '!';
  return `<span class="status ${cls}">${icon} ${escapeHtml(band)}</span>`;
}

function renderAbSummary(ab) {
  if (!ab) return '';
  if (ab.honestyBand !== 'established') {
    return `<div class="card" style="margin-top:.75rem">
      <div style="display:flex;justify-content:space-between;align-items:baseline;gap:1rem">
        <div class="name">${escapeHtml(ab.title ?? `Ticket ${ab.ticket}`)}</div>
        ${honestyBadge(ab.honestyBand)}
      </div>
      <div class="metrics" style="margin-top:.4rem">${escapeHtml(ab.reason ?? '')}</div>
    </div>`;
  }
  const s = ab.summary;
  const arms = Object.entries(s.armStats);
  const rows = arms.map(([arm, st]) => `
    <tr>
      <td>${escapeHtml(arm)}</td>
      <td class="num">${st.sessions}</td>
      <td class="num">${pct(st.failureRate)}</td>
      <td class="num">${st.tokens.mean?.toLocaleString() ?? '—'}</td>
      <td class="num">$${st.costUsd.toFixed(3)}</td>
    </tr>`).join('');
  return `
  <div class="card" style="margin-top:.75rem">
    <div style="display:flex;justify-content:space-between;align-items:baseline;gap:1rem;flex-wrap:wrap">
      <div class="name">Ticket ${ab.ticket}${ab.supersedesTicket ? ` (supersedes ${ab.supersedesTicket})` : ''} — ${ab.sessionCount} sessions, $${ab.totalCostUsd} spent</div>
      ${honestyBadge(ab.honestyBand)}
    </div>
    <div class="scroll" style="margin-top:.75rem">
      <table>
        <thead><tr><th>Arm</th><th class="num">Sessions</th><th class="num">Failure rate</th><th class="num">Mean tokens</th><th class="num">Cost</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
    <div class="metrics" style="margin-top:.75rem">
      token diff ${s.tokenDiff?.toLocaleString()} vs spread ${s.spread?.toLocaleString()} —
      <strong>${s.noMeasuredDifference ? 'no measured difference' : 'measured difference'}</strong>
    </div>
    ${ab.narrative ? `<div class="metrics" style="margin-top:.5rem">${escapeHtml(ab.narrative)}</div>` : ''}
  </div>`;
}

function renderTokenEconomics(te) {
  if (!te) return '';
  const b = te.budget;
  const redRows = (te.redundancy?.byCategory ?? []).map(r => `
    <tr>
      <td>${escapeHtml(r.category)}</td>
      <td class="num">${r.uniqueEntries}</td>
      <td class="num">${r.meanSim}</td>
      <td class="num">${r.redundantEntriesAtBar}/${r.uniqueEntries} (${pct(r.redundantEntryFraction)})</td>
      <td class="num">${r.redundantOccurrencesAtBar}/${r.occurrences} (${pct(r.redundantOccurrenceFraction)})</td>
    </tr>`).join('');

  const notEstablished = (te.notEstablished ?? []).map(n => `
    <div class="card" style="margin-top:.75rem">
      <div style="display:flex;justify-content:space-between;align-items:baseline;gap:1rem">
        <div class="name">Ticket ${n.ticket} — ${escapeHtml(n.title)}</div>
        ${honestyBadge('not run')}
      </div>
      <div class="metrics" style="margin-top:.4rem">${escapeHtml(n.reason)}</div>
    </div>`).join('');

  return `
  <h2>Token economics — does neuron cost more than it returns?</h2>

  <div class="card">
    <div style="display:flex;justify-content:space-between;align-items:baseline;gap:1rem">
      <div class="name">Session budget (ticket 7)</div>
      ${honestyBadge(b?.honestyBand ?? 'not run')}
    </div>
    <div class="tiles" style="margin-top:.75rem">
      ${tile('epoch budget', `${b?.epochCharBudget?.toLocaleString() ?? '—'} chars`, `~${b?.epochTokenBudgetApprox?.toLocaleString() ?? '—'} tok @ ${b?.charsPerTokenRatio ?? '—'}:1`)}
      ${tile('median/epoch', b?.live?.medianCharsPerEpoch?.toLocaleString() ?? '—', 'this repo, live')}
      ${tile('p95/epoch', b?.live?.p95CharsPerEpoch?.toLocaleString() ?? '—', `of ${b?.live?.epochsObserved ?? '—'} epochs`)}
      ${tile('sessions observed', b?.live?.sessionsObserved ?? '—', 'this repo, live')}
    </div>
    ${b?.narrative ? `<div class="metrics" style="margin-top:.75rem">${escapeHtml(b.narrative)}</div>` : ''}
  </div>

  <div class="card" style="margin-top:.75rem">
    <div style="display:flex;justify-content:space-between;align-items:baseline;gap:1rem">
      <div class="name">Injection redundancy against resident context (ticket 8)</div>
      ${honestyBadge(te.redundancy?.honestyBand ?? 'not run')}
    </div>
    <div class="scroll" style="margin-top:.75rem">
      <table>
        <thead><tr><th>Category</th><th class="num">Unique entries</th><th class="num">Mean sim</th><th class="num">Entries ≥${te.redundancy?.bar ?? 0.7}</th><th class="num">Occurrences ≥${te.redundancy?.bar ?? 0.7}</th></tr></thead>
        <tbody>${redRows}</tbody>
      </table>
    </div>
    ${te.redundancy?.narrative ? `<div class="metrics" style="margin-top:.75rem">${escapeHtml(te.redundancy.narrative)}</div>` : ''}
  </div>

  <div style="margin-top:1rem;font-size:.8125rem;color:var(--muted);text-transform:uppercase;letter-spacing:.05em">Counterfactual A/Bs — memory arm vs no-memory control</div>
  ${renderAbSummary(te.counterfactualAb)}
  ${renderAbSummary(te.gitlogAb)}
  ${renderAbSummary(te.swebenchAb)}
  ${notEstablished}`;
}

function renderHistory(history) {
  if (!history.length) return '';
  const recent = history.slice(-12);
  return `
  <h2>Run history</h2>
  <div class="card scroll">
    <table>
      <thead><tr><th>When</th><th>Tier</th><th class="num">Pass</th><th class="num">Min</th><th class="num">adv recall@1</th><th class="num">dropped writes</th></tr></thead>
      <tbody>${recent.slice().reverse().map(h => `<tr>
        <td>${escapeHtml((h.timestamp ?? '').replace('T', ' ').slice(0, 16))}</td>
        <td>${escapeHtml(h.tier ?? '—')}</td>
        <td class="num">${h.pillarsPassed ?? '—'}/${h.pillarsRan ?? '—'}</td>
        <td class="num">${h.durationMin ?? '—'}</td>
        <td class="num">${h.adversarialRecallAt1 ?? '—'}</td>
        <td class="num">${h.droppedWriteRatio != null ? pct(h.droppedWriteRatio) : '—'}</td>
      </tr>`).join('')}</tbody>
    </table>
  </div>`;
}

// ---------- charts (inline SVG, one hue) ----------

function hBarChart(items, max) {
  const rowH = 30, labelW = 118, valW = 54, w = 620;
  const h = items.length * rowH + 8;
  const barW = w - labelW - valW;
  const rows = items.map((it, i) => {
    const y = i * rowH + 6;
    const len = Math.max(2, (it.value / max) * barW);
    return `
      <text x="${labelW - 10}" y="${y + 13}" text-anchor="end">${escapeHtml(it.label)}</text>
      <rect class="bar" x="${labelW}" y="${y + 2}" width="${len}" height="15" rx="4">
        <title>${escapeHtml(it.label)}: ${it.value} (${escapeHtml(it.note ?? '')})</title>
      </rect>
      <text class="val" x="${labelW + len + 8}" y="${y + 14}">${it.value}</text>`;
  }).join('');
  return `<svg viewBox="0 0 ${w} ${h}" width="100%" height="${h}" role="img" aria-label="recall at 1 by family">
    <line class="axis" x1="${labelW}" y1="4" x2="${labelW}" y2="${h - 4}"/>${rows}</svg>`;
}

function lineChart(points) {
  const w = 620, h = 200, padL = 52, padR = 16, padT = 12, padB = 34;
  const xs = points.map(p => p.x), ys = points.map(p => p.y);
  const xMin = Math.min(...xs), xMax = Math.max(...xs);
  const yMax = Math.max(...ys) * 1.15 || 1;
  const sx = x => padL + (xMax === xMin ? 0.5 : (x - xMin) / (xMax - xMin)) * (w - padL - padR);
  const sy = y => h - padB - (y / yMax) * (h - padT - padB);

  const gridLines = [0, 0.5, 1].map(f => {
    const y = sy(yMax * f);
    return `<line class="grid" x1="${padL}" y1="${y}" x2="${w - padR}" y2="${y}"/>
            <text x="${padL - 8}" y="${y + 4}" text-anchor="end">${fmtMs(round1(yMax * f))}</text>`;
  }).join('');

  const d = points.map((p, i) => `${i ? 'L' : 'M'}${sx(p.x).toFixed(1)},${sy(p.y).toFixed(1)}`).join('');
  const dots = points.map(p =>
    `<circle class="dot" cx="${sx(p.x).toFixed(1)}" cy="${sy(p.y).toFixed(1)}" r="4.5"><title>${p.x.toLocaleString()} memories: ${fmtMs(p.y)}</title></circle>
     <text x="${sx(p.x).toFixed(1)}" y="${h - padB + 16}" text-anchor="middle">${p.x >= 1000 ? (p.x / 1000) + 'k' : p.x}</text>`
  ).join('');

  return `<svg viewBox="0 0 ${w} ${h}" width="100%" height="${h}" role="img" aria-label="query latency versus corpus size">
    ${gridLines}
    <line class="axis" x1="${padL}" y1="${h - padB}" x2="${w - padR}" y2="${h - padB}"/>
    <path class="line" d="${d}"/>${dots}</svg>`;
}

// ---------- helpers ----------

function tile(label, value, note) {
  return `<div class="tile"><div class="label">${escapeHtml(label)}</div><div class="value">${escapeHtml(String(value ?? '—'))}</div>${note ? `<div class="note">${escapeHtml(note)}</div>` : ''}</div>`;
}
function statusLabel(status) {
  const pass = status === 'PASSED';
  const skip = status === 'SKIPPED';
  if (skip) return `<span class="status warn">⏭ SKIPPED</span>`;
  return `<span class="status ${pass ? 'pass' : 'fail'}">${pass ? '✔' : '✖'} ${pass ? 'PASSED' : 'FAILED'}</span>`;
}
function statusMark(ok) {
  return `<span style="color:var(--${ok ? 'good' : 'critical'})">${ok ? '✔' : '✖'}</span>`;
}
function fmtMs(ms) {
  if (ms == null) return '—';
  return ms >= 1000 ? `${(ms / 1000).toFixed(2)}s` : `${Math.round(ms)}ms`;
}
function pct(r) { return r == null ? '—' : `${(r * 100).toFixed(1)}%`; }
function round1(n) { return Math.round(n * 10) / 10; }
function readJson(p) { try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch { return null; } }
function cssVars(t) {
  return Object.entries(t).map(([k, v]) => `    --${k}: ${v};`).join('\n');
}
function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const dir = path.resolve(process.argv[2] ?? 'benchmarks/reports');
  const out = generateDashboard(dir);
  console.log(`Dashboard written to ${out}`);
}
