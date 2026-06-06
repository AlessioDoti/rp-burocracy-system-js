/**
 * @fileoverview Activity persistence entity.
 *
 * This is the row shape produced and consumed by repositories. Mappers
 * in `persistence/mapper/` translate between this entity and the
 * domain `ActivityDTO`. The two are intentionally separate: the entity
 * mirrors the database (foreign keys, row ids) and the DTO mirrors
 * what the domain needs (denormalised nested objects).
 */

import { Category } from './Category.js';

/**
 * @class Activity
 * @classdesc Persistence-layer representation of an `ACTIVITIES` row
 * plus its category (one-to-one).
 */
export class Activity {
  /**
   * @param {{
   *   id?: number|null,
   *   name?: string|null,
   *   address?: number,
   *   category?: Category|null
   * }} [props]
   * @property {number|null} id         Surrogate primary key. `null` for not-yet-inserted rows.
   * @property {string|null} name       Human-readable activity name.
   * @property {number}      address    Street address (kept as a numeric field, as per the original schema).
   * @property {Category|null} category Owning category, or `null` when the join is not yet loaded.
   */
  constructor({ id = null, name = null, address = 0, category = null } = {}) {
    this.id = id;
    this.name = name;
    this.address = address;
    this.category = category;
  }
}
