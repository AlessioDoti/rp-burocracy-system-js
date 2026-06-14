import { describe, it, expect, jest } from '@jest/globals';
import { CategoryRepository } from '../../../../src/persistence/repository/CategoryRepository.js';
import { Category } from '../../../../src/persistence/entity/Category.js';
import { CategoryTax } from '../../../../src/persistence/entity/CategoryTax.js';

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
      for (const { match, rows } of handlers) {
        if (match(sql, params)) return [rows, []];
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

const includes = (substring) => (sql) => sql.includes(substring);

describe('CategoryRepository', () => {
  describe('findById', () => {
    it('returns null when the category does not exist', async () => {
      const pool = makeMockPool([
        { match: includes('FROM CATEGORY WHERE id'), rows: [] }
      ]);
      const repo = new CategoryRepository(pool);
      expect(await repo.findById(999)).toBeNull();
    });

    it('returns the category with its brackets', async () => {
      const pool = makeMockPool([
        { match: includes('FROM CATEGORY WHERE id'), rows: [{ id: 1, NAME: 'food' }] },
        { match: includes('FROM CATEGORY_TAXES WHERE CATEGORY_ID'), rows: [
          { id: 10, AMOUNT: 0, RATE: 10, CATEGORY_ID: 1 },
          { id: 11, AMOUNT: 1000, RATE: 20, CATEGORY_ID: 1 }
        ] }
      ]);
      const repo = new CategoryRepository(pool);
      const result = await repo.findById(1);

      expect(result).toBeInstanceOf(Category);
      expect(result.id).toBe(1);
      expect(result.name).toBe('food');
      expect(result.categoryTaxes).toHaveLength(2);
      expect(result.categoryTaxes[0]).toBeInstanceOf(CategoryTax);
      expect(result.categoryTaxes[0].amount).toBe(0);
      expect(result.categoryTaxes[0].rate).toBe(10);
      expect(result.categoryTaxes[1].amount).toBe(1000);
    });

    it('returns the category with empty brackets when no taxes exist', async () => {
      const pool = makeMockPool([
        { match: includes('FROM CATEGORY WHERE id'), rows: [{ id: 1, NAME: 'food' }] },
        { match: includes('FROM CATEGORY_TAXES WHERE CATEGORY_ID'), rows: [] }
      ]);
      const repo = new CategoryRepository(pool);
      const result = await repo.findById(1);
      expect(result.categoryTaxes).toEqual([]);
    });
  });

  describe('findAll', () => {
    it('returns a page of categories with their brackets', async () => {
      const pool = makeMockPool([
        {
          match: includes('FROM CATEGORY c') && includes('LIMIT'),
          rows: [
            { id: 1, NAME: 'food', ct_id: 10, ct_amount: 0, ct_rate: 10 },
            { id: 1, NAME: 'food', ct_id: 11, ct_amount: 1000, ct_rate: 20 },
            { id: 2, NAME: 'tech', ct_id: 12, ct_amount: 0, ct_rate: 5 }
          ]
        },
        { match: includes('COUNT(*) AS total FROM CATEGORY'), rows: [{ total: 2 }] }
      ]);
      const repo = new CategoryRepository(pool);
      const result = await repo.findAll({ page: 0, size: 10, sort: null, offset: 0 });

      expect(result.total).toBe(2);
      expect(result.rows).toHaveLength(2);
      expect(result.rows[0].id).toBe(1);
      expect(result.rows[0].categoryTaxes).toHaveLength(2);
      expect(result.rows[1].id).toBe(2);
      expect(result.rows[1].categoryTaxes).toHaveLength(1);
    });

    it('returns an empty page when there are no categories', async () => {
      const pool = makeMockPool([
        { match: includes('FROM CATEGORY c') && includes('LIMIT'), rows: [] },
        { match: includes('COUNT(*) AS total FROM CATEGORY'), rows: [{ total: 0 }] }
      ]);
      const repo = new CategoryRepository(pool);
      const result = await repo.findAll({ page: 0, size: 10, sort: null, offset: 0 });
      expect(result.total).toBe(0);
      expect(result.rows).toHaveLength(0);
    });
  });

  describe('save', () => {
    it('inserts a new category and brackets in a transaction', async () => {
      const { pool, conn, txnLog } = makeTransactionalMockPool([
        { match: startsWith('INSERT INTO CATEGORY'), rows: [{ insertId: 42 }] },
        { match: startsWith('INSERT INTO CATEGORY_TAXES'), rows: [] },
        { match: includes('FROM CATEGORY WHERE id'), rows: [{ id: 42, NAME: 'new' }] },
        { match: includes('FROM CATEGORY_TAXES WHERE CATEGORY_ID'), rows: [
          { id: 1, AMOUNT: 100, RATE: 5, CATEGORY_ID: 42 }
        ] }
      ]);
      const repo = new CategoryRepository(pool);
      const category = new Category({
        name: 'new',
        categoryTaxes: [new CategoryTax({ amount: 100, rate: 5 })]
      });

      const result = await repo.save(category);

      expect(txnLog).toEqual(['GET_CONNECTION', 'BEGIN', 'COMMIT', 'RELEASE']);
      expect(result.id).toBe(42);
      expect(result.categoryTaxes).toHaveLength(1);
    });

    it('updates an existing category and replaces brackets', async () => {
      const { pool, conn, txnLog } = makeTransactionalMockPool([
        { match: startsWith('UPDATE CATEGORY'), rows: [] },
        { match: startsWith('DELETE FROM CATEGORY_TAXES'), rows: [] },
        { match: startsWith('INSERT INTO CATEGORY_TAXES'), rows: [] },
        { match: includes('FROM CATEGORY WHERE id'), rows: [{ id: 1, NAME: 'updated' }] },
        { match: includes('FROM CATEGORY_TAXES WHERE CATEGORY_ID'), rows: [
          { id: 5, AMOUNT: 200, RATE: 15, CATEGORY_ID: 1 }
        ] }
      ]);
      const repo = new CategoryRepository(pool);
      const category = new Category({
        id: 1,
        name: 'updated',
        categoryTaxes: [new CategoryTax({ amount: 200, rate: 15 })]
      });

      const result = await repo.save(category);

      expect(txnLog).toEqual(['GET_CONNECTION', 'BEGIN', 'COMMIT', 'RELEASE']);
      expect(result.name).toBe('updated');
      expect(result.categoryTaxes).toHaveLength(1);
    });

    it('rolls back and rethrows on failure', async () => {
      const dbError = new Error('DB failure');
      const { pool, conn, txnLog } = makeTransactionalMockPool([
        { match: startsWith('INSERT INTO CATEGORY'), rows: [], throw: () => dbError }
      ]);
      const repo = new CategoryRepository(pool);
      const category = new Category({ name: 'fail' });

      await expect(repo.save(category)).rejects.toThrow('DB failure');
      expect(txnLog).toEqual(['GET_CONNECTION', 'BEGIN', 'ROLLBACK', 'RELEASE']);
    });
  });

  describe('deleteById', () => {
    it('issues a DELETE with the category id', async () => {
      const pool = makeMockPool([
        { match: includes('DELETE FROM CATEGORY'), rows: [] }
      ]);
      const repo = new CategoryRepository(pool);
      await repo.deleteById(7);
      expect(pool.calls[0].sql).toMatch(/DELETE FROM CATEGORY WHERE id = \?/);
      expect(pool.calls[0].params).toEqual([7]);
    });
  });
});

const startsWith = (prefix) => (sql) => sql.trimStart().startsWith(prefix);
