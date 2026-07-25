import path from 'node:path';
import fs from 'node:fs';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);

export function createNodeSqliteWrapper(dbPath: string): any {
  if (dbPath !== ':memory:') {
    fs.mkdirSync(path.dirname(dbPath), { recursive: true });
  }
  const { DatabaseSync } = require('node:sqlite');
  const syncDb = new DatabaseSync(dbPath);
  try {
    syncDb.exec('PRAGMA journal_mode = WAL');
    syncDb.exec('PRAGMA busy_timeout = 5000');
  } catch (err) {}

  return {
    pragma(pragmaStr: string, options?: { simple?: boolean }) {
      try {
        if (pragmaStr.includes('=')) {
          syncDb.exec(`PRAGMA ${pragmaStr}`);
        } else {
          const stmt = syncDb.prepare(`PRAGMA ${pragmaStr}`);
          if (options && options.simple) {
            const row = stmt.get() as any;
            return row ? Object.values(row)[0] : 0;
          }
          return stmt.all();
        }
      } catch (err) {
        if (pragmaStr.startsWith('user_version') && options?.simple) return 0;
        return undefined;
      }
    },
    exec(sql: string) {
      syncDb.exec(sql);
    },
    prepare(sql: string) {
      const stmt = syncDb.prepare(sql);
      return {
        run(...params: any[]) {
          const res = stmt.run(...params);
          return { changes: res.changes, lastInsertRowid: Number(res.lastInsertRowid) };
        },
        get(...params: any[]) {
          return stmt.get(...params);
        },
        all(...params: any[]) {
          return stmt.all(...params);
        }
      };
    },
    transaction(fn: Function) {
      return (...args: any[]) => {
        syncDb.exec('BEGIN TRANSACTION');
        try {
          const res = fn(...args);
          syncDb.exec('COMMIT');
          return res;
        } catch (err) {
          syncDb.exec('ROLLBACK');
          throw err;
        }
      };
    },
    close() {
      syncDb.close();
    }
  };
}

export function openDatabase(dbPath: string): any {
  if (dbPath !== ':memory:') {
    fs.mkdirSync(path.dirname(dbPath), { recursive: true });
  }
  try {
    const Database = require('better-sqlite3');
    const db = new Database(dbPath);
    db.pragma('journal_mode = WAL');
    return db;
  } catch (err) {
    return createNodeSqliteWrapper(dbPath);
  }
}
