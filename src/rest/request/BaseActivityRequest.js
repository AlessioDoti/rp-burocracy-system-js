/**
 * @fileoverview Base class for activity request shapes.
 *
 * Carries the three fields every activity request has in common:
 * the `name`, the numeric `address`, and the reserved `managementIds`
 * list. Subclasses add their own request-specific fields (e.g.
 * `UpdateActivityRequest` adds `categoryId`).
 */

/**
 * @class BaseActivityRequest
 * @classdesc Common ancestor for `InsertActivityRequest` and
 *   `UpdateActivityRequest`. Exists primarily so the factory can do a
 *   single `instanceof` check.
 */
export class BaseActivityRequest {
  /**
   * @param {{
   *   name?: string,
   *   address?: number,
   *   managementIds?: number[]
   * }} [props]
   * @property {string}     name          Activity name.
   * @property {number}     address       Numeric address identifier
   *                                      (the schema treats it as an integer).
   * @property {number[]}   managementIds Reserved for future use. The Person system is still mocked.
   */
  constructor({ name = null, address = 0, managementIds = [] } = {}) {
    this.name = name;
    this.address = address;
    this.managementIds = managementIds;
  }
}
