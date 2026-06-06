/**
 * @fileoverview Request body for the category endpoints.
 */

/**
 * @class CategoryRequest
 * @classdesc Used for both insert and update; the controller dispatches
 *   to the same factory and service path.
 */
export class CategoryRequest {
  /**
   * @param {{ name?: string, categoryTaxes?: import('./CategoryTaxRequest.js').CategoryTaxRequest[] }} [props]
   * @property {string} name               Category name.
   * @property {import('./CategoryTaxRequest.js').CategoryTaxRequest[]} categoryTaxes Bracket definitions; empty for a "no-bracket" category.
   */
  constructor({ name = null, categoryTaxes = [] } = {}) {
    this.name = name;
    this.categoryTaxes = categoryTaxes;
  }
}
