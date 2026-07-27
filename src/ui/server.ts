import http from 'node:http';
import type { NeuronMemory } from '../index.js';
import { generateDashboardHtml } from './html.js';

export interface UiServerOptions {
  memory: NeuronMemory;
  port: number;
}

export interface UiServer {
  port: number;
  close(): Promise<void>;
}

export async function startUiServer(options: UiServerOptions): Promise<UiServer> {
  const { memory, port } = options;

  const server = http.createServer((req, res) => {
    const url = new URL(req.url ?? '/', `http://localhost`);

    if (req.method === 'GET' && url.pathname === '/') {
      const html = generateDashboardHtml();
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(html);
      return;
    }

    if (req.method === 'GET' && url.pathname === '/api/status') {
      const status = memory.getStatus();
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(status));
      return;
    }

    if (req.method === 'GET' && url.pathname === '/api/learnings') {
      const q = url.searchParams.get('q') ?? undefined;
      const limit = parseInt(url.searchParams.get('limit') ?? '50', 10);
      (async () => {
        let results;
        if (q) {
          results = await memory.query({ text: q, kind: 'learning', limit });
        } else {
          results = memory.listLearnings({ limit });
        }
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ results }));
      })().catch(err => {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: err.message }));
      });
      return;
    }

    if (req.method === 'GET' && url.pathname === '/api/history') {
      const q = url.searchParams.get('q') ?? undefined;
      const limit = parseInt(url.searchParams.get('limit') ?? '50', 10);
      (async () => {
        let results;
        if (q) {
          results = await memory.query({ text: q, kind: 'history', limit });
        } else {
          results = memory.listHistory({ limit });
        }
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ results }));
      })().catch(err => {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: err.message }));
      });
      return;
    }

    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Not found' }));
  });

  const boundPort = await new Promise<number>((resolve, reject) => {
    server.listen(port, '127.0.0.1', () => {
      const addr = server.address();
      resolve(typeof addr === 'object' && addr ? addr.port : port);
    });
    server.once('error', reject);
  });

  return {
    port: boundPort,
    close(): Promise<void> {
      return new Promise((resolve, reject) => {
        server.close(err => (err ? reject(err) : resolve()));
      });
    }
  };
}
