/**
 * @fileoverview SQL repository for the `ACTIVITY` table.
 *
 * Every read eagerly loads the related `CATEGORY` and its
 * `CATEGORY_TAXES` rows, so the domain never sees a half-hydrated
 * aggregate.
 *
 * ## Why no JOIN to `CATEGORY_TAXES` in the activity query
 *
 * A single `LEFT JOIN` of `ACTIVITY → CATEGORY → CATEGORY_TAXES` would
 * produce `N_taxes` rows per activity, which causes two bugs:
 *
 * 1. `LIMIT ?` in `findAll` is applied **after** the JOIN, so the
 *    page contains fewer than `pageable.size` distinct activities (or
 *    worse, the same activity repeated `N_taxes` times).
 * 2. `_rowToEntity` collapsing on a single row would only see the
 *    first bracket; calling code would think the category has one
 *    tax, not the full set.
 *
 * The fix is to split the read: first a page of activities (with the
 * `CATEGORY_ID` foreign key), then a second query that fetches the
 * categories and their brackets for the page. The mapper then joins
 * the two in JS. The `COUNT(*)` for the total is a third query, run
 * on the bare `ACTIVITY` table so the count is not multiplied by the
 * number of brackets.
 */

import { toNumber, buildOrderBy } from './_helpers.js';
import { Activity } from '../entity/Activity.js';
import { Category } from '../entity/Category.js';
import { CategoryTax } from '../entity/CategoryTax.js';

/**
 * @class ActivityRepository
 * @classdesc Data-access layer for `ACTIVITY`.
 */
export class ActivityRepository {
  /**
   * @param {import('mysql2/promise').Pool} pool
   */
  constructor(pool) {
    /** @property {import('mysql2/promise').Pool} */
    this.pool = pool;
  }

  /**
   * Looks up one activity by primary key and eagerly loads its
   * category and the full bracket set.
   *
   * @param {number|string} id
   * @returns {Promise<import('../entity/Activity.js').Activity|null>}
   */
  async findById(id) {
    const [activityRows] = await this.pool.query(
      'SELECT id, NAME, ADDRESS, CATEGORY_ID FROM ACTIVITY WHERE id = ?',
      [id]
    );
    if (activityRows.length === 0) return null;
    const category = await this._loadCategory(activityRows[0].CATEGORY_ID);
    return this._rowToActivity(activityRows[0], category);
  }

  /**
   * Looks up one activity by unique name. Used by the post-insert
   * sanity check that wants to surface a friendlier error than the
   * generic MySQL "Duplicate entry".
   *
   * @param {string} name
   * @returns {Promise<import('../entity/Activity.js').Activity|null>}
   */
  async findByName(name) {
    const [activityRows] = await this.pool.query(
      'SELECT id, NAME, ADDRESS, CATEGORY_ID FROM ACTIVITY WHERE NAME = ?',
      [name]
    );
    if (activityRows.length === 0) return null;
    const category = await this._loadCategory(activityRows[0].CATEGORY_ID);
    return this._rowToActivity(activityRows[0], category);
  }

  /**
   * Returns one page of activities and the total row count. See the
   * file-level comment for why this is implemented as three queries
   * instead of a single JOIN.
   *
   * @param {{ page: number, size: number, sort: { field: string, direction: 'asc'|'desc' }|null, offset: number }} pageable
   * @returns {Promise<{ rows: import('../entity/Activity.js').Activity[], total: number }>}
   */
  async findAll(pageable) {
    const { clause } = buildOrderBy(pageable.sort, 'a', ['id', 'name', 'address'], 'ORDER BY a.id DESC');

    // (1) The page of activities. No JOIN to CATEGORY_TAXES: a JOIN
    // would multiply each activity row by the number of its category's
    // brackets and break the LIMIT semantics.
    const [activityRows] = await this.pool.query(
      `SELECT a.id AS a_id, a.NAME AS a_name, a.ADDRESS AS a_address, a.CATEGORY_ID AS a_category_id
       FROM ACTIVITY a
       ${clause}
       LIMIT ? OFFSET ?`,
      [pageable.size, pageable.offset]
    );

    // (3) Total count, on the bare table so it is not multiplied by
    // bracket count. We always run this so the caller can compute
    // `totalPages` even on an empty page.
    const [countRows] = await this.pool.query('SELECT COUNT(*) AS total FROM ACTIVITY');
    const total = toNumber(countRows[0].total);

    if (activityRows.length === 0) {
      return { rows: [], total };
    }

    // (2) Categories and brackets for the activities in the page.
    // Deduplicate the FK list so a category shared by many activities
    // is fetched only once.
    const categoryIds = [
      ...new Set(activityRows.map((r) => r.a_category_id).filter((id) => id !== null))
    ];
    const categoriesById = await this._loadCategoriesByIds(categoryIds);

    const entities = activityRows.map((r) => {
      const category = r.a_category_id !== null
        ? categoriesById.get(r.a_category_id) ?? null
        : null;
      return this._rowToActivity(r, category);
    });
    return { rows: entities, total };
  }

