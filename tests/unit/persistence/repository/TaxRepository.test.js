import { describe, it, expect, jest } from '@jest/globals';
import { TaxRepository } from '../../../../src/persistence/repository/TaxRepository.js';
import { Tax } from '../../../../src/persistence/entity/Tax.js';
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

describe('TaxRepository', () => {
  describe('findById', () => {
    it('returns null when the tax does not exist', async () => {
      const pool = makeMockPool([
        { match: includes('FROM TAX t') && includes('WHERE t.id'), rows: [] }
      ]);
      const repo = new TaxRepository(pool);
      expect(await repo.findById(999)).toBeNull();
    });

    it('returns the tax with a fully-hydrated activity (3 brackets, not 1)', async () => {
      // Category 1 has 3 brackets. The old code would have returned
      // only the first bracket because of the JOIN + _rowToEntity(rows[0]) bug.
      const pool = makeMockPool([
        { match: includes('FROM TAX t') && includes('WHERE t.id'), rows: [{
          t_id: 10, t_activity_id: 1,
          t_person_uuid: 'uuid-mario',
          t_expenses: 500, t_earnings: 3000, t_revenue: 2500,
          t_tax_amount: 250,
          t_elapsed_days: 3, t_elapsed_bill_amount: 45000, t_taxable_income: 250 * 45000,
          t_declaration_date: '2026-06-06T00:00:00.000Z', t_payed: 0
        }] },
        { match: includes('FROM ACTIVITY a') && includes('WHERE a.id = ?'), rows: [{
          a_id: 1, a_name: 'shop', a_address: 42, a_category_id: 1
        }] },
        { match: includes('FROM CATEGORY c') && includes('WHERE c.id = ?'), rows: [
          { id: 1, NAME: 'food', ct_id: 1, ct_amount: 0, ct_rate: 10 },
          { id: 1, NAME: 'food', ct_id: 2, ct_amount: 1000, ct_rate: 20 },
          { id: 1, NAME: 'food', ct_id: 3, ct_amount: 5000, ct_rate: 30 }
        ] }
      ]);
      const repo = new TaxRepository(pool);
      const result = await repo.findById(10);

      expect(result).toBeInstanceOf(Tax);
      expect(result.id).toBe(10);
      expect(result.activity).toBeInstanceOf(Activity);
      expect(result.activity.category).toBeInstanceOf(Category);
      // All 3 brackets loaded, not 1.
      expect(result.activity.category.categoryTaxes).toHaveLength(3);
      const bracketIds = result.activity.category.categoryTaxes.map((t) => t.id).sort();
      expect(bracketIds).toEqual([1, 2, 3]);
    });

    it('returns the tax with activity=null when ACTIVITY_ID is null', async () => {
      const pool = makeMockPool([
        { match: includes('FROM TAX t') && includes('WHERE t.id'), rows: [{
          t_id: 10, t_activity_id: null,
          t_person_uuid: 'uuid-a',
          t_expenses: 0, t_earnings: 0, t_revenue: 0,
          t_tax_amount: 0,
          t_elapsed_days: 0, t_elapsed_bill_amount: 0, t_taxable_income: 0,
          t_declaration_date: null, t_payed: 0
        }] }
      ]);
      const repo = new TaxRepository(pool);
      const result = await repo.findById(10);
      expect(result.activity).toBeNull();
      // No activity query runs when ACTIVITY_ID is null.
      const activityCalls = pool.calls.filter((c) => c.sql.includes('FROM ACTIVITY a'));
      expect(activityCalls).toHaveLength(0);
    });
  });

  describe('findAll', () => {
    it('returns exactly pageable.size distinct taxes, each with its full bracket set', async () => {
      // 2 taxes, both for activity 1, whose category has 3 brackets.
      const pool = makeMockPool([
        {
          // (1) Page of TAX
          match: (sql) => sql.includes('FROM TAX t') && sql.includes('LIMIT'),
          rows: [
            {
              t_id: 1, t_activity_id: 1,
              t_person_uuid: 'uuid-a',
              t_expenses: 0, t_earnings: 100, t_revenue: 100,
              t_tax_amount: 10,
              t_elapsed_days: 0, t_elapsed_bill_amount: 0, t_taxable_income: 0,
              t_declaration_date: '2026-01-01', t_payed: 0
            },
            {
              t_id: 2, t_activity_id: 1,
              t_manager_name: 'c', t_manager_surname: 'd', t_manager_role: 'M',
              t_expenses: 0, t_earnings: 200, t_revenue: 200,
              t_tax_amount: 20,
              t_elapsed_days: 0, t_elapsed_bill_amount: 0, t_taxable_income: 0,
              t_declaration_date: '2026-02-01', t_payed: 1
            }
          ]
        },
        {
          // (2) Activities (deduped)
          match: (sql) => sql.includes('FROM ACTIVITY a') && sql.includes('IN ('),
          rows: [{ a_id: 1, a_name: 'shop', a_address: 42, a_category_id: 1 }]
        },
        {
          // (3) Categories + brackets for those activities
          match: (sql) => sql.includes('FROM CATEGORY c') && sql.includes('IN ('),
          rows: [
            { id: 1, NAME: 'food', ct_id: 1, ct_amount: 0, ct_rate: 10 },
            { id: 1, NAME: 'food', ct_id: 2, ct_amount: 1000, ct_rate: 20 },
            { id: 1, NAME: 'food', ct_id: 3, ct_amount: 5000, ct_rate: 30 }
          ]
        },
        {
          // (4) Total count
          match: includes('COUNT(*) AS total FROM TAX'),
          rows: [{ total: 2 }]
        }
      ]);
      const repo = new TaxRepository(pool);
      const result = await repo.findAll({ page: 0, size: 10, sort: null, offset: 0 });

      // Exactly 2 distinct taxes, not 6 (2 × 3 brackets).
      expect(result.rows).toHaveLength(2);
      expect(result.total).toBe(2);
      const ids = new Set(result.rows.map((r) => r.id));
      expect(ids.size).toBe(2);

      // Every tax carries ALL 3 brackets of its activity's category, not 1.
      for (const tax of result.rows) {
        expect(tax.activity).toBeInstanceOf(Activity);
        expect(tax.activity.category).toBeInstanceOf(Category);
        expect(tax.activity.category.categoryTaxes).toHaveLength(3);
      }
    });

    it('does not multiply rows by bracket count (regression for the JOIN bug)', async () => {
      // Simulate: 5 taxes, all for the same activity whose category has 4 brackets.
      // The OLD code would have returned 5 × 4 = 20 rows — copies of the
      // same 5 taxes, each carrying only one bracket. The NEW code returns
      // exactly 5 taxes, each with all 4 brackets.
      const taxRows = [];
      for (let i = 1; i <= 5; i++) {
        taxRows.push({
          t_id: i, t_activity_id: 1,
          t_person_uuid: `uuid-m${i}`,
          t_expenses: 0, t_earnings: i * 100, t_revenue: i * 100,
          t_tax_amount: i * 10,
          t_elapsed_days: 0, t_elapsed_bill_amount: 0, t_taxable_income: 0,
          t_declaration_date: '2026-01-01', t_payed: 0
        });
      }
      const categoryRows = [];
      for (let j = 1; j <= 4; j++) {
        categoryRows.push({ id: 1, NAME: 'food', ct_id: j, ct_amount: j * 100, ct_rate: j * 5 });
      }

      const pool = makeMockPool([
        { match: (sql) => sql.includes('FROM TAX t') && sql.includes('LIMIT'), rows: taxRows },
        { match: (sql) => sql.includes('FROM ACTIVITY a') && sql.includes('IN ('),
          rows: [{ a_id: 1, a_name: 'shop', a_address: 1, a_category_id: 1 }] },
        { match: (sql) => sql.includes('FROM CATEGORY c') && sql.includes('IN ('), rows: categoryRows },
        { match: includes('COUNT(*) AS total FROM TAX'), rows: [{ total: 5 }] }
      ]);
      const repo = new TaxRepository(pool);
      const result = await repo.findAll({ page: 0, size: 10, sort: null, offset: 0 });

      // Exactly 5 taxes, not 20.
      expect(result.rows).toHaveLength(5);
      // Every id is unique (no duplicates from row multiplication).
      const ids = new Set(result.rows.map((r) => r.id));
      expect(ids.size).toBe(5);
      // Every tax carries ALL 4 brackets, not 1.
      for (const tax of result.rows) {
        expect(tax.activity.category.categoryTaxes).toHaveLength(4);
      }
      // Total is the real count of TAX rows, not multiplied.
      expect(result.total).toBe(5);
    });

    it('returns an empty page with the correct total when there are no taxes', async () => {
      const pool = makeMockPool([
        { match: (sql) => sql.includes('FROM TAX t') && sql.includes('LIMIT'), rows: [] },
        { match: includes('COUNT(*) AS total FROM TAX'), rows: [{ total: 0 }] }
      ]);
      const repo = new TaxRepository(pool);
      const result = await repo.findAll({ page: 0, size: 20, sort: null, offset: 0 });

      expect(result.total).toBe(0);
      expect(result.rows).toHaveLength(0);
      // The activity and category queries must NOT run on an empty page.
      const activityCalls = pool.calls.filter((c) => c.sql.includes('FROM ACTIVITY a'));
      const categoryCalls = pool.calls.filter((c) => c.sql.includes('FROM CATEGORY c'));
      expect(activityCalls).toHaveLength(0);
      expect(categoryCalls).toHaveLength(0);
    });

    it('dedupes activity ids before the IN clause when many taxes share an activity', async () => {
      // 3 taxes, all for the same activity id = 1.
      const pool = makeMockPool([
        { match: (sql) => sql.includes('FROM TAX t') && sql.includes('LIMIT'),
          rows: [
            { t_id: 1, t_activity_id: 1, t_person_uuid: 'uuid-a',
              t_expenses: 0, t_earnings: 1, t_revenue: 1, t_tax_amount: 0,
              t_elapsed_days: 0, t_elapsed_bill_amount: 0, t_taxable_income: 0,
              t_declaration_date: '2026-01-01', t_payed: 0 },
            { t_id: 2, t_activity_id: 1, t_person_uuid: 'uuid-a',
              t_expenses: 0, t_earnings: 2, t_revenue: 2, t_tax_amount: 0,
              t_elapsed_days: 0, t_elapsed_bill_amount: 0, t_taxable_income: 0,
              t_declaration_date: '2026-01-02', t_payed: 0 },
            { t_id: 3, t_activity_id: 1, t_person_uuid: 'uuid-a',
              t_expenses: 0, t_earnings: 3, t_revenue: 3, t_tax_amount: 0,
              t_elapsed_days: 0, t_elapsed_bill_amount: 0, t_taxable_income: 0,
              t_declaration_date: '2026-01-03', t_payed: 0 }
          ]
        },
        { match: (sql) => sql.includes('FROM ACTIVITY a') && sql.includes('IN ('),
          rows: [{ a_id: 1, a_name: 'shop', a_address: 1, a_category_id: 1 }] },
        { match: (sql) => sql.includes('FROM CATEGORY c') && sql.includes('IN ('),
          rows: [
            { id: 1, NAME: 'food', ct_id: 1, ct_amount: 0, ct_rate: 10 },
            { id: 1, NAME: 'food', ct_id: 2, ct_amount: 1000, ct_rate: 20 }
          ]
        },
        { match: includes('COUNT(*) AS total FROM TAX'), rows: [{ total: 3 }] }
      ]);
      const repo = new TaxRepository(pool);
      const result = await repo.findAll({ page: 0, size: 10, sort: null, offset: 0 });

      // 3 distinct taxes, all with the same activity (id=1) and category (1) with 2 brackets.
      expect(result.rows).toHaveLength(3);
      expect(result.total).toBe(3);
      for (const tax of result.rows) {
        expect(tax.activity.id).toBe(1);
        expect(tax.activity.category.categoryTaxes).toHaveLength(2);
      }
      // The activity query is called once, with one placeholder.
      const actCall = pool.calls.find((c) => c.sql.includes('FROM ACTIVITY a') && c.sql.includes('IN ('));
      expect(actCall).toBeDefined();
      expect(actCall.params).toEqual([1]); // not [1, 1, 1] — deduped
    });
  });

  describe('findByActivityId', () => {
    it('returns only taxes for the given activity, each with its full bracket set', async () => {
      // 2 taxes for activity 5, whose category has 2 brackets.
      const pool = makeMockPool([
        { match: (sql) => sql.includes('FROM TAX t') && sql.includes('WHERE t.ACTIVITY_ID') && sql.includes('LIMIT'),
          rows: [
            { t_id: 1, t_activity_id: 5, t_person_uuid: 'uuid-a',
              t_expenses: 0, t_earnings: 1, t_revenue: 1, t_tax_amount: 0.1,
              t_elapsed_days: 0, t_elapsed_bill_amount: 0, t_taxable_income: 0,
              t_declaration_date: '2026-01-01', t_payed: 0 },
            { t_id: 2, t_activity_id: 5, t_person_uuid: 'uuid-a',
              t_expenses: 0, t_earnings: 2, t_revenue: 2, t_tax_amount: 0.2,
              t_elapsed_days: 0, t_elapsed_bill_amount: 0, t_taxable_income: 0,
              t_declaration_date: '2026-01-02', t_payed: 0 }
          ]
        },
        // Activity is loaded once (not per tax) because all rows share it.
        { match: includes('FROM ACTIVITY a') && includes('WHERE a.id = ?'),
          rows: [{ a_id: 5, a_name: 'shop', a_address: 1, a_category_id: 1 }] },
        { match: includes('FROM CATEGORY c') && includes('WHERE c.id = ?'),
          rows: [
            { id: 1, NAME: 'food', ct_id: 1, ct_amount: 0, ct_rate: 10 },
            { id: 1, NAME: 'food', ct_id: 2, ct_amount: 1000, ct_rate: 20 }
          ]
        },
        { match: includes('COUNT(*) AS total FROM TAX WHERE ACTIVITY_ID'),
          rows: [{ total: 2 }] }
      ]);
      const repo = new TaxRepository(pool);
      const result = await repo.findByActivityId(5, { page: 0, size: 10, sort: null, offset: 0 });

      expect(result.rows).toHaveLength(2);
      expect(result.total).toBe(2);
      for (const tax of result.rows) {
        expect(tax.activity.id).toBe(5);
        expect(tax.activity.category.categoryTaxes).toHaveLength(2);
      }
      // The activity query is called only once even though there are 2 taxes.
      const actCalls = pool.calls.filter((c) => c.sql.includes('FROM ACTIVITY a') && includes('WHERE a.id = ?'));
      expect(actCalls).toHaveLength(1);
    });

    it('returns an empty page with the correct total when the activity has no taxes', async () => {
      const pool = makeMockPool([
        { match: (sql) => sql.includes('FROM TAX t') && sql.includes('LIMIT'), rows: [] },
        { match: includes('COUNT(*) AS total FROM TAX WHERE ACTIVITY_ID'),
          rows: [{ total: 0 }] }
      ]);
      const repo = new TaxRepository(pool);
      const result = await repo.findByActivityId(99, { page: 0, size: 10, sort: null, offset: 0 });

      expect(result.total).toBe(0);
      expect(result.rows).toHaveLength(0);
    });
  });

  describe('findTopByActivityNameOrderByDeclarationDateDesc', () => {
    it('returns the most recent declaration date as a Date, or null when none', async () => {
      const pool = makeMockPool([
        { match: includes('ORDER BY t.DECLARATION_DATE DESC') && includes('LIMIT 1'),
          rows: [{ DECLARATION_DATE: '2026-05-15T00:00:00.000Z' }] }
      ]);
      const repo = new TaxRepository(pool);
      const result = await repo.findTopByActivityNameOrderByDeclarationDateDesc('shop');
      expect(result).toBeInstanceOf(Date);
    });

    it('returns null when no tax has been filed for the activity', async () => {
      const pool = makeMockPool([
        { match: includes('ORDER BY t.DECLARATION_DATE DESC') && includes('LIMIT 1'), rows: [] }
      ]);
      const repo = new TaxRepository(pool);
      expect(await repo.findTopByActivityNameOrderByDeclarationDateDesc('ghost')).toBeNull();
    });
  });

  describe('save', () => {
    it('issues an UPDATE when the tax has an id, then reloads via findById', async () => {
      const pool = makeMockPool([
        { match: startsWith('UPDATE'), rows: [] },
        { match: includes('FROM TAX t') && includes('WHERE t.id'), rows: [{
          t_id: 1, t_activity_id: 2,
          t_person_uuid: 'uuid-a',
          t_expenses: 0, t_earnings: 100, t_revenue: 100,
          t_tax_amount: 10,
          t_elapsed_days: 0, t_elapsed_bill_amount: 0, t_taxable_income: 0,
          t_declaration_date: '2026-06-06', t_payed: 1
        }] },
        { match: includes('FROM ACTIVITY a') && includes('WHERE a.id = ?'),
          rows: [{ a_id: 2, a_name: 'shop', a_address: 1, a_category_id: 1 }] },
        { match: includes('FROM CATEGORY c') && includes('WHERE c.id = ?'),
          rows: [{ id: 1, NAME: 'food', ct_id: 1, ct_amount: 0, ct_rate: 10 }] }
      ]);
      const repo = new TaxRepository(pool);
      const tax = {
        id: 1,
        expenses: 0, earnings: 100, revenue: 100,
        taxAmount: 10,
        elapsedDays: 0, elapsedBillAmount: 0, taxableIncome: 10,
        declarationDate: '2026-06-06', payed: true,
        personUuid: 'uuid-a',
        activity: { id: 2, category: null }
      };

      const result = await repo.save(tax);
      const updateCall = pool.calls.find((c) => c.sql.trimStart().startsWith('UPDATE'));
      expect(updateCall).toBeDefined();
      expect(updateCall.sql).toMatch(/UPDATE TAX SET/);
      // The bracket rate is NOT a column — params count is 12 (was 15 with TAX_RATE).
      expect(updateCall.params).toEqual([2, 'uuid-a', 0, 100, 100, 10, 0, 0, 10, '2026-06-06', 1, 1]);
      expect(result.id).toBe(1);
      expect(result.activity.id).toBe(2);
    });

    it('issues an INSERT when the tax has no id, then reloads via findById', async () => {
      const pool = makeMockPool([
        { match: startsWith('INSERT'), rows: [{ insertId: 42 }] },
        { match: includes('FROM TAX t') && includes('WHERE t.id'), rows: [{
          t_id: 42, t_activity_id: 1,
          t_person_uuid: 'uuid-a',
          t_expenses: 0, t_earnings: 0, t_revenue: 0,
          t_tax_amount: 0,
          t_elapsed_days: 0, t_elapsed_bill_amount: 0, t_taxable_income: 0,
          t_declaration_date: '2026-06-06', t_payed: 0
        }] },
        { match: includes('FROM ACTIVITY a') && includes('WHERE a.id = ?'),
          rows: [{ a_id: 1, a_name: 'shop', a_address: 1, a_category_id: 1 }] },
        { match: includes('FROM CATEGORY c') && includes('WHERE c.id = ?'),
          rows: [{ id: 1, NAME: 'food', ct_id: 1, ct_amount: 0, ct_rate: 10 }] }
      ]);
      const repo = new TaxRepository(pool);
      const tax = {
        id: null, expenses: 0, earnings: 0, payed: false, elapsedDays: 0,
        activity: { id: 1, category: null }
      };
      const result = await repo.save(tax);
      expect(result.id).toBe(42);
    });
  });

  describe('deleteById and deleteByActivityId', () => {
    it('issues a DELETE for a single tax', async () => {
      const pool = makeMockPool([{ match: startsWith('DELETE'), rows: [] }]);
      const repo = new TaxRepository(pool);
      await repo.deleteById(7);
      expect(pool.calls[0].sql).toMatch(/DELETE FROM TAX WHERE id = \?/);
      expect(pool.calls[0].params).toEqual([7]);
    });

    it('issues a DELETE for every tax of an activity', async () => {
      const pool = makeMockPool([{ match: startsWith('DELETE'), rows: [] }]);
      const repo = new TaxRepository(pool);
      await repo.deleteByActivityId(5);
      expect(pool.calls[0].sql).toMatch(/DELETE FROM TAX WHERE ACTIVITY_ID = \?/);
      expect(pool.calls[0].params).toEqual([5]);
    });
  });

  describe('numeric/date coercion in the row mapper', () => {
    it('coerces string-typed numeric and date fields to numbers and Date', async () => {
      const pool = makeMockPool([
        { match: includes('FROM TAX t') && includes('WHERE t.id'), rows: [{
          t_id: '1', t_activity_id: '2',
          t_person_uuid: 'uuid-a',
          t_expenses: '100', t_earnings: '300', t_revenue: '200',
          t_tax_amount: '20',
          t_elapsed_days: '5', t_elapsed_bill_amount: '75000', t_taxable_income: '1500000',
          t_declaration_date: '2026-06-06T00:00:00.000Z', t_payed: 1
        }] },
        { match: includes('FROM ACTIVITY a') && includes('WHERE a.id = ?'),
          rows: [{ a_id: 2, a_name: 'shop', a_address: 0, a_category_id: 1 }] },
        { match: includes('FROM CATEGORY c') && includes('WHERE c.id = ?'),
          rows: [{ id: 1, NAME: 'food', ct_id: 7, ct_amount: '1000', ct_rate: '20' }] }
      ]);
      const repo = new TaxRepository(pool);
      const result = await repo.findById(1);

      expect(result.id).toBe(1);
      expect(result.activity.id).toBe(2);
      expect(result.expenses).toBe(100);
      expect(result.earnings).toBe(300);
      expect(result.taxableIncome).toBe(1500000);
      expect(result.payed).toBe(true);
      expect(result.declarationDate).toBeInstanceOf(Date);
      const bracket = result.activity.category.categoryTaxes[0];
      expect(bracket).toBeInstanceOf(CategoryTax);
      expect(bracket.id).toBe(7);
      expect(bracket.amount).toBe(1000);
      expect(bracket.rate).toBe(20);
    });
  });
});
