export function generateDashboardHtml(): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Neuron</title>
  <meta name="description" content="Neuron local agent memory — browse learnings and history." />
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet" />
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

    :root {
      --bg:        #111110;
      --surface:   #191918;
      --surface-2: #222220;
      --border:    #2e2e2c;
      --border-2:  #3a3a38;
      --text-1:    #e8e8e6;
      --text-2:    #8f8f8d;
      --text-3:    #555552;
      --accent:    #e8a94d;
      --accent-dim:rgba(232,169,77,0.12);
      --accent-border:rgba(232,169,77,0.3);
      --blue:      #4a8ef5;
      --blue-dim:  rgba(74,142,245,0.1);
      --red-dim:   rgba(220,80,70,0.12);
      --red:       #dc5046;
      --radius:    8px;
      --radius-sm: 5px;
    }

    html, body {
      min-height: 100vh;
      background: var(--bg);
      color: var(--text-1);
      font-family: 'Inter', system-ui, sans-serif;
      font-size: 13px;
      line-height: 1.5;
      -webkit-font-smoothing: antialiased;
    }

    /* ---- Layout ---- */
    .layout { display: grid; grid-template-rows: auto 1fr; min-height: 100vh; }

    /* ---- Topbar ---- */
    .topbar {
      display: flex; align-items: center; gap: 20px;
      border-bottom: 1px solid var(--border);
      padding: 0 24px; height: 48px;
    }
    .wordmark {
      font-size: 13px; font-weight: 600; color: var(--text-1);
      letter-spacing: -0.2px;
    }
    .wordmark span { color: var(--text-3); font-weight: 400; }
    .topbar-meta {
      margin-left: auto; display: flex; align-items: center; gap: 12px;
    }
    .meta-item {
      font-size: 12px; color: var(--text-2);
      display: flex; align-items: center; gap: 5px;
    }
    .meta-item strong { color: var(--text-1); font-weight: 500; }
    .sep { color: var(--text-3); }
    .status-dot {
      width: 6px; height: 6px; border-radius: 50%;
      background: #4caf7d; flex-shrink: 0;
    }
    .status-dot.warn { background: var(--accent); }

    /* ---- Body ---- */
    .body { display: grid; grid-template-columns: 1fr 1fr; min-height: 0; }
    @media (max-width: 860px) { .body { grid-template-columns: 1fr; } }

    /* ---- Panel ---- */
    .panel { display: flex; flex-direction: column; border-right: 1px solid var(--border); }
    .panel:last-child { border-right: none; }

    .panel-header {
      display: flex; align-items: center; justify-content: space-between;
      padding: 16px 20px 14px;
      border-bottom: 1px solid var(--border);
      position: sticky; top: 0; background: var(--bg); z-index: 10;
    }
    .panel-title {
      font-size: 12px; font-weight: 600;
      text-transform: uppercase; letter-spacing: 0.6px;
      color: var(--text-2);
    }
    .count-badge {
      font-size: 11px; color: var(--text-3);
      font-variant-numeric: tabular-nums;
    }

    /* ---- Search ---- */
    .search-bar {
      display: flex; align-items: center; gap: 0;
      border-bottom: 1px solid var(--border);
      background: var(--surface);
    }
    .search-bar-inner {
      display: flex; align-items: center; gap: 0;
      flex: 1;
    }
    .search-icon {
      padding: 0 12px; color: var(--text-3); flex-shrink: 0;
      display: flex; align-items: center;
    }
    .search-input {
      flex: 1; background: none; border: none; outline: none;
      color: var(--text-1); font-family: inherit; font-size: 13px;
      padding: 10px 0; min-width: 0;
    }
    .search-input::placeholder { color: var(--text-3); }
    .search-btn {
      background: none; border: none; border-left: 1px solid var(--border);
      color: var(--text-2); cursor: pointer; font-family: inherit;
      font-size: 12px; font-weight: 500;
      padding: 0 14px; height: 100%; min-height: 38px;
      transition: color 0.1s, background 0.1s;
      white-space: nowrap;
    }
    .search-btn:hover { background: var(--surface-2); color: var(--text-1); }
    .search-btn:disabled { opacity: 0.4; cursor: not-allowed; }

    /* ---- Search results notice ---- */
    .search-notice {
      padding: 8px 16px; font-size: 11px; color: var(--text-3);
      border-bottom: 1px solid var(--border);
      background: var(--surface);
      display: flex; align-items: center; justify-content: space-between;
    }
    .search-clear {
      background: none; border: none; cursor: pointer;
      color: var(--text-3); font-size: 11px; padding: 0;
    }
    .search-clear:hover { color: var(--text-1); }

    /* ---- Entry list ---- */
    .entry-list { flex: 1; overflow-y: auto; }

    .entry {
      padding: 13px 20px;
      border-bottom: 1px solid var(--border);
      transition: background 0.1s;
      cursor: default;
    }
    .entry:last-child { border-bottom: none; }
    .entry:hover { background: var(--surface); }

    .entry-content {
      color: var(--text-1); font-size: 13px; line-height: 1.55;
      margin-bottom: 8px;
      display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical;
      overflow: hidden;
    }

    .entry-meta {
      display: flex; align-items: center; flex-wrap: wrap; gap: 6px;
    }

    .tag {
      font-size: 11px; color: var(--text-3);
      background: var(--surface-2); border: 1px solid var(--border);
      border-radius: var(--radius-sm); padding: 1px 7px;
      font-family: 'JetBrains Mono', monospace;
    }

    .scope-tag {
      font-size: 11px; color: var(--text-2);
      background: var(--surface-2); border: 1px solid var(--border-2);
      border-radius: var(--radius-sm); padding: 1px 7px;
      font-weight: 500;
    }
    .scope-tag.global {
      color: var(--accent); background: var(--accent-dim); border-color: var(--accent-border);
    }
    .scope-tag.project {
      color: var(--blue); background: var(--blue-dim); border-color: rgba(74,142,245,0.25);
    }

    .imp-bar {
      display: flex; align-items: center; gap: 3px;
    }
    .imp-seg {
      width: 12px; height: 3px; border-radius: 2px;
      background: var(--border-2);
    }
    .imp-seg.on { background: var(--text-3); }
    .imp-5 .imp-seg.on { background: var(--red); }
    .imp-4 .imp-seg.on { background: var(--accent); }
    .imp-3 .imp-seg.on { background: var(--blue); }

    .task-id {
      font-size: 11px; font-family: 'JetBrains Mono', monospace;
      color: var(--text-3);
    }

    .ts {
      font-size: 11px; color: var(--text-3);
      font-family: 'JetBrains Mono', monospace;
      margin-left: auto;
    }

    .score-tag {
      font-size: 11px; font-family: 'JetBrains Mono', monospace;
      color: var(--blue); font-weight: 500;
    }

    /* ---- Empty / loading ---- */
    .state-msg {
      padding: 48px 20px; text-align: center;
      color: var(--text-3); font-size: 13px;
    }
    .state-msg p { margin-top: 4px; font-size: 12px; }

    /* ---- View all row ---- */
    .view-all-row {
      padding: 10px 20px; border-top: 1px solid var(--border);
      position: sticky; bottom: 0; background: var(--bg);
    }
    .view-all-btn {
      background: none; border: 1px solid var(--border);
      border-radius: var(--radius-sm); color: var(--text-2);
      cursor: pointer; font-family: inherit; font-size: 12px;
      padding: 5px 12px; width: 100%;
      transition: background 0.1s, border-color 0.1s, color 0.1s;
    }
    .view-all-btn:hover { background: var(--surface-2); border-color: var(--border-2); color: var(--text-1); }

    /* ---- Modal ---- */
    .modal-backdrop {
      position: fixed; inset: 0;
      background: rgba(0,0,0,0.6);
      display: flex; align-items: flex-start; justify-content: center;
      z-index: 100; padding: 48px 16px; overflow-y: auto;
      opacity: 0; pointer-events: none; transition: opacity 0.15s;
    }
    .modal-backdrop.open { opacity: 1; pointer-events: all; }
    .modal {
      background: var(--surface); border: 1px solid var(--border);
      border-radius: 10px; width: 100%; max-width: 680px;
      transform: translateY(-8px); transition: transform 0.15s;
      display: flex; flex-direction: column; max-height: 80vh;
    }
    .modal-backdrop.open .modal { transform: translateY(0); }
    .modal-head {
      display: flex; align-items: center; justify-content: space-between;
      padding: 14px 18px; border-bottom: 1px solid var(--border);
      flex-shrink: 0;
    }
    .modal-head-title { font-size: 13px; font-weight: 600; color: var(--text-1); }
    .modal-close {
      background: none; border: none; cursor: pointer;
      color: var(--text-3); font-size: 16px; line-height: 1;
      padding: 2px 4px; transition: color 0.1s;
    }
    .modal-close:hover { color: var(--text-1); }
    .modal-body { overflow-y: auto; flex: 1; }
    .modal-body .entry { border-bottom: 1px solid var(--border); }

    /* ---- Scrollbar ---- */
    ::-webkit-scrollbar { width: 5px; }
    ::-webkit-scrollbar-track { background: transparent; }
    ::-webkit-scrollbar-thumb { background: var(--border-2); border-radius: 3px; }
  </style>
