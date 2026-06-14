import { describe, it, expect, jest } from '@jest/globals';
import { ActivityRepository } from '../../../../src/persistence/repository/ActivityRepository.js';
import { Activity } from '../../../../src/persistence/entity/Activity.js';
import { Category } from '../../../../src/persistence/entity/Category.js';
import { CategoryTax } from '../../../../src/persistence/entity/CategoryTax.js';

/**
 * Builds a mock `mysql2/promise.Pool` that returns predefined rows
 * for predefined SQL patterns. The mock records every call so the
 * test can verify the SQL and parameters.
 *
 * Handlers are tried in order; the first whose `match(sql, params)`
 * returns `true` is used. If no handler matches, the call throws so
 * a typo in the test SQL pattern is caught loudly.
 *
 * @param {Array<{ match: (sql: string, params: any[]) => boolean, rows: object[] }>} handlers
 */
function makeMockPool(handlers) {
  const calls = [];
  const query = jest.fn(async (sql, params) => {
    calls.push({ sql, params });
    for (const { match, rows } of handlers) {
      if (match(sql, params)) return [rows, []];
    }
    throw new Error(`Unexpected query in mock pool: ${sql}`);
  });
  return { query, calls };
}

const includes = (substring) => (sql) => sql.includes(substring);
const startsWith = (prefix) => (sql) => sql.trimStart().startsWith(prefix);

