/***
 * @fileoverview SQL repository for the `CATEGORY` and `CATEGORY_TAXES`
 * tables.
 *
 * The bracket collection is managed with two SQL statements inside a
 * single transaction: an `UPDATE` (or `INSERT` for new categories) on
 * the parent, followed by a `DELETE` of the existing brackets and
 * one `INSERT` per bracket. This gives cascade + orphan-removal
 * semantics without an ORM.
 */

import { toNumber, buildOrderBy } from './_helpers.js';
import { Category } from '../entity/Category.js';
import { CategoryTax } from '../entity/CategoryTax.js';

/**
 * @class CategoryRepository
 * @classdesc Data-access layer for `CATEGORY` + `CATEGORY_TAXES`.
 */
export class CategoryRepository {
  /**
   * @param {import('mysql2/promise').Pool} pool
   */
  constructor(pool) {
    /** @property {import('mysql2/promise').Pool} */
    this.pool = pool;
  }

  /**
   * Loads the category and its brackets with two queries. Returns
   * `null` when the id does not exist.
   *
   * @param {number|string} id
   * @returns {Promise<Category|null>}
   */
  async findById(id) {
    const [rows] = await this.pool.query(
      'SELECT id, NAME FROM CATEGORY WHERE id = ?',
      [id]
    );
    if (rows.length === 0) return null;
    const row = rows[0];

    const [taxes] = await this.pool.query(
      'SELECT id, AMOUNT, RATE, CATEGORY_ID FROM CATEGORY_TAXES WHERE CATEGORY_ID = ?',
      [row.id]
    );

    return this._hydrate(row, taxes);
  }

  /**
   * Returns one page of categories and the total count. The page query
   * joins `CATEGORY_TAXES` and the result is collapsed in JS to
   * preserve a one-to-many shape with no duplicate category rows.
   *
   * @param {{ page: number, size: number, sort: { field: string, direction: 'asc'|'desc' }|null, offset: number }} pageable
   * @returns {Promise<{ rows: Category[], total: number }>}
   */
  async findAll(pageable) {
    const { clause } = buildOrderBy(pageable.sort, 'c', ['id', 'name'], 'ORDER BY c.id DESC');
    const dataSql = `SELECT c.id, c.NAME, ct.id AS ct_id, ct.AMOUNT AS ct_amount, ct.RATE AS ct_rate
                     FROM CATEGORY c
                     LEFT JOIN CATEGORY_TAXES ct ON ct.CATEGORY_ID = c.id
                     ${clause}
                     LIMIT ? OFFSET ?`;
    const [rows] = await this.pool.query(dataSql, [pageable.size, pageable.offset]);
    const [countRows] = await this.pool.query('SELECT COUNT(*) AS total FROM CATEGORY');

    const byId = new Map();
    for (const r of rows) {
      let cat = byId.get(r.id);
      if (!cat) {
        cat = { id: r.id, NAME: r.NAME, categoryTaxes: [] };
        byId.set(r.id, cat);
      }
      if (r.ct_id !== null) {
        cat.categoryTaxes.push({ id: r.ct_id, AMOUNT: r.ct_amount, RATE: r.ct_rate });
      }
    }
    const categories = Array.from(byId.values()).map((c) => this._hydrate(c, c.categoryTaxes));
    return { rows: categories, total: toNumber(countRows[0].total) };
  }

  /**
   * Inserts a new category (with brackets) or updates an existing one.
   * On update the existing brackets are wiped and the current set is
   * re-inserted — there is no per-bracket diff. The whole sequence
   * runs in a single transaction; on error the work is rolled back.
   *
   * @param {Category} category
   * @returns {Promise<Category>}
   */
  async save(category) {
    const conn = await this.pool.getConnection();
    try {
      await conn.beginTransaction();

      if (category.id) {
        await conn.query('UPDATE CATEGORY SET NAME = ? WHERE id = ?', [category.name, category.id]);
        await conn.query('DELETE FROM CATEGORY_TAXES WHERE CATEGORY_ID = ?', [category.id]);
      } else {
        const [result] = await conn.query('INSERT INTO CATEGORY (NAME) VALUES (?)', [category.name]);
        category.id = result.insertId;
      }

      for (const tax of category.categoryTaxes || []) {
        await conn.query(
          'INSERT INTO CATEGORY_TAXES (AMOUNT, RATE, CATEGORY_ID) VALUES (?, ?, ?)',
          [tax.amount, tax.rate, category.id]
        );
      }

      await conn.commit();
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }

    return this.findById(category.id);
  }

  /**
   * @param {number|string} id
   * @returns {Promise<void>}
   */
  async deleteById(id) {
    await this.pool.query('DELETE FROM CATEGORY WHERE id = ?', [id]);
  }

  // -------------------------------------------------------------------------

  /**
   * Builds a `Category` entity from a parent row and a list of
   * bracket rows.
   *
   * @param {{ id: *, NAME: string }} row
   * @param {Array<{ id: *, AMOUNT: *, RATE: * }>} taxes
   * @returns {Category}
   * @private
   */
  _hydrate(row, taxes) {
    return new Category({
      id: toNumber(row.id),
      name: row.NAME,
      categoryTaxes: (taxes || []).map((t) => new CategoryTax({
        id: toNumber(t.id),
        amount: toNumber(t.AMOUNT),
        rate: toNumber(t.RATE)
      }))
    });
  }
}
