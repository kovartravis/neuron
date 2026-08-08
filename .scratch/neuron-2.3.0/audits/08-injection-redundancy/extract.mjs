import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { execSync } from 'node:child_process';

const REPO = '/Users/Travis/Repos/neuron';
const OUT = path.join(path.dirname(new URL(import.meta.url).pathname), 'data.json');

// --- 1. Parse .neuron/*.md into id -> {category, content, tags} ---
function parseCategoryFile(filePath, category) {
  const text = fs.readFileSync(filePath, 'utf8');
  const blocks = text.split(/^---$/m).map(s => s.trim()).filter(Boolean);
  const entries = {};
  // blocks come as [frontmatter, content, frontmatter, content, ...] after the header
  for (let i = 0; i < blocks.length - 1; i++) {
    const fm = blocks[i];
    if (!/^id:/m.test(fm)) continue;
    const idMatch = fm.match(/^id:\s*(\S+)/m);
    const tagsMatch = fm.match(/^tags:\n((?:\s+-\s+.*\n?)*)/m);
    const importanceMatch = fm.match(/^importance:\s*(\d+)/m);
    if (!idMatch) continue;
    const content = blocks[i + 1].trim();
    const tags = tagsMatch ? tagsMatch[1].split('\n').map(l => l.replace(/^\s*-\s*/, '').trim()).filter(Boolean) : [];
    entries[idMatch[1]] = { category, content, tags, importance: importanceMatch ? Number(importanceMatch[1]) : null };
  }
  return entries;
}

const store = {
  ...parseCategoryFile(path.join(REPO, '.neuron/history.md'), 'history'),
  ...parseCategoryFile(path.join(REPO, '.neuron/decisions.md'), 'decisions'),
  ...parseCategoryFile(path.join(REPO, '.neuron/learning.md'), 'learning'),
};

// --- 2. Load the 5 new-format session ledgers ticket 12 characterized ---
const ledgerDir = path.join(os.homedir(), 'Library/Caches/neuron/hooks/a8541890092e7e49');
const SESSION_FILES = [
  'ledger-00461f3b38e58aa7bb2e67a1.json',
  'ledger-074f7402361ad6bbeb2fd386.json',
  'ledger-40f9050f2d8440034625c1c3.json',
  'ledger-acf7300499874aa660474947.json',
  'ledger-f1e99213abc0c8abae539d33.json',
];

const sessions = SESSION_FILES.map(f => {
  const raw = JSON.parse(fs.readFileSync(path.join(ledgerDir, f), 'utf8'));
  const resolved = raw.injectedIds.map(id => ({ id, ...store[id] })).filter(e => e.category);
  const unresolved = raw.injectedIds.filter(id => !store[id]);
  return { file: f, charsSpent: raw.charsSpent, turns: raw.turns, injectedIds: raw.injectedIds, resolved, unresolved };
});

// --- 3. Build resident corpus: CLAUDE.md (full) + git log (full messages, reachable from HEAD) ---
const claudeMd = fs.readFileSync(path.join(REPO, 'CLAUDE.md'), 'utf8');
// chunk CLAUDE.md by ## / ### headings and paragraphs
const claudeChunks = claudeMd
  .split(/\n(?=#{1,3}\s)|\n\n+/)
  .map(s => s.trim())
  .filter(s => s.length > 20);

const gitLog = execSync('git log --pretty=format:%B%n===COMMIT===', { cwd: REPO, maxBuffer: 20 * 1024 * 1024 }).toString();
const gitChunks = gitLog
  .split('===COMMIT===')
  .map(s => s.trim())
  .filter(s => s.length > 5);

const residentChunks = [
  ...claudeChunks.map(text => ({ source: 'CLAUDE.md', text })),
  ...gitChunks.map(text => ({ source: 'git-log', text })),
];

fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, JSON.stringify({ store, sessions, residentChunks }, null, 2));

console.log('sessions:', sessions.map(s => ({ file: s.file, n: s.injectedIds.length, resolved: s.resolved.length, unresolved: s.unresolved.length })));
console.log('resident chunks:', residentChunks.length, '(CLAUDE.md:', claudeChunks.length, ', git-log:', gitChunks.length, ')');
console.log('CLAUDE.md chars:', claudeMd.length, 'git log chars:', gitLog.length);

// category breakdown across sessions
const byCat = {};
for (const s of sessions) {
  for (const e of s.resolved) {
    byCat[e.category] = byCat[e.category] || new Set();
    byCat[e.category].add(e.id);
  }
}
console.log('unique injected ids by category:', Object.fromEntries(Object.entries(byCat).map(([k, v]) => [k, v.size])));
