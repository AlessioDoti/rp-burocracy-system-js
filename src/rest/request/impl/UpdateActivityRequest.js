/***
 * @fileoverview Request body for `PATCH /activity/:id`.
 *
 * In addition to the mutable activity fields (`name`, `address`,
 * `category`), the PATCH accepts an `employees` array that fully
 * **replaces** the previous employee list for the activity.
 *
 * Unlike `InsertActivityRequest`, this class does **not** extend
 * `BaseActivityRequest`. The base sets `address = 0` as a default,
 * which would silently overwrite the activity's address on every
 * PATCH that omits the field. Sticking to `undefined` for missing
 * fields is what makes PATCH semantics (partial update) work.
 */

/***
 * @class UpdateActivityRequest
 * @classdesc Activity patch payload. Every field is optional:
 *
 * - `name` — replaces the activity name
 * - `address` — replaces the numeric address
 * - `category` — primary key of the new CATEGORY row (resolved by handler)
 * - `employees` — replaces the full employee list with the given array
 */
export class UpdateActivityRequest {
  /**
   * @param {{
   *   name?: string,
   *   address?: number,
   *   category?: number|null,
   *   employees?: Array<{ employeeUuid: string, role: string }>
   * }} [props]
   */
  constructor({ name, address, category, employees } = {}) {
    /** @type {string|undefined} */
    this.name = name;
    /** @type {number|undefined} */
    this.address = address;
    /** @type {number|null|undefined} */
    this.category = category;
    /** @type {Array<{ employeeUuid: string, role: string }>|undefined} */
    this.employees = employees;
  }
}