  /**
   * Inserts a new row when `activity.id` is `null`/`undefined`,
   * otherwise updates the existing one. Always reloads the row before
   * returning so the caller sees the canonical post-write state.
   *
   * @param {import('../entity/Activity.js').Activity} activity
   * @returns {Promise<import('../entity/Activity.js').Activity>}
   */
  async save(activity) {
    if (activity.id) {
      await this.pool.query(
        'UPDATE ACTIVITY SET NAME = ?, ADDRESS = ?, CATEGORY_ID = ? WHERE id = ?',
        [activity.name, activity.address, activity.category?.id ?? null, activity.id]
      );
      return this.findById(activity.id);
    }

    const [result] = await this.pool.query(
      'INSERT INTO ACTIVITY (NAME, ADDRESS, CATEGORY_ID) VALUES (?, ?, ?)',
      [activity.name, activity.address, activity.category?.id ?? null]
    );
    return this.findById(result.insertId);
  }

  /**
   * @param {number|string} id
   * @returns {Promise<void>}
   */
  async deleteById(id) {
    await this.pool.query('DELETE FROM ACTIVITY WHERE id = ?', [id]);
  }

  /**
   * Deletes an activity **and** every tax declaration filed against
   * it, in a single transaction so the operation is atomic even on
   * schemas that do not declare `ON DELETE CASCADE` on `FK_TAX_ACTIVITY`.
   *
   * The two statements are issued on the same pooled connection with
   * an explicit `BEGIN`/`COMMIT` (and `ROLLBACK` on error). No
   * application-level ordering is required from the caller.
   *
   * @param {number|string} id
   * @returns {Promise<void>}
   */
  async deleteCascadingById(id) {
    const conn = await this.pool.getConnection();
    try {
      await conn.beginTransaction();
      try {
        await conn.query('DELETE FROM TAX WHERE ACTIVITY_ID = ?', [id]);
        await conn.query('DELETE FROM ACTIVITY WHERE id = ?', [id]);
        await conn.commit();
      } catch (err) {
        await conn.rollback();
        throw err;
      }
    } finally {
      conn.release();
    }
  }

  // -------------------------------------------------------------------------
  // Private helpers
  // -------------------------------------------------------------------------

  /**
   * Loads one category (with its full bracket set) by id. Returns
   * `null` when `categoryId` is `null` or when no such category
   * exists.
   *
   * @param {number|null} categoryId
   * @returns {Promise<Category|null>}
   * @private
   */
  async _loadCategory(categoryId) {
    if (categoryId === null || categoryId === undefined) return null;
    const [catRows] = await this.pool.query(
      `SELECT c.id, c.NAME, ct.id AS ct_id, ct.AMOUNT AS ct_amount, ct.RATE AS ct_rate
       FROM CATEGORY c
       LEFT JOIN CATEGORY_TAXES ct ON ct.CATEGORY_ID = c.id
       WHERE c.id = ?`,
      [categoryId]
    );
    if (catRows.length === 0) return null;
    return this._rowsToCategory(catRows);
  }

  /**
   * Loads many categories (each with its full bracket set) in one
   * round-trip. The result is keyed by category id; missing ids are
   * simply absent from the map.
   *
   * @param {number[]} categoryIds
   * @returns {Promise<Map<number, Category>>}
   * @private
   */
  async _loadCategoriesByIds(categoryIds) {
    /** @type {Map<number, Category>} */
    const out = new Map();
    if (categoryIds.length === 0) return out;
    const placeholders = categoryIds.map(() => '?').join(',');
    const [rows] = await this.pool.query(
      `SELECT c.id, c.NAME, ct.id AS ct_id, ct.AMOUNT AS ct_amount, ct.RATE AS ct_rate
       FROM CATEGORY c
       LEFT JOIN CATEGORY_TAXES ct ON ct.CATEGORY_ID = c.id
       WHERE c.id IN (${placeholders})`,
      categoryIds
    );
    for (const r of rows) {
      const id = toNumber(r.id);
      let cat = out.get(id);
      if (!cat) {
        cat = new Category({ id, name: r.NAME, categoryTaxes: [] });
        out.set(id, cat);
      }
      if (r.ct_id !== null) {
        cat.categoryTaxes.push(new CategoryTax({
          id: toNumber(r.ct_id),
          amount: toNumber(r.ct_amount),
          rate: toNumber(r.ct_rate)
        }));
      }
    }
    return out;
  }

  /**
   * Builds a `Category` entity from the denormalised rows produced by
   * the CATEGORY ⨝ CATEGORY_TAXES LEFT JOIN. All rows share the same
   * `c.id` / `c.NAME`; the only variation is `ct.*`.
   *
   * @param {Array<object>} rows
   * @returns {Category}
   * @private
   */
  _rowsToCategory(rows) {
    const first = rows[0];
    /** @type {CategoryTax[]} */
    const taxes = [];
    for (const r of rows) {
      if (r.ct_id !== null) {
        taxes.push(new CategoryTax({
          id: toNumber(r.ct_id),
          amount: toNumber(r.ct_amount),
          rate: toNumber(r.ct_rate)
        }));
      }
    }
    return new Category({
      id: toNumber(first.id),
      name: first.NAME,
      categoryTaxes: taxes
    });
  }

  /**
   * Combines an activity row with its (already-loaded) category into
   * an `Activity` entity.
   *
   * @param {{ id: *, NAME: string, ADDRESS: *, CATEGORY_ID: * }} row
   * @param {Category|null} category
   * @returns {Activity}
   * @private
   */
  _rowToActivity(row, category) {
    return new Activity({
      id: toNumber(row.id ?? row.a_id),
      name: row.NAME ?? row.a_name,
      address: toNumber(row.ADDRESS ?? row.a_address),
      category
    });
  }
}
