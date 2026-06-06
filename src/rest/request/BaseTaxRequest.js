/**
 * @fileoverview Base class for tax request shapes.
 *
 * `earnings` and `expenses` are the only fields shared between insert
 * and update payloads. The update payload adds `elapsedDays` and
 * `payed`.
 */

/**
 * @class BaseTaxRequest
 * @classdesc Common ancestor for `InsertTaxRequest` and
 *   `UpdateTaxRequest`. Exists primarily so the factory can do a
 *   single `instanceof` check.
 *
 * No default values are set here. A subclass that wants defaults
 * declares them in its own destructuring (see `InsertTaxRequest`).
 * The PATCH-shaped `UpdateTaxRequest` deliberately lets absent fields
 * stay `undefined` so the service can distinguish "not provided"
 * from "literal 0".
 */
export class BaseTaxRequest {
  /**
   * @param {{ expenses?: number, earnings?: number }} [props]
   * @property {number|undefined} expenses Declared expenses. Undefined when not provided.
   * @property {number|undefined} earnings Declared earnings. Undefined when not provided.
   */
  constructor({ expenses, earnings } = {}) {
    this.expenses = expenses;
    this.earnings = earnings;
  }
}
