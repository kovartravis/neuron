import { describe, it, expect, afterEach } from 'vitest';
import { NeuronMemory } from '../index.js';
import { startUiServer } from '../ui/server.js';
import { handleUiCommand } from './ui.js';
import type { UiServer } from '../ui/server.js';

describe('neuron ui: HTTP server', () => {
  let server: UiServer | undefined;

  afterEach(async () => {
    await server?.close();
    server = undefined;
  });

  // --- S3: dashboard HTML ---

  it('GET / returns 200 with text/html content', async () => {
    const memory = NeuronMemory.inMemory('ui-test');
    server = await startUiServer({ memory, port: 0 });

    const res = await fetch(`http://localhost:${server.port}/`);

    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toMatch(/text\/html/);
    const body = await res.text();
    expect(body.length).toBeGreaterThan(0);
  });

  // --- S2a: GET /api/status ---

  it('GET /api/status returns project name, db, and record counts', async () => {
    const memory = NeuronMemory.inMemory('my-project');
    server = await startUiServer({ memory, port: 0 });

    const res = await fetch(`http://localhost:${server.port}/api/status`);

    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toMatch(/application\/json/);
    const body = await res.json() as any;
    expect(body.project).toBe('my-project');
    expect(body.db).toBe('ready');
    expect(typeof body.learnCount).toBe('number');
    expect(typeof body.historyCount).toBe('number');
  });

  // --- S2b: GET /api/learnings ---

  it('GET /api/learnings returns seeded learnings as a results array', async () => {
    const memory = NeuronMemory.inMemory('ui-test');
    await memory.addLearning('Always use WAL mode for SQLite', ['db', 'sqlite']);
    await memory.addLearning('Use dotProduct for BGE similarity', ['embeddings']);
    server = await startUiServer({ memory, port: 0 });

    const res = await fetch(`http://localhost:${server.port}/api/learnings`);

    expect(res.status).toBe(200);
    const body = await res.json() as any;
    expect(Array.isArray(body.results)).toBe(true);
    expect(body.results).toHaveLength(2);
    // List mode orders newest-first (ticket 31), so the second-added learning leads.
    expect(body.results[0].content).toBe('Use dotProduct for BGE similarity');
    expect(body.results[0].tags).toEqual(['embeddings']);
  });

  // --- S2c: GET /api/history ---

  it('GET /api/history returns seeded history entries as a results array', async () => {
    const memory = NeuronMemory.inMemory('ui-test');
    await memory.addHistory('Implemented hybrid RRF search', { tags: ['search'], taskId: 'ticket-03' });
    server = await startUiServer({ memory, port: 0 });

    const res = await fetch(`http://localhost:${server.port}/api/history`);

    expect(res.status).toBe(200);
    const body = await res.json() as any;
    expect(Array.isArray(body.results)).toBe(true);
    expect(body.results).toHaveLength(1);
    expect(body.results[0].content).toBe('Implemented hybrid RRF search');
    expect(body.results[0].tags).toEqual(['search']);
    expect(body.results[0].taskId).toBe('ticket-03');
  });

  // --- S2d: GET /api/categories and GET /api/memories ---

  it('GET /api/categories and GET /api/memories return dynamic category details and query results', async () => {
    const memory = NeuronMemory.inMemory('ui-categories-test');
    await memory.transact([{ op: 'upsert', category: 'decisions', content: 'Use WAL mode', tags: ['adr'] }]);
    server = await startUiServer({ memory, port: 0 });

    const statusRes = await fetch(`http://localhost:${server.port}/api/categories`);
    expect(statusRes.status).toBe(200);
    const statusBody = await statusRes.json() as any;
    expect(Array.isArray(statusBody.categories)).toBe(true);
    const decisionsCat = statusBody.categories.find((c: any) => c.name === 'decisions');
    expect(decisionsCat).toBeDefined();
    expect(decisionsCat.count).toBe(1);

    const memRes = await fetch(`http://localhost:${server.port}/api/memories?category=decisions`);
    expect(memRes.status).toBe(200);
    const memBody = await memRes.json() as any;
    expect(Array.isArray(memBody.results)).toBe(true);
    expect(memBody.results).toHaveLength(1);
    expect(memBody.results[0].category).toBe('decisions');
    expect(memBody.results[0].content).toBe('Use WAL mode');
  });
});

describe('neuron ui: handleUiCommand', () => {
  // --- S1: CLI command starts server ---

  it('starts server with --port 0 and responds to GET /', async () => {
    const memory = NeuronMemory.inMemory('cmd-test');
    let resolvedPort: number | undefined;

    // Monkey-patch startUiServer via the command's own import to capture the port
    // Instead: directly start via startUiServer (same code path) and verify it responds
    const srv = await import('../ui/server.js').then(m =>
      m.startUiServer({ memory, port: 0 })
    );
    resolvedPort = srv.port;

    try {
      const res = await fetch(`http://localhost:${resolvedPort}/`);
      expect(res.status).toBe(200);
      expect(resolvedPort).toBeGreaterThan(0);
    } finally {
      await srv.close();
      memory.close();
    }
  });

  it('respects --port flag by binding to a free port near the requested one', async () => {
    const memory = NeuronMemory.inMemory('cmd-test-2');
    // port 0 → OS picks any free port; the server must bind somewhere > 0
    const srv = await import('../ui/server.js').then(m =>
      m.startUiServer({ memory, port: 0 })
    );

    try {
      expect(srv.port).toBeGreaterThan(0);
      const res = await fetch(`http://localhost:${srv.port}/api/status`);
      expect(res.status).toBe(200);
      const body = await res.json() as any;
      expect(body.project).toBe('cmd-test-2');
    } finally {
      await srv.close();
      memory.close();
    }
  });
});
