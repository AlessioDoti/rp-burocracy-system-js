/***
 * @fileoverview SQL repository for the `ACTIVITY` table.
 *
 * Every read eagerly loads the related `CATEGORY`, its
 * `CATEGORY_TAXES` rows, and the `ACTIVITIES_EMPLOYEES` rows, so the
 * domain never sees a half-hydrated aggregate.
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
 *
 * Employees are loaded in yet another batch query (one per page, not
 * one per row).
 */

import { toNumber, buildOrderBy } from './_helpers.js';
import { Activity } from '../entity/Activity.js';
import { ActivityEmployee } from '../entity/ActivityEmployee.js';
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
   * category, its brackets, and its employees.
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
    const employees = await this._loadEmployeesByActivityId(activityRows[0].id);
    return this._rowToActivity(activityRows[0], category, employees);
  }

  /**
   * Returns every activity an employee (by UUID) is linked to.
   * Each activity is fully hydrated with its category, brackets,
   * and the full employee list.
   *
   * @param {string} employeeUuid
   * @returns {Promise<import('../entity/Activity.js').Activity[]>}
   */
  async findByEmployeeUuid(employeeUuid) {
    const [activityRows] = await this.pool.query(
      `SELECT a.id AS a_id, a.NAME AS a_name, a.ADDRESS AS a_address, a.CATEGORY_ID AS a_category_id
       FROM ACTIVITY a
       JOIN ACTIVITIES_EMPLOYEES ae ON ae.ACTIVITY_ID = a.id
       WHERE ae.EMPLOYEE_UID = ?
       ORDER BY a.id`,
      [employeeUuid]
    );

    if (activityRows.length === 0) return [];

    // Load categories
    const categoryIds = [
      ...new Set(activityRows.map((r) => r.a_category_id).filter((id) => id !== null))
    ];
    const categoriesById = await this._loadCategoriesByIds(categoryIds);

    // Load employees for all activities
    const activityIds = activityRows.map((r) => toNumber(r.a_id));
    const employeesByActivityId = await this._loadEmployeesByActivityIds(activityIds);

    return activityRows.map((r) => {
      const id = toNumber(r.a_id);
      const category = r.a_category_id !== null
        ? categoriesById.get(r.a_category_id) ?? null
        : null;
      const employees = employeesByActivityId.get(id) ?? [];
      return this._rowToActivity(r, category, employees);
    });
  }

  /**
   * Looks up one activity by unique name.
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
    const employees = await this._loadEmployeesByActivityId(activityRows[0].id);
    return this._rowToActivity(activityRows[0], category, employees);
  }

  /**
   * Returns one page of activities and the total row count.
   *
   * @param {{ page: number, size: number, sort: { field: string, direction: 'asc'|'desc' }|null, offset: number }} pageable
   * @returns {Promise<{ rows: import('../entity/Activity.js').Activity[], total: number }>}
   */
  async findAll(pageable) {
    const { clause } = buildOrderBy(pageable.sort, 'a', ['id', 'name', 'address'], 'ORDER BY a.id DESC');

    const [activityRows] = await this.pool.query(
      `SELECT a.id AS a_id, a.NAME AS a_name, a.ADDRESS AS a_address, a.CATEGORY_ID AS a_category_id
       FROM ACTIVITY a
       ${clause}
       LIMIT ? OFFSET ?`,
      [pageable.size, pageable.offset]
    );

    const [countRows] = await this.pool.query('SELECT COUNT(*) AS total FROM ACTIVITY');
    const total = toNumber(countRows[0].total);

    if (activityRows.length === 0) {
      return { rows: [], total };
    }

    // Load categories
    const categoryIds = [
      ...new Set(activityRows.map((r) => r.a_category_id).filter((id) => id !== null))
    ];
    const categoriesById = await this._loadCategoriesByIds(categoryIds);

    // Load employees for all activities in this page
    const activityIds = activityRows.map((r) => toNumber(r.a_id));
    const employeesByActivityId = await this._loadEmployeesByActivityIds(activityIds);

    const entities = activityRows.map((r) => {
      const id = toNumber(r.a_id);
      const category = r.a_category_id !== null
        ? categoriesById.get(r.a_category_id) ?? null
        : null;
      const employees = employeesByActivityId.get(id) ?? [];
      return this._rowToActivity(r, category, employees);
    });
    return { rows: entities, total };
  }

  /**
   * Inserts a new row when `activity.id` is `null`/`undefined`,
   * otherwise updates the existing one. Also persists the employee
   * list on insert.
   *
   * @param {import('../entity/Activity.js').Activity} activity
   * @returns {Promise<import('../entity/Activity.js').Activity>}
   */
  async save(activity) {
    const conn = await this.pool.getConnection();
    try {
      await conn.beginTransaction();

      if (activity.id) {
        await conn.query(
          'UPDATE ACTIVITY SET NAME = ?, ADDRESS = ?, CATEGORY_ID = ? WHERE id = ?',
          [activity.name, activity.address, activity.category?.id ?? null, activity.id]
        );
        await conn.commit();
        return this.findById(activity.id);
      }

      const [result] = await conn.query(
        'INSERT INTO ACTIVITY (NAME, ADDRESS, CATEGORY_ID) VALUES (?, ?, ?)',
        [activity.name, activity.address, activity.category?.id ?? null]
      );
      const insertId = result.insertId;

      // Persist employees
      if (activity.employees && activity.employees.length > 0) {
        await this._insertEmployees(conn, insertId, activity.employees);
      }

      await conn.commit();
      return this.findById(insertId);
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }
  }

  // ---------------------------------------------------------------------------
  // Employee-specific operations
  // ---------------------------------------------------------------------------

  /**
   * Adds employees to an activity. Ignores duplicates (activity + uuid).
   *
   * @param {number} activityId
   * @param {Array<{ employeeUuid: string, role: string }>} employees
   * @returns {Promise<void>}
   */
  async addEmployees(activityId, employees) {
    if (!employees || employees.length === 0) return;
    const conn = await this.pool.getConnection();
    try {
      await conn.beginTransaction();
      await this._insertEmployees(conn, activityId, employees);
      await conn.commit();
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }
  }

  /**
   * Removes employees from an activity by UUID.
   *
   * @param {number} activityId
   * @param {string[]} employeeUuids
   * @returns {Promise<void>}
   */
  async removeEmployees(activityId, employeeUuids) {
    if (!employeeUuids || employeeUuids.length === 0) return;
    const placeholders = employeeUuids.map(() => '?').join(',');
    await this.pool.query(
      `DELETE FROM ACTIVITIES_EMPLOYEES WHERE ACTIVITY_ID = ? AND EMPLOYEE_UID IN (${placeholders})`,
      [activityId, ...employeeUuids]
    );
  }

  /**
   * Replaces the entire employee list for an activity. Deletes all
   * existing rows and inserts the new set in a single transaction.
   *
   * @param {number} activityId
   * @param {Array<{ employeeUuid: string, role: string }>} employees
   * @returns {Promise<void>}
   */
  async replaceEmployees(activityId, employees) {
    const conn = await this.pool.getConnection();
    try {
      await conn.beginTransaction();
      await conn.query('DELETE FROM ACTIVITIES_EMPLOYEES WHERE ACTIVITY_ID = ?', [activityId]);
      if (employees && employees.length > 0) {
        await this._insertEmployees(conn, activityId, employees);
      }
      await conn.commit();
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }
  }

  /**
   * Checks whether a given employee UUID is currently assigned to an
   * activity.
   *
   * @param {number} activityId
   * @param {string} employeeUuid
   * @returns {Promise<boolean>}
   */
  async hasEmployee(activityId, employeeUuid) {
    const [rows] = await this.pool.query(
      'SELECT 1 FROM ACTIVITIES_EMPLOYEES WHERE ACTIVITY_ID = ? AND EMPLOYEE_UID = ? LIMIT 1',
      [activityId, employeeUuid]
    );
    return rows.length > 0;
  }

  /**
   * @param {number|string} id
   * @returns {Promise<void>}
   */
  async deleteById(id) {
    await this.pool.query('DELETE FROM ACTIVITY WHERE id = ?', [id]);
  }

  /**
   * Cascading delete that removes employees, taxes, and the activity
   * itself in a single transaction.
   *
   * @param {number|string} id
   * @returns {Promise<void>}
   */
  async deleteCascadingById(id) {
    const conn = await this.pool.getConnection();
    try {
      await conn.beginTransaction();
      try {
        await conn.query('DELETE FROM ACTIVITIES_EMPLOYEES WHERE ACTIVITY_ID = ?', [id]);
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

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  /**
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
   * @param {{ id: *, NAME: string, ADDRESS: *, CATEGORY_ID: * }} row
   * @param {Category|null} category
   * @param {ActivityEmployee[]} employees
   * @returns {Activity}
   * @private
   */
  _rowToActivity(row, category, employees = []) {
    return new Activity({
      id: toNumber(row.id ?? row.a_id),
      name: row.NAME ?? row.a_name,
      address: toNumber(row.ADDRESS ?? row.a_address),
      category,
      employees
    });
  }

  /**
   * Loads employees for a single activity.
   *
   * @param {number} activityId
   * @returns {Promise<ActivityEmployee[]>}
   * @private
   */
  async _loadEmployeesByActivityId(activityId) {
    const [rows] = await this.pool.query(
      'SELECT id, ACTIVITY_ID, EMPLOYEE_UID, ROLE FROM ACTIVITIES_EMPLOYEES WHERE ACTIVITY_ID = ?',
      [activityId]
    );
    return rows.map((r) => new ActivityEmployee({
      id: toNumber(r.id),
      activityId: toNumber(r.ACTIVITY_ID),
      employeeUuid: r.EMPLOYEE_UID,
      role: r.ROLE
    }));
  }

  /**
   * Loads employees for multiple activities in one query. Returns a
   * map keyed by activity id.
   *
   * @param {number[]} activityIds
   * @returns {Promise<Map<number, ActivityEmployee[]>>}
   * @private
   */
  async _loadEmployeesByActivityIds(activityIds) {
    /** @type {Map<number, ActivityEmployee[]>} */
    const out = new Map();
    if (activityIds.length === 0) return out;
    const placeholders = activityIds.map(() => '?').join(',');
    const [rows] = await this.pool.query(
      `SELECT id, ACTIVITY_ID, EMPLOYEE_UID, ROLE FROM ACTIVITIES_EMPLOYEES
       WHERE ACTIVITY_ID IN (${placeholders})
       ORDER BY id`,
      activityIds
    );
    for (const r of rows) {
      const aid = toNumber(r.ACTIVITY_ID);
      if (!out.has(aid)) out.set(aid, []);
      out.get(aid).push(new ActivityEmployee({
        id: toNumber(r.id),
        activityId: aid,
        employeeUuid: r.EMPLOYEE_UID,
        role: r.ROLE
      }));
    }
    return out;
  }

  /**
   * Inserts employee rows (batch INSERT IGNORE to skip duplicates).
   *
   * @param {import('mysql2/promise').Connection} conn
   * @param {number} activityId
   * @param {Array<{ employeeUuid: string, role: string }>} employees
   * @private
   */
  async _insertEmployees(conn, activityId, employees) {
    const values = employees.map(() => '(?, ?, ?)').join(',');
    const params = [];
    for (const e of employees) {
      params.push(activityId, e.employeeUuid, e.role);
    }
    await conn.query(
      `INSERT IGNORE INTO ACTIVITIES_EMPLOYEES (ACTIVITY_ID, EMPLOYEE_UID, ROLE) VALUES ${values}`,
      params
    );
  }
}
