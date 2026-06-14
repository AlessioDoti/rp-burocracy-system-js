/***
 * @fileoverview SQL repository for the `TAX` table.
 *
 * Every read eagerly loads the related `ACTIVITY` → `CATEGORY` →
 * `CATEGORY_TAXES` chain, so the domain never sees a half-hydrated
 * aggregate.
 *
 * ## Why no JOIN to `CATEGORY_TAXES` in the tax query
 *
 * A single `LEFT JOIN` of `TAX → ACTIVITY → CATEGORY → CATEGORY_TAXES`
 * would produce `N_taxes` rows per tax declaration, which causes two
 * bugs:
 *
 * 1. `LIMIT ?` in `findAll` / `findByActivityId` is applied **after**
 *    the JOIN, so the page contains fewer than `pageable.size`
 *    distinct taxes (or worse, the same tax repeated `N_taxes` times).
 * 2. `_rowToEntity` collapsing on a single row would only see the
 *    first bracket; calling code would think the activity has one
 *    tax, not the full set.
 *
 * The fix is to split the read: first a page of taxes (with the
 * `ACTIVITY_ID` foreign key), then a second query that fetches the
 * activities and their categories+brackets for the page. The mapper
 * then joins the two in JS. The `COUNT(*)` for the total is a third
 * query, run on the bare `TAX` table so the count is not multiplied
 * by the number of brackets.
 */

import { toNumber, toBoolean, toDate, buildOrderBy } from './_helpers.js';
import { Tax } from '../entity/Tax.js';
import { Activity } from '../entity/Activity.js';
import { Category } from '../entity/Category.js';
import { CategoryTax } from '../entity/CategoryTax.js';

/**
 * @class TaxRepository
 * @classdesc Data-access layer for `TAX`.
 */
export class TaxRepository {
  /**
   * @param {import('mysql2/promise').Pool} pool
   */
  constructor(pool) {
    /** @property {import('mysql2/promise').Pool} */
    this.pool = pool;
  }

  /**
   * Looks up one tax declaration by primary key, with the full
   * activity → category → brackets chain eager-loaded.
   *
   * @param {number|string} id
   * @returns {Promise<import('../entity/Tax.js').Tax|null>}
   */
  async findById(id) {
    const [taxRows] = await this.pool.query(this._taxSelectSql() + ' WHERE t.id = ?', [id]);
    if (taxRows.length === 0) return null;
    const activity = await this._loadActivity(taxRows[0].t_activity_id);
    return this._rowToEntity(taxRows[0], activity);
  }

  /**
   * Returns one page of every tax declaration and the total count.
   * See the file-level comment for why this is implemented as three
   * queries instead of a single JOIN.
   *
   * @param {{ page: number, size: number, sort: { field: string, direction: 'asc'|'desc' }|null, offset: number }} pageable
   * @returns {Promise<{ rows: import('../entity/Tax.js').Tax[], total: number }>}
   */
  async findAll(pageable) {
    const { clause } = buildOrderBy(pageable.sort, 't', ['id', 'declarationDate', 'payed'], 'ORDER BY t.id DESC');

    // (1) The page of taxes. No JOIN to CATEGORY_TAXES: would
    // multiply each tax row by the number of its activity's category

    const [taxRows] = await this.pool.query(
      this._taxSelectSql() + ` ${clause} LIMIT ? OFFSET ?`,
      [pageable.size, pageable.offset]
    );

    // (3) Total count, on the bare table so it is not multiplied by

    const [countRows] = await this.pool.query('SELECT COUNT(*) AS total FROM TAX');
    const total = toNumber(countRows[0].total);

    if (taxRows.length === 0) {
      return { rows: [], total };
    }

    const activityIds = [
      ...new Set(taxRows.map((r) => r.t_activity_id).filter((id) => id !== null))
    ];
    const activitiesById = await this._loadActivitiesByIds(activityIds);

    const entities = taxRows.map((r) => this._rowToEntity(
      r,
      r.t_activity_id !== null ? (activitiesById.get(r.t_activity_id) ?? null) : null
    ));
    return { rows: entities, total };
  }

