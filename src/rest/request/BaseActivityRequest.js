/**
 * @fileoverview Base class for activity request shapes.
 *
 * Carries the common fields: `name`, `address`, and the `employees`
 * list. Subclasses add their own request-specific fields.
 */

/**
 * @class BaseActivityRequest
 * @classdesc Common ancestor for `InsertActivityRequest` and
 *   `UpdateActivityRequest`.
 */
export class BaseActivityRequest {
  /**
   * @param {{
   *   name?: string|null,
   *   address?: number,
   *   employees?: Array<{ employeeUuid: string, role: string }>
   * }} [props]
   * @property {string|null}     name       Activity name.
   * @property {number}          address    Numeric address identifier.
   * @property {Array<{ employeeUuid: string, role: string }>} employees
   */
  constructor({ name = null, address = 0, employees = [] } = {}) {
    this.name = name;
    this.address = address;
    this.employees = employees;
  }
}
