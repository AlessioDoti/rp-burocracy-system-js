/***
 * @fileoverview Internal helpers shared by every repository.
 *
 * Kept private to the persistence layer; not exported beyond it.
 */

/***
 * Coerces a value to a `number` when it is safe to do so.
 *
 * `mysql2` returns `DECIMAL` columns as strings (because they can
 * exceed the JS number precision) and `FLOAT`/`INT` columns as
 * numbers. This helper makes the call sites readable without losing
 * fidelity on the rare large-DECIMAL case.
 *
 * @param {*} v
 * @returns {number|*} A `number` when the value is numeric, the
 *   original value otherwise.
 */
export function toNumber(v) {
  if (v === null || v === undefined) return v;
  if (typeof v === 'number') return v;
  const n = Number(v);
  return Number.isNaN(n) ? v : n;
}

/***
 * Coerces a value to a `Date` instance.
 *
 * @param {*} v
 * @returns {Date|*} A `Date` when the value is convertible, the
 *   original value otherwise.
 */
export function toDate(v) {
  if (v === null || v === undefined) return v;
  if (v instanceof Date) return v;
  return new Date(v);
}

/***
 * Coerces a MySQL `TINYINT(1)` / 0-1 column to a JS boolean.
 *
 * @param {*} v
 * @returns {boolean|*} A boolean when the value looks like a flag, the
 *   original value otherwise.
 */
export function toBoolean(v) {
  if (v === null || v === undefined) return v;
  if (typeof v === 'boolean') return v;
  if (typeof v === 'number') return v !== 0;
  if (v instanceof Buffer) return v[0] !== 0;
  return v === '1' || v === 'true';
}

/***
 * Builds an `ORDER BY` clause from a `Pageable.sort` object.
 *
 * Fields are whitelisted to avoid SQL injection: anything not in
 * `allowed` falls back to `id`. The direction is restricted to
 * `asc`/`desc` (case-insensitive, anything else is `DESC`).
 *
 * @param {{ field: string, direction: 'asc'|'desc' }|null|undefined} sort
 * @param {string} table  Table alias used in the clause (e.g. `'a'`).
 * @param {string[]} [allowed=[]] Whitelisted sort fields.
 * @param {string} [fallback] Default clause when no sort is supplied.
 * @returns {{ clause: string, params: any[] }}
 */
export function buildOrderBy(sort, table, allowed = [], fallback = `${table}.id DESC`) {
  if (!sort || !sort.field) {
    return { clause: fallback, params: [] };
  }
  const safeField = allowed.includes(sort.field) ? sort.field : 'id';
  const dir = sort.direction === 'asc' ? 'ASC' : 'DESC';
  return { clause: `ORDER BY ${table}.\`${safeField}\` ${dir}`, params: [] };
}