  /***
   * Returns one page of tax declarations filed against the activity
   * with the given id and the total count.
   *
   * @param {number|string} activityId
   * @param {{ page: number, size: number, sort: { field: string, direction: 'asc'|'desc' }|null, offset: number }} pageable
   * @returns {Promise<{ rows: import('../entity/Tax.js').Tax[], total: number }>}
   */
  async findByActivityId(activityId, pageable) {
    const { clause } = buildOrderBy(pageable.sort, 't', ['id', 'declarationDate'], 'ORDER BY t.id DESC');

    const [taxRows] = await this.pool.query(
      this._taxSelectSql() + ' WHERE t.ACTIVITY_ID = ? ' + clause + ' LIMIT ? OFFSET ?',
      [activityId, pageable.size, pageable.offset]
    );

    const [countRows] = await this.pool.query(
      'SELECT COUNT(*) AS total FROM TAX WHERE ACTIVITY_ID = ?',
      [activityId]
    );
    const total = toNumber(countRows[0].total);

    if (taxRows.length === 0) {
      return { rows: [], total };
    }

    const activity = await this._loadActivity(activityId);
    const entities = taxRows.map((r) => this._rowToEntity(r, activity));
    return { rows: entities, total };
  }

  /***
   * Returns the most recent declaration date of any tax for the given
   * activity, or `null` when no tax has ever been filed for it. This
   * is a `TAX ⨝ ACTIVITY` 1:1 query — no CATEGORY_TAXES involved —
   * so it is left as a single query.
   *
   * @param {string} activityName
   * @returns {Promise<Date|null>}
   */
  async findTopByActivityNameOrderByDeclarationDateDesc(activityName) {
    const [rows] = await this.pool.query(
      `SELECT t.DECLARATION_DATE
       FROM TAX t
       JOIN ACTIVITY a ON t.ACTIVITY_ID = a.id
       WHERE a.NAME = ?
       ORDER BY t.DECLARATION_DATE DESC
       LIMIT 1`,
      [activityName]
    );
    if (rows.length === 0) return null;
    return toDate(rows[0].DECLARATION_DATE);
  }

