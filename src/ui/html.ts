export function generateDashboardHtml(): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Neuron Memory Dashboard</title>
  <meta name="description" content="Neuron local agent memory dashboard — browse learnings, history, and custom categories." />
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
    .layout { display: flex; flex-direction: column; min-height: 100vh; }

    /* ---- Topbar ---- */
    .topbar {
      display: flex; align-items: center; gap: 20px;
      border-bottom: 1px solid var(--border);
      padding: 0 24px; height: 48px; flex-shrink: 0;
      background: var(--surface);
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

    /* ---- Control Header (Search + Category Tabs) ---- */
    .controls-bar {
      padding: 16px 24px 0;
      border-bottom: 1px solid var(--border);
      background: var(--bg);
      display: flex; flex-direction: column; gap: 14px;
    }

    .search-bar {
      display: flex; align-items: center;
      background: var(--surface); border: 1px solid var(--border);
      border-radius: var(--radius); overflow: hidden;
      transition: border-color 0.15s;
    }
    .search-bar:focus-within { border-color: var(--accent-border); }

    .search-icon {
      padding: 0 14px; color: var(--text-3); flex-shrink: 0;
      display: flex; align-items: center;
    }
    .search-input {
      flex: 1; background: none; border: none; outline: none;
      color: var(--text-1); font-family: inherit; font-size: 13px;
      padding: 10px 0; min-width: 0;
    }
    .search-input::placeholder { color: var(--text-3); }
    .search-btn {
      background: var(--surface-2); border: none; border-left: 1px solid var(--border);
      color: var(--text-1); cursor: pointer; font-family: inherit;
      font-size: 12px; font-weight: 500;
      padding: 0 18px; height: 100%; min-height: 38px;
      transition: background 0.1s, color 0.1s;
      white-space: nowrap;
    }
    .search-btn:hover { background: var(--border-2); }

    /* ---- Category Tabs ---- */
    .category-tabs {
      display: flex; align-items: center; gap: 8px;
      overflow-x: auto; padding-bottom: 12px;
      scrollbar-width: none;
    }
    .category-tabs::-webkit-scrollbar { display: none; }

    .tab-btn {
      background: none; border: 1px solid var(--border);
      border-radius: 20px; padding: 5px 14px;
      color: var(--text-2); font-family: inherit; font-size: 12px; font-weight: 500;
      cursor: pointer; display: flex; align-items: center; gap: 6px;
      white-space: nowrap; transition: all 0.15s ease;
    }
    .tab-btn:hover { background: var(--surface-2); color: var(--text-1); border-color: var(--border-2); }
    .tab-btn.active {
      background: var(--accent-dim); color: var(--accent);
      border-color: var(--accent-border);
    }
    .tab-count {
      font-size: 11px; padding: 1px 6px; border-radius: 10px;
      background: var(--surface-2); color: var(--text-3);
      font-variant-numeric: tabular-nums;
    }
    .tab-btn.active .tab-count {
      background: rgba(232,169,77,0.2); color: var(--accent);
    }

    /* ---- Main Content ---- */
    .content-area { flex: 1; padding: 20px 24px; max-width: 1200px; width: 100%; margin: 0 auto; }

    .search-notice {
      margin-bottom: 14px; padding: 8px 14px; font-size: 12px; color: var(--text-2);
      background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius-sm);
      display: flex; align-items: center; justify-content: space-between;
    }
    .search-clear {
      background: none; border: none; cursor: pointer;
      color: var(--accent); font-size: 12px; font-weight: 500; padding: 0;
    }
    .search-clear:hover { text-decoration: underline; }

    .entry-list { display: flex; flex-direction: column; gap: 10px; }

    .entry {
      background: var(--surface); border: 1px solid var(--border);
      border-radius: var(--radius); padding: 16px;
      transition: border-color 0.12s, background 0.12s;
    }
    .entry:hover { border-color: var(--border-2); background: #1c1c1a; }

    .entry-content {
      color: var(--text-1); font-size: 13px; line-height: 1.6;
      margin-bottom: 12px; white-space: pre-wrap; word-break: break-word;
    }

    .entry-meta {
      display: flex; align-items: center; flex-wrap: wrap; gap: 8px;
    }

    .cat-badge {
      font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;
      color: var(--accent); background: var(--accent-dim); border: 1px solid var(--accent-border);
      border-radius: var(--radius-sm); padding: 1px 7px;
    }

    .tag {
      font-size: 11px; color: var(--text-3);
      background: var(--surface-2); border: 1px solid var(--border);
      border-radius: var(--radius-sm); padding: 1px 7px;
      font-family: 'JetBrains Mono', monospace;
    }

    .imp-bar { display: flex; align-items: center; gap: 3px; }
    .imp-seg { width: 10px; height: 3px; border-radius: 2px; background: var(--border-2); }
    .imp-seg.on { background: var(--text-3); }
    .imp-5 .imp-seg.on { background: var(--red); }
    .imp-4 .imp-seg.on { background: var(--accent); }
    .imp-3 .imp-seg.on { background: var(--blue); }

    .task-id {
      font-size: 11px; font-family: 'JetBrains Mono', monospace; color: var(--text-3);
    }

    .ts {
      font-size: 11px; color: var(--text-3); font-family: 'JetBrains Mono', monospace;
      margin-left: auto;
    }

    .score-tag {
      font-size: 11px; font-family: 'JetBrains Mono', monospace;
      color: var(--blue); font-weight: 500;
    }

    .state-msg {
      padding: 60px 20px; text-align: center; color: var(--text-3); font-size: 13px;
      background: var(--surface); border: 1px dashed var(--border); border-radius: var(--radius);
    }

    .footer-actions {
      margin-top: 20px; display: flex; justify-content: center;
    }
    .view-all-btn {
      background: var(--surface); border: 1px solid var(--border);
      border-radius: var(--radius); color: var(--text-2);
      cursor: pointer; font-family: inherit; font-size: 13px; font-weight: 500;
      padding: 10px 24px; transition: all 0.15s;
    }
    .view-all-btn:hover { background: var(--surface-2); border-color: var(--border-2); color: var(--text-1); }

    /* ---- Modal ---- */
    .modal-backdrop {
      position: fixed; inset: 0; background: rgba(0,0,0,0.7);
      display: flex; align-items: flex-start; justify-content: center;
      z-index: 100; padding: 48px 16px; overflow-y: auto;
      opacity: 0; pointer-events: none; transition: opacity 0.15s;
    }
    .modal-backdrop.open { opacity: 1; pointer-events: all; }
    .modal {
      background: var(--surface); border: 1px solid var(--border);
      border-radius: 10px; width: 100%; max-width: 800px;
      transform: translateY(-8px); transition: transform 0.15s;
      display: flex; flex-direction: column; max-height: 85vh;
    }
    .modal-backdrop.open .modal { transform: translateY(0); }
    .modal-head {
      display: flex; align-items: center; justify-content: space-between;
      padding: 16px 20px; border-bottom: 1px solid var(--border); flex-shrink: 0;
    }
    .modal-head-title { font-size: 14px; font-weight: 600; color: var(--text-1); }
    .modal-close {
      background: none; border: none; cursor: pointer;
      color: var(--text-3); font-size: 18px; line-height: 1;
      padding: 2px 6px; transition: color 0.1s;
    }
    .modal-close:hover { color: var(--text-1); }
    .modal-body { overflow-y: auto; flex: 1; padding: 16px; display: flex; flex-direction: column; gap: 10px; }
  </style>
</head>
<body>
<div class="layout">

  <header class="topbar">
    <span class="wordmark">neuron <span>/ memory</span></span>
    <div class="topbar-meta">
      <span class="meta-item"><span class="status-dot" id="db-dot"></span> <strong id="project-name">—</strong></span>
      <span class="sep">·</span>
      <span class="meta-item"><strong id="total-count">—</strong> total memories</span>
      <span class="meta-item" id="model-warn" style="display:none"><span class="status-dot warn"></span> model not cached</span>
    </div>
  </header>

  <div class="controls-bar">
    <div class="search-bar">
      <span class="search-icon">
        <svg width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
      </span>
      <input class="search-input" id="global-search" type="text" placeholder="Search memories..." autocomplete="off" />
      <button class="search-btn" id="btn-search">Search</button>
    </div>

    <div class="category-tabs" id="category-tabs">
      <button class="tab-btn active" data-cat="all">All <span class="tab-count" id="count-all">0</span></button>
    </div>
  </div>

  <main class="content-area">
    <div id="search-notice" style="display:none" class="search-notice">
      <span id="search-notice-text"></span>
      <button class="search-clear" id="btn-clear-search">Clear search</button>
    </div>

    <div class="entry-list" id="main-entry-list">
      <div class="state-msg">Loading memories...</div>
    </div>

    <div class="footer-actions">
      <button class="view-all-btn" id="btn-view-all">View all in active category</button>
    </div>
  </main>

</div>

<!-- Generic Reusable Modal -->
<div class="modal-backdrop" id="generic-modal" role="dialog" aria-modal="true">
  <div class="modal">
    <div class="modal-head">
      <span class="modal-head-title" id="modal-title">All Memories</span>
      <button class="modal-close" id="modal-close">✕</button>
    </div>
    <div class="modal-body" id="modal-body">
      <div class="state-msg">Loading...</div>
    </div>
  </div>
</div>

<script>
(function () {
  let activeCategory = 'all';
  let categoriesData = [];

  function esc(s) {
    return String(s ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  }

  function relTime(iso) {
    if (!iso) return '';
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

  function tags(arr) {
    return (arr || []).map(t => '<span class="tag">' + esc(t) + '</span>').join('');
  }

  function renderEntry(item, showScore) {
    const catBadge = '<span class="cat-badge">' + esc(item.category || item.kind || 'memory') + '</span>';
    return '<div class="entry">' +
      '<div class="entry-content">' + esc(item.content) + '</div>' +
      '<div class="entry-meta">' +
        catBadge +
        impBar(item.importance) +
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

  async function api(path) {
    const r = await fetch(path);
    if (!r.ok) throw new Error(r.statusText);
    return r.json();
  }

  async function loadStatus() {
    const d = await api('/api/status');
    document.getElementById('project-name').textContent = d.project || '—';
    document.getElementById('total-count').textContent  = d.totalCount ?? '—';
    if (d.model !== 'ready') {
      document.getElementById('model-warn').style.display = '';
    }

    if (Array.isArray(d.categories)) {
      categoriesData = d.categories;
      renderTabs();
    }
  }

  function renderTabs() {
    const container = document.getElementById('category-tabs');
    let totalSum = 0;
    for (const c of categoriesData) totalSum += (c.count || 0);

    let html = '<button class="tab-btn ' + (activeCategory === 'all' ? 'active' : '') + '" data-cat="all">All <span class="tab-count">' + totalSum + '</span></button>';

    for (const cat of categoriesData) {
      const isAct = activeCategory === cat.name;
      html += '<button class="tab-btn ' + (isAct ? 'active' : '') + '" data-cat="' + esc(cat.name) + '">' +
        esc(cat.name) + ' <span class="tab-count">' + (cat.count || 0) + '</span>' +
      '</button>';
    }

    container.innerHTML = html;

    container.querySelectorAll('.tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        activeCategory = btn.getAttribute('data-cat') || 'all';
        renderTabs();
        loadMemories();
      });
    });
  }

  async function loadMemories() {
    const listEl = document.getElementById('main-entry-list');
    const searchInput = document.getElementById('global-search');
    const noticeEl = document.getElementById('search-notice');
    const noticeTextEl = document.getElementById('search-notice-text');
    const q = searchInput.value.trim();

    listEl.innerHTML = '<div class="state-msg">Loading memories...</div>';

    let path = '/api/memories?limit=25';
    if (activeCategory !== 'all') {
      path += '&category=' + encodeURIComponent(activeCategory);
    }
    if (q) {
      path += '&q=' + encodeURIComponent(q);
    }

    if (q) {
      noticeTextEl.textContent = 'Showing search results for "' + q + '"' + (activeCategory !== 'all' ? ' in category "' + activeCategory + '"' : '');
      noticeEl.style.display = '';
    } else {
      noticeEl.style.display = 'none';
    }

    try {
      const data = await api(path);
      const items = data.results || [];
      if (!items.length) {
        listEl.innerHTML = empty(q ? 'No matching memories found.' : 'No memories in this category yet.');
        return;
      }
      listEl.innerHTML = items.map(i => renderEntry(i, !!q)).join('');
    } catch(e) {
      listEl.innerHTML = empty('Failed to load memories: ' + e.message);
    }
  }

  // ---- Search Events ----
  const searchInput = document.getElementById('global-search');
  const searchBtn = document.getElementById('btn-search');
  const clearBtn = document.getElementById('btn-clear-search');

  searchBtn.addEventListener('click', loadMemories);
  searchInput.addEventListener('keydown', e => { if (e.key === 'Enter') loadMemories(); });
  clearBtn.addEventListener('click', () => {
    searchInput.value = '';
    loadMemories();
  });

  // ---- Modal ----
  const modal = document.getElementById('generic-modal');
  const modalTitle = document.getElementById('modal-title');
  const modalBody = document.getElementById('modal-body');
  const modalClose = document.getElementById('modal-close');
  const btnViewAll = document.getElementById('btn-view-all');

  function openModal() {
    modal.classList.add('open');
    document.body.style.overflow = 'hidden';
  }
  function closeModal() {
    modal.classList.remove('open');
    document.body.style.overflow = '';
  }

  async function openAllModal() {
    modalTitle.textContent = 'All Memories' + (activeCategory !== 'all' ? ' (' + activeCategory + ')' : '');
    modalBody.innerHTML = '<div class="state-msg">Loading all entries...</div>';
    openModal();

    let path = '/api/memories?limit=500';
    if (activeCategory !== 'all') {
      path += '&category=' + encodeURIComponent(activeCategory);
    }

    try {
      const data = await api(path);
      const items = data.results || [];
      modalBody.innerHTML = items.length
        ? items.map(i => renderEntry(i, false)).join('')
        : empty('No entries found.');
    } catch (e) {
      modalBody.innerHTML = empty('Failed to load: ' + e.message);
    }
  }

  btnViewAll.addEventListener('click', openAllModal);
  modalClose.addEventListener('click', closeModal);
  modal.addEventListener('click', e => { if (e.target === modal) closeModal(); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') closeModal(); });

  // ---- Init ----
  loadStatus().then(loadMemories).catch(console.error);
})();
</script>
</body>
</html>`;
}
