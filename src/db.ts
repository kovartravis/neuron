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

/**
 * Synchronous cross-process mutex over `fn`, using `mkdir` as the atomic
 * primitive — the same approach `MdStorageAdapter.acquireLock` uses for
 * markdown writes, but blocking rather than `async`: `NeuronMemory`'s
 * constructor runs its schema-migration chain synchronously, with no
 * `await` point to yield at, so the wait between poll attempts uses
 * `Atomics.wait` for a real OS-level sleep (Node's main thread, unlike a
 * browser's, permits it) instead of a `setTimeout`-based one.
 *
 * Serializes `NeuronMemory.initialize()`'s migration chain across processes
 * opening the same fresh database file concurrently — without it, two
 * processes can both read `user_version` as `0` before either commits its
 * first migration, producing `duplicate column name` / `no such table`
 * races (the SQLite schema-migration race ticket, id `2fbfa9ff-1469-4b21-
 * b781-cef371ea7d38` — this repo's wayfinder ticket numbers collide across
 * maps, and bare "ticket 44" already names an unrelated declared-fields
 * SQLite-column change elsewhere in this codebase, so this comment spells
 * out the id rather than the number).
 */
export function withSyncFileLock<T>(lockTargetPath: string, fn: () => T): T {
  const lockPath = `${lockTargetPath}.lock`;
  fs.mkdirSync(path.dirname(lockPath), { recursive: true });

  // A lock older than this is assumed to belong to a process that crashed
  // (or was killed) while holding it, rather than a genuinely slow migrator
  // — without a steal path a single crash would wedge every future opener
  // of this database forever.
  const staleAfterMs = 30_000;
  const maxWaitMs = 10_000;
  const retryDelayMs = 25;
  const start = Date.now();
  const sleepSignal = new Int32Array(new SharedArrayBuffer(4));

  while (true) {
    try {
      fs.mkdirSync(lockPath);
      break;
    } catch (err) {
      if (!(err instanceof Error) || (err as NodeJS.ErrnoException).code !== 'EEXIST') {
        throw err;
      }

      try {
        const heldFor = Date.now() - fs.statSync(lockPath).mtimeMs;
        if (heldFor > staleAfterMs) {
          fs.rmdirSync(lockPath);
          continue;
        }
      } catch {
        // Lock vanished between the failed mkdir and this stat — another
        // process released or stole it; retry immediately.
        continue;
      }

      if (Date.now() - start > maxWaitMs) {
        throw new Error(
          `Timed out waiting ${maxWaitMs}ms for the database init lock on "${lockTargetPath}" `
          + `(${lockPath}) — another process may have crashed while holding it.`
        );
      }
      Atomics.wait(sleepSignal, 0, 0, retryDelayMs);
    }
  }

  try {
    return fn();
  } finally {
    try {
      fs.rmdirSync(lockPath);
    } catch {
      // Already gone (e.g. stolen as stale by another opener) — fine.
    }
  }
}
