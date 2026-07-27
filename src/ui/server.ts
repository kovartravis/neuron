import http from 'node:http';
import type { NeuronMemory } from '../index.js';
import { loadConfig } from '../config/neuronrc.js';
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

    if (req.method === 'GET' && (url.pathname === '/api/status' || url.pathname === '/api/categories')) {
      const status = memory.getStatus();
      let configCategories: Record<string, { description?: string }> = {};
      try {
        const config = loadConfig(status.projectRoot || process.cwd());
        configCategories = config.categories || {};
      } catch {
        // Fall back if config cannot be loaded
      }

      const dbCategories: string[] = Array.isArray(status.categories) ? status.categories : [];
      const allCategoryNames = Array.from(new Set(['learning', 'history', ...Object.keys(configCategories), ...dbCategories]));

      const dbInstance = (memory as any).db;
      const projectId = (memory as any).projectId;

      const categoryDetails = allCategoryNames.map(name => {
        let count = 0;
        if (dbInstance && projectId) {
          try {
            const row = dbInstance.prepare("SELECT COUNT(*) as count FROM memories WHERE project_id = ? AND category = ?").get(projectId, name) as any;
            count = row ? row.count : 0;
          } catch {
            count = 0;
          }
        }
        return {
          name,
          count,
          description: configCategories[name]?.description ?? ''
        };
      });

      const responsePayload = {
        ...status,
        categories: categoryDetails
      };

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(responsePayload));
      return;
    }

    if (req.method === 'GET' && (url.pathname === '/api/memories' || url.pathname === '/api/learnings' || url.pathname === '/api/history')) {
      const q = url.searchParams.get('q') ?? undefined;
      const limit = parseInt(url.searchParams.get('limit') ?? '50', 10);
      let category = url.searchParams.get('category') ?? undefined;

      if (!category) {
        if (url.pathname === '/api/learnings') category = 'learning';
        else if (url.pathname === '/api/history') category = 'history';
      }

      (async () => {
        const results = await memory.query({ text: q, category, limit });
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