describe('ActivityRepository', () => {
  describe('findById', () => {
    it('returns null when the activity does not exist', async () => {
      const pool = makeMockPool([
        { match: includes('FROM ACTIVITY WHERE id'), rows: [] }
      ]);
      const repo = new ActivityRepository(pool);
      expect(await repo.findById(999)).toBeNull();
      // The category query must NOT run when there is no activity row.
      expect(pool.calls).toHaveLength(1);
    });

    it('returns the activity with a category that has ALL its tax brackets', async () => {
      // Three brackets for category 1; the old code would have returned
      // only the first one because of the JOIN + _rowToEntity(rows[0]) bug.
      const pool = makeMockPool([
        {
          match: includes('FROM ACTIVITY WHERE id'),
          rows: [{ id: 1, NAME: 'shop', ADDRESS: 42, CATEGORY_ID: 1 }]
        },
        {
          match: includes('FROM ACTIVITIES_EMPLOYEES'),
          rows: []
        },
        {
          match: includes('FROM CATEGORY c') && includes('WHERE c.id = ?'),
          rows: [
            { id: 1, NAME: 'food', ct_id: 1, ct_amount: 0, ct_rate: 10 },
            { id: 1, NAME: 'food', ct_id: 2, ct_amount: 1000, ct_rate: 20 },
            { id: 1, NAME: 'food', ct_id: 3, ct_amount: 5000, ct_rate: 30 }
          ]
        }
      ]);
      const repo = new ActivityRepository(pool);
      const result = await repo.findById(1);

      expect(result).toBeInstanceOf(Activity); // sanity
      expect(result.id).toBe(1);
      expect(result.name).toBe('shop');
      expect(result.address).toBe(42);
      expect(result.category).toBeInstanceOf(Category);
      expect(result.category.id).toBe(1);
      expect(result.category.name).toBe('food');
      expect(result.category.categoryTaxes).toHaveLength(3);
      const taxIds = result.category.categoryTaxes.map((t) => t.id).sort();
      expect(taxIds).toEqual([1, 2, 3]);
    });

    it('returns the activity with category=null when CATEGORY_ID is null', async () => {
      const pool = makeMockPool([
        {
          match: includes('FROM ACTIVITY WHERE id'),
          rows: [{ id: 1, NAME: 'shop', ADDRESS: 42, CATEGORY_ID: null }]
        },
        {
          match: includes('FROM ACTIVITIES_EMPLOYEES'),
          rows: []
        }
      ]);
      const repo = new ActivityRepository(pool);
      const result = await repo.findById(1);

      expect(result.category).toBeNull();
      // The category query must NOT run when CATEGORY_ID is null.
      expect(pool.calls).toHaveLength(2);
    });

    it('returns the activity with category=null when the category FK points to a missing row', async () => {
      const pool = makeMockPool([
        {
          match: includes('FROM ACTIVITY WHERE id'),
          rows: [{ id: 1, NAME: 'shop', ADDRESS: 42, CATEGORY_ID: 99 }]
        },
        {
          match: includes('FROM ACTIVITIES_EMPLOYEES'),
          rows: []
        },
        {
          match: includes('FROM CATEGORY c'),
          rows: []
        }
      ]);
      const repo = new ActivityRepository(pool);
      const result = await repo.findById(1);

      expect(result.category).toBeNull();
    });
  });

  describe('findAll', () => {
    it('returns exactly pageable.size distinct activities, each with its full bracket set', async () => {
      // 2 activities, category 1 has 3 brackets, category 2 has 2 brackets.
      const pool = makeMockPool([
        {
          // (1) The page of activities
          match: (sql) => sql.includes('FROM ACTIVITY a') && sql.includes('LIMIT'),
          rows: [
            { a_id: 1, a_name: 'shop-1', a_address: 1, a_category_id: 1 },
            { a_id: 2, a_name: 'shop-2', a_address: 2, a_category_id: 2 }
          ]
        },
        {
          match: includes('FROM ACTIVITIES_EMPLOYEES'),
          rows: []
        },
        {
          // (2) Categories + taxes for the page
          match: (sql) => sql.includes('FROM CATEGORY c') && sql.includes('IN ('),
          rows: [
            { id: 1, NAME: 'food', ct_id: 1, ct_amount: 0, ct_rate: 10 },
            { id: 1, NAME: 'food', ct_id: 2, ct_amount: 1000, ct_rate: 20 },
            { id: 1, NAME: 'food', ct_id: 3, ct_amount: 5000, ct_rate: 30 },
            { id: 2, NAME: 'retail', ct_id: 4, ct_amount: 0, ct_rate: 15 },
            { id: 2, NAME: 'retail', ct_id: 5, ct_amount: 2000, ct_rate: 25 }
          ]
        },
        {
          // (3) Total count
          match: includes('COUNT(*) AS total FROM ACTIVITY'),
          rows: [{ total: 4 }]
        }
      ]);
      const repo = new ActivityRepository(pool);
      const result = await repo.findAll({ page: 0, size: 2, sort: null, offset: 0 });

      expect(result.total).toBe(4);
      expect(result.rows).toHaveLength(2);

      const [first, second] = result.rows;
      expect(first.id).toBe(1);
      expect(first.name).toBe('shop-1');
      expect(first.address).toBe(1);
      expect(first.category.id).toBe(1);
      expect(first.category.categoryTaxes).toHaveLength(3);

      expect(second.id).toBe(2);
      expect(second.category.id).toBe(2);
      expect(second.category.categoryTaxes).toHaveLength(2);
    });

    it('does not multiply rows by the number of tax brackets (the bug that lived here before)', async () => {
      // Simulate: 10 activities, each with 4 tax brackets.
      // The OLD code would have returned 40 rows (10 × 4) — all
      // copies of the same 10 activities, each entity carrying only
      // one bracket. The NEW code returns exactly 10 activities.
      const activityRows = [];
      for (let i = 1; i <= 10; i++) {
        activityRows.push({ a_id: i, a_name: `shop-${i}`, a_address: i, a_category_id: 1 });
      }
      const categoryRows = [];
      for (let j = 1; j <= 4; j++) {
        categoryRows.push({ id: 1, NAME: 'food', ct_id: j, ct_amount: j * 100, ct_rate: j * 5 });
      }

      const pool = makeMockPool([
        {
          match: (sql) => sql.includes('FROM ACTIVITY a') && sql.includes('LIMIT'),
          rows: activityRows
        },
        {
          match: includes('FROM ACTIVITIES_EMPLOYEES'),
          rows: []
        },
        {
          match: (sql) => sql.includes('FROM CATEGORY c') && sql.includes('IN ('),
          rows: categoryRows
        },
        {
          match: includes('COUNT(*) AS total FROM ACTIVITY'),
          rows: [{ total: 50 }]
        }
      ]);
      const repo = new ActivityRepository(pool);
      const result = await repo.findAll({ page: 0, size: 10, sort: null, offset: 0 });

      // Exactly 10 activities, not 40.
      expect(result.rows).toHaveLength(10);
      // Every activity id is unique (no duplicates).
      const ids = new Set(result.rows.map((r) => r.id));
      expect(ids.size).toBe(10);
      // Every activity carries ALL 4 brackets, not 1.
      for (const activity of result.rows) {
        expect(activity.category.categoryTaxes).toHaveLength(4);
      }
      // The total is the real count, not multiplied by bracket count.
      expect(result.total).toBe(50);
    });

    it('returns an empty page with the correct total when there are no activities', async () => {
      const pool = makeMockPool([
        {
          match: (sql) => sql.includes('FROM ACTIVITY a') && sql.includes('LIMIT'),
          rows: []
        },
        {
          match: includes('COUNT(*) AS total FROM ACTIVITY'),
          rows: [{ total: 0 }]
        }
      ]);
      const repo = new ActivityRepository(pool);
      const result = await repo.findAll({ page: 0, size: 20, sort: null, offset: 0 });

      expect(result.total).toBe(0);
      expect(result.rows).toHaveLength(0);
      // The category query must NOT run on an empty page.
      const categoryCalls = pool.calls.filter((c) => c.sql.includes('FROM CATEGORY c'));
      expect(categoryCalls).toHaveLength(0);
    });

    it('handles activities whose CATEGORY_ID is null without crashing', async () => {
      const pool = makeMockPool([
        {
          match: (sql) => sql.includes('FROM ACTIVITY a') && sql.includes('LIMIT'),
          rows: [
            { a_id: 1, a_name: 'shop-1', a_address: 1, a_category_id: null },
            { a_id: 2, a_name: 'shop-2', a_address: 2, a_category_id: 2 }
          ]
        },
        {
          match: includes('FROM ACTIVITIES_EMPLOYEES'),
          rows: []
        },
        {
          match: (sql) => sql.includes('FROM CATEGORY c') && sql.includes('IN ('),
          rows: [
            { id: 2, NAME: 'retail', ct_id: 4, ct_amount: 0, ct_rate: 15 }
          ]
        },
        {
          match: includes('COUNT(*) AS total FROM ACTIVITY'),
          rows: [{ total: 2 }]
        }
      ]);
      const repo = new ActivityRepository(pool);
      const result = await repo.findAll({ page: 0, size: 2, sort: null, offset: 0 });

      expect(result.rows[0].category).toBeNull();
      expect(result.rows[1].category).not.toBeNull();
    });
  });

  describe('save', () => {
    it('issues an UPDATE when the activity has an id, and reloads via findById', async () => {
      const connQuery = jest.fn(async (sql, params) => {
        if (sql.trimStart().startsWith('UPDATE')) return [[], []];
        throw new Error(`Unexpected query on connection: ${sql}`);
      });
      const conn = {
        query: connQuery,
        beginTransaction: jest.fn(),
        commit: jest.fn(),
        rollback: jest.fn(),
        release: jest.fn()
      };
      const pool = {
        query: jest.fn(async (sql, params) => {
          if (sql.includes('FROM ACTIVITY WHERE id')) return [[{ id: 1, NAME: 'updated', ADDRESS: 99, CATEGORY_ID: 2 }], []];
          if (sql.includes('FROM CATEGORY c') && sql.includes('WHERE c.id = ?')) return [[{ id: 2, NAME: 'retail', ct_id: 4, ct_amount: 0, ct_rate: 15 }], []];
          if (sql.includes('FROM ACTIVITIES_EMPLOYEES')) return [[], []];
          throw new Error(`Unexpected query in mock pool: ${sql}`);
        }),
        getConnection: jest.fn(async () => conn)
      };
      const repo = new ActivityRepository(pool);
      const category = { id: 2, NAME: 'retail', categoryTaxes: [{ id: 4, amount: 0, rate: 15 }] };
      const activity = { id: 1, name: 'updated', address: 99, category };

      const result = await repo.save(activity);

      expect(connQuery).toHaveBeenCalledTimes(1);
      expect(connQuery).toHaveBeenCalledWith(
        expect.stringMatching(/UPDATE ACTIVITY SET NAME = \?, ADDRESS = \?, CATEGORY_ID = \? WHERE id = \?/),
        ['updated', 99, 2, 1]
      );
      expect(conn.beginTransaction).toHaveBeenCalledTimes(1);
      expect(conn.commit).toHaveBeenCalledTimes(1);
      expect(conn.release).toHaveBeenCalledTimes(1);

      expect(result.id).toBe(1);
      expect(result.name).toBe('updated');
      expect(result.address).toBe(99);
      expect(result.category).toBeInstanceOf(Category);
      expect(result.category.id).toBe(2);
    });

    it('issues an INSERT followed by findById when the activity has no id', async () => {
      const connQuery = jest.fn(async (sql, params) => {
        if (sql.trimStart().startsWith('INSERT')) return [{ insertId: 42 }, []];
        throw new Error(`Unexpected query on connection: ${sql}`);
      });
      const conn = {
        query: connQuery,
        beginTransaction: jest.fn(),
        commit: jest.fn(),
        rollback: jest.fn(),
        release: jest.fn()
      };
      const pool = {
        query: jest.fn(async (sql, params) => {
          if (sql.includes('FROM ACTIVITY WHERE id')) return [[{ id: 42, NAME: 'fresh', ADDRESS: 1, CATEGORY_ID: 1 }], []];
          if (sql.includes('FROM CATEGORY c') && sql.includes('WHERE c.id = ?')) return [[{ id: 1, NAME: 'food', ct_id: 1, ct_amount: 0, ct_rate: 10 }], []];
          if (sql.includes('FROM ACTIVITIES_EMPLOYEES')) return [[], []];
          throw new Error(`Unexpected query in mock pool: ${sql}`);
        }),
        getConnection: jest.fn(async () => conn)
      };
      const repo = new ActivityRepository(pool);
      const category = { id: 1, NAME: 'food', categoryTaxes: [] };
      const activity = { id: null, name: 'fresh', address: 1, category };

      const result = await repo.save(activity);

      expect(connQuery).toHaveBeenCalledTimes(1);
      expect(connQuery).toHaveBeenCalledWith(
        expect.stringMatching(/INSERT INTO ACTIVITY \(NAME, ADDRESS, CATEGORY_ID\) VALUES \(\?, \?, \?\)/),
        ['fresh', 1, 1]
      );
      expect(conn.beginTransaction).toHaveBeenCalledTimes(1);
      expect(conn.commit).toHaveBeenCalledTimes(1);
      expect(conn.release).toHaveBeenCalledTimes(1);

      expect(result.id).toBe(42);
    });
  });

  describe('deleteById', () => {
    it('issues a DELETE with the activity id', async () => {
      const pool = makeMockPool([
        { match: startsWith('DELETE'), rows: [] }
      ]);
      const repo = new ActivityRepository(pool);
      await repo.deleteById(7);

      expect(pool.calls).toHaveLength(1);
      expect(pool.calls[0].sql).toMatch(/DELETE FROM ACTIVITY WHERE id = \?/);
      expect(pool.calls[0].params).toEqual([7]);
    });
  });

  describe('deleteCascadingById', () => {
    /**
     * Builds a pool mock that exposes `getConnection()` returning a
     * connection whose `query` is dispatched against the same handler
     * set as `makeMockPool`. Records `beginTransaction`, `commit`,
     * `rollback`, and `release` so the test can assert the transaction
     * lifecycle.
     */
    function makeTransactionalMockPool(handlers) {
      const calls = [];
      const txnLog = [];
      const connQuery = jest.fn(async (sql, params) => {
        calls.push({ sql, params, on: 'connection' });
        for (const { match, rows, throw: shouldThrow } of handlers) {
          if (match(sql, params)) {
            if (shouldThrow) throw shouldThrow(new Error(`forced failure on ${sql.trimStart().slice(0, 40)}`));
            return [rows, []];
          }
        }
        throw new Error(`Unexpected query in mock pool: ${sql}`);
      });
      const conn = {
        query: connQuery,
        beginTransaction: jest.fn(async () => { txnLog.push('BEGIN'); }),
        commit: jest.fn(async () => { txnLog.push('COMMIT'); }),
        rollback: jest.fn(async () => { txnLog.push('ROLLBACK'); }),
        release: jest.fn(() => { txnLog.push('RELEASE'); })
      };
      const pool = {
        query: jest.fn(async (sql, params) => {
          calls.push({ sql, params, on: 'pool' });
          for (const { match, rows, throw: shouldThrow } of handlers) {
            if (match(sql, params)) {
              if (shouldThrow) throw shouldThrow(new Error(`forced failure on ${sql.trimStart().slice(0, 40)}`));
              return [rows, []];
            }
          }
          throw new Error(`Unexpected query in mock pool: ${sql}`);
        }),
        getConnection: jest.fn(async () => {
          txnLog.push('GET_CONNECTION');
          return conn;
        })
      };
      return { pool, conn, calls, txnLog };
    }

    it('deletes taxes before the activity in a single transaction and commits', async () => {
      const { pool, conn, calls, txnLog } = makeTransactionalMockPool([
        { match: includes('FROM ACTIVITIES_EMPLOYEES'), rows: [] },
        { match: includes('FROM TAX WHERE ACTIVITY_ID'), rows: [] },
        { match: includes('FROM ACTIVITY WHERE id'),     rows: [] }
      ]);
      const repo = new ActivityRepository(pool);

      await repo.deleteCascadingById(7);

      // Transaction lifecycle in the right order.
      expect(txnLog).toEqual(['GET_CONNECTION', 'BEGIN', 'COMMIT', 'RELEASE']);

      // Employee delete runs first, then tax delete (so the FK does not fail), then the
      // activity delete, all on the same connection.
      expect(calls).toHaveLength(3);
      expect(calls[0].sql).toMatch(/DELETE FROM ACTIVITIES_EMPLOYEES WHERE ACTIVITY_ID = \?/);
      expect(calls[0].params).toEqual([7]);
      expect(calls[0].on).toBe('connection');
      expect(calls[1].sql).toMatch(/DELETE FROM TAX WHERE ACTIVITY_ID = \?/);
      expect(calls[1].params).toEqual([7]);
      expect(calls[1].on).toBe('connection');
      expect(calls[2].sql).toMatch(/DELETE FROM ACTIVITY WHERE id = \?/);
      expect(calls[2].params).toEqual([7]);
      expect(calls[2].on).toBe('connection');

      // Neither call leaks to the pool directly.
      expect(pool.query).not.toHaveBeenCalled();
      // The connection is always released.
      expect(conn.release).toHaveBeenCalledTimes(1);
    });

    it('rolls back and rethrows when the tax delete fails', async () => {
      const dbError = Object.assign(new Error('FK violation'), { code: 'ER_ROW_IS_REFERENCED_2' });
      const { pool, conn, txnLog } = makeTransactionalMockPool([
        { match: includes('FROM ACTIVITIES_EMPLOYEES'), rows: [] },
        { match: includes('FROM TAX WHERE ACTIVITY_ID'), rows: [], throw: () => dbError }
      ]);
      const repo = new ActivityRepository(pool);

      await expect(repo.deleteCascadingById(7)).rejects.toBe(dbError);

      // No commit, a rollback, and the connection is still released.
      expect(txnLog).toEqual(['GET_CONNECTION', 'BEGIN', 'ROLLBACK', 'RELEASE']);
      expect(conn.commit).not.toHaveBeenCalled();
      // The activity delete must NOT have been attempted.
      expect(conn.query.mock.calls.some(([sql]) => /DELETE FROM ACTIVITY/.test(sql))).toBe(false);
    });

    it('rolls back and rethrows when the activity delete fails (after tax delete succeeded)', async () => {
      const dbError = Object.assign(new Error('row locked'), { code: 'ER_LOCK_WAIT_TIMEOUT' });
      const { pool, conn, txnLog } = makeTransactionalMockPool([
        { match: includes('FROM ACTIVITIES_EMPLOYEES'), rows: [] },
        { match: includes('FROM TAX WHERE ACTIVITY_ID'), rows: [] },
        { match: includes('FROM ACTIVITY WHERE id'),     rows: [], throw: () => dbError }
      ]);
      const repo = new ActivityRepository(pool);

      await expect(repo.deleteCascadingById(7)).rejects.toBe(dbError);

      // The tax delete ran but was rolled back. No commit.
      expect(txnLog).toEqual(['GET_CONNECTION', 'BEGIN', 'ROLLBACK', 'RELEASE']);
      expect(conn.query).toHaveBeenCalledTimes(3);
    });
  });

  describe('CategoryTax entity shape', () => {
    it('produces CategoryTax instances with numeric fields coerced', async () => {
      const pool = makeMockPool([
        {
          match: includes('FROM ACTIVITY WHERE id'),
          rows: [{ id: 1, NAME: 'shop', ADDRESS: 42, CATEGORY_ID: 1 }]
        },
        {
          match: includes('FROM ACTIVITIES_EMPLOYEES'),
          rows: []
        },
        {
          match: includes('FROM CATEGORY c'),
          rows: [
            { id: 1, NAME: 'food', ct_id: 7, ct_amount: '1000', ct_rate: '20' }
          ]
        }
      ]);
      const repo = new ActivityRepository(pool);
      const result = await repo.findById(1);

      const tax = result.category.categoryTaxes[0];
      expect(tax).toBeInstanceOf(CategoryTax);
      expect(tax.id).toBe(7);
      expect(tax.amount).toBe(1000);
      expect(tax.rate).toBe(20);
    });
  });
});
