/***
 * @fileoverview Category persistence entity.
 *
 * Row shape for the `CATEGORY` table plus its one-to-many collection
 * of `CategoryTax` rows.
 */

import { CategoryTax } from './CategoryTax.js';

/**
 * @class Category
 * @classdesc Persistence-layer representation of a `CATEGORY` row plus
 * its bracket set.
 */
export class Category {
  /**
   * @param {{
   *   id?: number|null,
   *   name?: string|null,
   *   categoryTaxes?: CategoryTax[]
   * }} [props]
   * @property {number|null} id   Surrogate primary key. `null` for not-yet-inserted rows.
   * @property {string|null} name Human-readable category name.
   * @property {CategoryTax[]} categoryTaxes Ordered list of brackets (highest `amount` first
   *                                         is the convention used by the mapper).
   */
  constructor({ id = null, name = null, categoryTaxes = [] } = {}) {
    this.id = id;
    this.name = name;
    this.categoryTaxes = categoryTaxes;
  }
}