  /***
   * Inserts a new row or updates an existing one, then reloads it
   * before returning.
   *
   * @param {import('../entity/Tax.js').Tax} tax
   * @returns {Promise<import('../entity/Tax.js').Tax>}
   */
  async save(tax) {
    if (tax.id) {
      await this.pool.query(
        `UPDATE TAX SET
           ACTIVITY_ID = ?,
           PERSON_UUID = ?,
           EXPENSES = ?,
           EARNINGS = ?,
           REVENUE = ?,
           TAX_AMOUNT = ?,
           ELAPSED_DAYS = ?,
           ELAPSED_BILL_AMOUNT = ?,
           TAXABLE_INCOME = ?,
           DECLARATION_DATE = ?,
           PAYED = ?
         WHERE id = ?`,
        [
          tax.activity?.id ?? null,
          tax.personUuid,
          tax.expenses,
          tax.earnings,
          tax.revenue,
          tax.taxAmount,
          tax.elapsedDays,
          tax.elapsedBillAmount,
          tax.taxableIncome,
          tax.declarationDate,
          tax.payed ? 1 : 0,
          tax.id
        ]
      );
      return this.findById(tax.id);
    }

    const [result] = await this.pool.query(
      `INSERT INTO TAX (
         ACTIVITY_ID, PERSON_UUID,
         EXPENSES, EARNINGS, REVENUE, TAX_AMOUNT,
         ELAPSED_DAYS, ELAPSED_BILL_AMOUNT, TAXABLE_INCOME,
         DECLARATION_DATE, PAYED
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        tax.activity?.id ?? null,
        tax.personUuid,
        tax.expenses,
        tax.earnings,
        tax.revenue,
        tax.taxAmount,
        tax.elapsedDays,
        tax.elapsedBillAmount,
        tax.taxableIncome,
        tax.declarationDate,
        tax.payed ? 1 : 0
      ]
    );
    return this.findById(result.insertId);
  }

  /***
   * @param {number|string} id
   * @returns {Promise<void>}
   */
  async deleteById(id) {
    await this.pool.query('DELETE FROM TAX WHERE id = ?', [id]);
  }

  /***
   * Deletes every tax declaration filed against the given activity.
   * The caller is responsible for keeping this call and any activity
   * delete in a single transaction when atomicity is required.
   *
   * @param {number|string} activityId
   * @returns {Promise<void>}
   */
  async deleteByActivityId(activityId) {
    await this.pool.query('DELETE FROM TAX WHERE ACTIVITY_ID = ?', [activityId]);
  }

  /***
   * SQL fragment for the TAX rows in a page — no JOINs, every TAX
   * column aliased with a `t_` prefix.
   *
   * @returns {string}
   * @private
   */
  _taxSelectSql() {
    return `SELECT t.id                  AS t_id,
                   t.ACTIVITY_ID          AS t_activity_id,
                   t.PERSON_UUID          AS t_person_uuid,
                   t.EXPENSES             AS t_expenses,
                   t.EARNINGS             AS t_earnings,
                   t.REVENUE              AS t_revenue,
                   t.TAX_AMOUNT           AS t_tax_amount,
                   t.ELAPSED_DAYS         AS t_elapsed_days,
                   t.ELAPSED_BILL_AMOUNT  AS t_elapsed_bill_amount,
                   t.TAXABLE_INCOME       AS t_taxable_income,
                   t.DECLARATION_DATE     AS t_declaration_date,
                   t.PAYED                AS t_payed
            FROM TAX t`;
  }

  /***
   * Loads one activity (with its category and the full bracket set) by id.
   * Returns `null` when `activityId` is `null`/`undefined` or no such row
   * exists.
   *
   * @param {number|null} activityId
   * @returns {Promise<Activity|null>}
   * @private
   */
  async _loadActivity(activityId) {
    if (activityId === null || activityId === undefined) return null;
    const [actRows] = await this.pool.query(
      `SELECT a.id AS a_id, a.NAME AS a_name, a.ADDRESS AS a_address, a.CATEGORY_ID AS a_category_id
       FROM ACTIVITY a WHERE a.id = ?`,
      [activityId]
    );
    if (actRows.length === 0) return null;
    const ar = actRows[0];
    const category = await this._loadCategory(ar.a_category_id);
    return new Activity({
      id: toNumber(ar.a_id),
      name: ar.a_name,
      address: toNumber(ar.a_address),
      category
    });
  }

  /***
   * Loads many activities (each with its category and the full
   * bracket set) in two queries: one for the activities, one for
   * the categories+brackets. The result is keyed by activity id;
   * missing ids are absent from the map.
   *
   * @param {number[]} activityIds
   * @returns {Promise<Map<number, Activity>>}
   * @private
   */
  async _loadActivitiesByIds(activityIds) {
    /** @type {Map<number, Activity>} */
    const out = new Map();
    if (activityIds.length === 0) return out;
    const placeholders = activityIds.map(() => '?').join(',');
    const [actRows] = await this.pool.query(
      `SELECT a.id AS a_id, a.NAME AS a_name, a.ADDRESS AS a_address, a.CATEGORY_ID AS a_category_id
       FROM ACTIVITY a WHERE a.id IN (${placeholders})`,
      activityIds
    );
    const categoryIds = [
      ...new Set(actRows.map((r) => r.a_category_id).filter((id) => id !== null))
    ];
    const categoriesById = await this._loadCategoriesByIds(categoryIds);

    for (const ar of actRows) {
      const id = toNumber(ar.a_id);
      const category = ar.a_category_id !== null
        ? (categoriesById.get(ar.a_category_id) ?? null)
        : null;
      out.set(id, new Activity({
        id,
        name: ar.a_name,
        address: toNumber(ar.a_address),
        category
      }));
    }
    return out;
  }

  /***
   * Loads one category (with its full bracket set) by id. Returns
   * `null` when `categoryId` is `null`/`undefined` or no such row exists.
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

  /***
   * Loads many categories (each with its full bracket set) in one
   * round-trip. The result is keyed by category id; missing ids
   * are simply absent from the map.
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

  /***
   * Builds a `Category` entity from the denormalised rows produced
   * by the CATEGORY ⨝ CATEGORY_TAXES LEFT JOIN. All rows share the
   * same `c.id` / `c.NAME`; the only variation is `ct.*`.
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

  /***
   * Combines a TAX row with its (already-loaded) activity into a
   * `Tax` entity. The activity carries the full category+brackets
   * chain, so this mapper no longer reads `c_*` or `ct_*` columns.
   *
   * @param {object} r Row produced by `_taxSelectSql`.
   * @param {Activity|null} activity
   * @returns {Tax}
   * @private
   */
  _rowToEntity(r, activity) {
    return new Tax({
      id: toNumber(r.t_id),
      activity,
      personUuid: r.t_person_uuid,
      expenses: toNumber(r.t_expenses),
      earnings: toNumber(r.t_earnings),
      revenue: toNumber(r.t_revenue),
      taxAmount: toNumber(r.t_tax_amount),
      elapsedDays: toNumber(r.t_elapsed_days),
      elapsedBillAmount: toNumber(r.t_elapsed_bill_amount),
      taxableIncome: toNumber(r.t_taxable_income),
      declarationDate: toDate(r.t_declaration_date),
      payed: toBoolean(r.t_payed)
    });
  }
}
