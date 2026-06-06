/**
 * @fileoverview Request body for a single tax bracket inside a
 * `CategoryRequest`.
 */

/**
 * @class CategoryTaxRequest
 * @classdesc One bracket: "if revenue ≥ `amount`, apply rate `rate`".
 */
export class CategoryTaxRequest {
  /**
   * @param {{ amount?: number, rate?: number }} [props]
   * @property {number} amount Lower bound of the bracket.
   * @property {number} rate   Percentage in `[0, 100]`.
   */
  constructor({ amount = 0, rate = 0 } = {}) {
    this.amount = amount;
    this.rate = rate;
  }
}
