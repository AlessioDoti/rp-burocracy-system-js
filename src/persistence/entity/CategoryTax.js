/***
 * @fileoverview CategoryTax persistence entity.
 *
 * Row shape for the `CATEGORY_TAXES` table. Each bracket says: "if
 * revenue ≥ `amount`, apply rate `rate` (as a percentage)".
 */

import { Category } from './Category.js';

/**
 * @class CategoryTax
 * @classdesc Persistence-layer representation of a `CATEGORY_TAXES`
 * row.
 */
export class CategoryTax {
  /**
   * @param {{
   *   id?: number|null,
   *   amount?: number,
   *   rate?: number,
   *   category?: Category|null
   * }} [props]
   * @property {number|null} id      Surrogate primary key. `null` for not-yet-inserted rows.
   * @property {number}      amount  Lower bound of the bracket, in the same currency as the revenue.
   * @property {number}      rate    Tax rate applied when revenue ≥ amount, expressed as a percentage in `[0, 100]`.
   * @property {Category|null} category Back-reference to the owning category; usually `null` unless explicitly hydrated.
   */
  constructor({ id = null, amount = 0, rate = 0, category = null } = {}) {
    this.id = id;
    this.amount = amount;
    this.rate = rate;
    this.category = category;
  }
}
