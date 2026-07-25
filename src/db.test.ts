import { describe, it, expect } from 'vitest';
import { openDatabase, createNodeSqliteWrapper } from './db.js';

describe('SQLite Database Adapter (src/db.ts)', () => {
  it('openDatabase should return a database wrapper supporting pragma, prepare, exec, and transaction', () => {
    const db = openDatabase(':memory:');
    expect(db).toBeDefined();

    db.exec('CREATE TABLE test_table (id TEXT PRIMARY KEY, value TEXT)');
    
    const insertStmt = db.prepare('INSERT INTO test_table (id, value) VALUES (?, ?)');
    const res = insertStmt.run('id-1', 'value-1');
    expect(res.changes).toBe(1);

    const getStmt = db.prepare('SELECT * FROM test_table WHERE id = ?');
    const row = getStmt.get('id-1');
    expect(row).toEqual({ id: 'id-1', value: 'value-1' });

    const allStmt = db.prepare('SELECT * FROM test_table');
    const rows = allStmt.all();
    expect(rows).toHaveLength(1);

    db.close();
  });

  it('createNodeSqliteWrapper should handle transactions and rollback on error', () => {
    const db = createNodeSqliteWrapper(':memory:');
    db.exec('CREATE TABLE test_tx (id TEXT PRIMARY KEY)');

    const insertTx = db.transaction((id: string) => {
      db.prepare('INSERT INTO test_tx (id) VALUES (?)').run(id);
      if (id === 'fail') throw new Error('Transaction aborted');
    });

    insertTx('ok-1');
    expect(db.prepare('SELECT * FROM test_tx').all()).toHaveLength(1);

    expect(() => insertTx('fail')).toThrow('Transaction aborted');
    expect(db.prepare('SELECT * FROM test_tx').all()).toHaveLength(1);

    db.close();
  });
});
