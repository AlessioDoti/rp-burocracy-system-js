/**
 * @fileoverview Activity-Employee relationship persistence entity.
 */

/**
 * @class ActivityEmployee
 * @classdesc Persistence-layer representation of an ACTIVITIES_EMPLOYEES row.
 */
export class ActivityEmployee {
  /**
   * @param {{
   *   id?: number|null,
   *   activityId?: number|null,
   *   employeeUuid?: string|null,
   *   role?: string|null
   * }} [props]
   */
  constructor({ id = null, activityId = null, employeeUuid = null, role = null } = {}) {
    /** @type {number|null} */
    this.id = id;
    /** @type {number|null} */
    this.activityId = activityId;
    /** @type {string|null} */
    this.employeeUuid = employeeUuid;
    /** @type {string|null} */
    this.role = role;
  }
}