</head>
<body>
<div class="layout">

  <header class="topbar">
    <span class="wordmark">neuron <span>/ memory</span></span>
    <div class="topbar-meta">
      <span class="meta-item"><span class="status-dot" id="db-dot"></span> <strong id="project-name">—</strong></span>
      <span class="sep">·</span>
      <span class="meta-item"><strong id="learn-count">—</strong> learnings</span>
      <span class="sep">·</span>
      <span class="meta-item"><strong id="history-count">—</strong> history</span>
      <span class="meta-item" id="model-warn" style="display:none"><span class="status-dot warn"></span> model not cached</span>
    </div>
  </header>

  <div class="body">

    <!-- Learnings panel -->
    <div class="panel" id="panel-learnings">
      <div class="panel-header">
        <span class="panel-title">Learnings</span>
        <span class="count-badge" id="learnings-count-badge"></span>
      </div>
      <div class="search-bar" id="sb-learnings">
        <div class="search-bar-inner">
          <span class="search-icon">
            <svg width="13" height="13" fill="none" stroke="currentColor" stroke-width="1.8" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
          </span>
          <input class="search-input" id="q-learnings" type="text" placeholder="Search learnings…" autocomplete="off" />
        </div>
        <button class="search-btn" id="btn-search-learnings">Search</button>
      </div>
      <div id="learnings-notice" style="display:none" class="search-notice">
        <span id="learnings-notice-text"></span>
        <button class="search-clear" id="btn-clear-learnings">Clear</button>
      </div>
      <div class="entry-list" id="learnings-list">
        <div class="state-msg">Loading…</div>
      </div>
      <div class="view-all-row">
        <button class="view-all-btn" id="btn-all-learnings">View all learnings</button>
      </div>
    </div>

    <!-- History panel -->
    <div class="panel" id="panel-history">
      <div class="panel-header">
        <span class="panel-title">History</span>
        <span class="count-badge" id="history-count-badge"></span>
      </div>
      <div class="search-bar" id="sb-history">
        <div class="search-bar-inner">
          <span class="search-icon">
            <svg width="13" height="13" fill="none" stroke="currentColor" stroke-width="1.8" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
          </span>
          <input class="search-input" id="q-history" type="text" placeholder="Search history…" autocomplete="off" />
        </div>
        <button class="search-btn" id="btn-search-history">Search</button>
      </div>
      <div id="history-notice" style="display:none" class="search-notice">
        <span id="history-notice-text"></span>
        <button class="search-clear" id="btn-clear-history">Clear</button>
      </div>
      <div class="entry-list" id="history-list">
        <div class="state-msg">Loading…</div>
      </div>
      <div class="view-all-row">
        <button class="view-all-btn" id="btn-all-history">View all history</button>
      </div>
    </div>

  </div>
