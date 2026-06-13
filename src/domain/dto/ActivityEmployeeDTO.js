/**
 * @fileoverview Domain DTO for an employee attached to an activity.
 */

/**
 * @class ActivityEmployeeDTO
 * @classdesc Value object representing an employee of an activity.
 */
export class ActivityEmployeeDTO {
  /**
   * @param {{
   *   employeeUuid?: string|null,
   *   role?: string|null
   * }} [props]
   */
  constructor({ employeeUuid = null, role = null } = {}) {
    /** @type {string|null} */
    this.employeeUuid = employeeUuid;
    /** @type {string|null} */
    this.role = role;
  }
}