</div>

<!-- Modal: all learnings -->
<div class="modal-backdrop" id="modal-learnings" role="dialog" aria-modal="true">
  <div class="modal">
    <div class="modal-head">
      <span class="modal-head-title">All Learnings</span>
      <button class="modal-close" id="close-learnings">✕</button>
    </div>
    <div class="modal-body" id="modal-learnings-body">
      <div class="state-msg">Loading…</div>
    </div>
  </div>
</div>

<!-- Modal: all history -->
<div class="modal-backdrop" id="modal-history" role="dialog" aria-modal="true">
  <div class="modal">
    <div class="modal-head">
      <span class="modal-head-title">All History</span>
      <button class="modal-close" id="close-history">✕</button>
    </div>
    <div class="modal-body" id="modal-history-body">
      <div class="state-msg">Loading…</div>
    </div>
  </div>
</div>

<script>
(function () {
  function esc(s) {
    return String(s ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  }

  function relTime(iso) {
    const diff = Date.now() - new Date(iso).getTime();
    const s = Math.floor(diff / 1000);
    if (s < 60)  return s + 's';
    const m = Math.floor(s / 60);
    if (m < 60)  return m + 'm';
    const h = Math.floor(m / 60);
    if (h < 24)  return h + 'h';
    const d = Math.floor(h / 24);
    if (d < 30)  return d + 'd';
    return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }

  function impBar(imp) {
    const n = imp ?? 3;
    const cls = n >= 5 ? 'imp-5' : n >= 4 ? 'imp-4' : n >= 3 ? 'imp-3' : '';
    const segs = [1,2,3,4,5].map(i =>
      '<span class="imp-seg' + (i <= n ? ' on' : '') + '"></span>'
    ).join('');
    return '<span class="imp-bar ' + cls + '" title="Importance ' + n + '">' + segs + '</span>';
  }

  function scopeTag(scope) {
    if (!scope) return '';
    const cls = scope === 'global' ? 'global' : scope === 'project' ? 'project' : '';
    return '<span class="scope-tag ' + cls + '">' + esc(scope) + '</span>';
  }

  function tags(arr) {
    return (arr || []).map(t => '<span class="tag">' + esc(t) + '</span>').join('');
  }

  function renderLearning(item, showScore) {
    return '<div class="entry">' +
      '<div class="entry-content">' + esc(item.content) + '</div>' +
      '<div class="entry-meta">' +
        impBar(item.importance) +
        scopeTag(item.scope) +
        tags(item.tags) +
        (showScore && item.score != null ? '<span class="score-tag">' + Math.round(item.score * 100) + '%</span>' : '') +
        (item.createdAt ? '<span class="ts">' + relTime(item.createdAt) + '</span>' : '') +
      '</div>' +
    '</div>';
  }

  function renderHistory(item, showScore) {
    return '<div class="entry">' +
      '<div class="entry-content">' + esc(item.content) + '</div>' +
      '<div class="entry-meta">' +
        (item.taskId ? '<span class="task-id">' + esc(item.taskId) + '</span>' : '') +
        tags(item.tags) +
        (showScore && item.score != null ? '<span class="score-tag">' + Math.round(item.score * 100) + '%</span>' : '') +
        (item.createdAt ? '<span class="ts">' + relTime(item.createdAt) + '</span>' : '') +
      '</div>' +
    '</div>';
  }

  function empty(msg) {
    return '<div class="state-msg">' + esc(msg) + '</div>';
  }

  // ---- API ----
  async function api(path) {
    const r = await fetch(path);
    if (!r.ok) throw new Error(r.statusText);
    return r.json();
  }

  async function loadStatus() {
    const d = await api('/api/status');
    document.getElementById('project-name').textContent = d.project || '—';
    document.getElementById('learn-count').textContent  = d.learnCount ?? '—';
    document.getElementById('history-count').textContent = d.historyCount ?? '—';
    if (d.model !== 'ready') {
      document.getElementById('model-warn').style.display = '';
    }
  }

  async function loadPanel(kind, q, limit) {
    const qs = q ? '?q=' + encodeURIComponent(q) + '&limit=' + limit : '?limit=' + limit;
    const d = await api('/api/' + kind + qs);
    return d.results || [];
  }

  // ---- Render panel ----
  async function renderPanel(kind, q) {
    const listEl  = document.getElementById(kind + '-list');
    const badgeEl = document.getElementById(kind + '-count-badge');
    const noticeEl = document.getElementById(kind + '-notice');
    const noticeTextEl = document.getElementById(kind + '-notice-text');

    listEl.innerHTML = '<div class="state-msg">Loading…</div>';

    const isSearch = !!(q && q.trim());
    const limit = isSearch ? 20 : 12;

    try {
      const items = await loadPanel(kind, isSearch ? q : null, limit);
      badgeEl.textContent = items.length ? items.length + (isSearch ? ' results' : '') : '';

      if (noticeEl) {
        if (isSearch) {
          noticeTextEl.textContent = items.length + ' result' + (items.length !== 1 ? 's' : '') + ' for "' + q + '"';
          noticeEl.style.display = '';
        } else {
          noticeEl.style.display = 'none';
        }
      }

      if (!items.length) {
        listEl.innerHTML = empty(isSearch ? 'No results.' : 'Nothing here yet.');
        return;
      }
      listEl.innerHTML = items.map(i =>
        kind === 'learnings' ? renderLearning(i, isSearch) : renderHistory(i, isSearch)
      ).join('');
    } catch(e) {
      listEl.innerHTML = empty('Failed to load: ' + e.message);
    }
  }

  // ---- Search wiring ----
  function wireSearch(kind) {
    const input = document.getElementById('q-' + kind);
    const btn   = document.getElementById('btn-search-' + kind);
    const clearBtn = document.getElementById('btn-clear-' + kind);

    async function run() {
      btn.disabled = true;
      await renderPanel(kind, input.value);
      btn.disabled = false;
    }
    btn.addEventListener('click', run);
    input.addEventListener('keydown', e => { if (e.key === 'Enter') run(); });
    clearBtn.addEventListener('click', () => {
      input.value = '';
      renderPanel(kind, '');
    });
  }

  // ---- Modals ----
  function openModal(id) {
    document.getElementById('modal-' + id).classList.add('open');
    document.body.style.overflow = 'hidden';
  }
  function closeModal(id) {
    document.getElementById('modal-' + id).classList.remove('open');
    document.body.style.overflow = '';
  }

  async function openAll(kind) {
    openModal(kind);
    const bodyEl = document.getElementById('modal-' + kind + '-body');
    bodyEl.innerHTML = '<div class="state-msg">Loading…</div>';
    try {
      const items = await loadPanel(kind, null, 500);
      bodyEl.innerHTML = items.length
        ? items.map(i => kind === 'learnings' ? renderLearning(i, false) : renderHistory(i, false)).join('')
        : empty('Nothing here yet.');
    } catch(e) {
      bodyEl.innerHTML = empty('Failed: ' + e.message);
    }
  }

  document.getElementById('btn-all-learnings').addEventListener('click', () => openAll('learnings'));
  document.getElementById('btn-all-history').addEventListener('click',   () => openAll('history'));
  document.getElementById('close-learnings').addEventListener('click', () => closeModal('learnings'));
  document.getElementById('close-history').addEventListener('click',   () => closeModal('history'));

  document.querySelectorAll('.modal-backdrop').forEach(el => {
    el.addEventListener('click', e => { if (e.target === el) closeModal(el.id.replace('modal-', '')); });
  });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
      closeModal('learnings');
      closeModal('history');
    }
  });

  // ---- Boot ----
  wireSearch('learnings');
  wireSearch('history');
  loadStatus().catch(console.error);
  renderPanel('learnings', '').catch(console.error);
  renderPanel('history',   '').catch(console.error);
})();
</script>
</body>
</html>`;
}
