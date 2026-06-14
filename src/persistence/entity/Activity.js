/***
 * @fileoverview Activity persistence entity.
 */

import { Category } from './Category.js';
import { ActivityEmployee } from './ActivityEmployee.js';

/**
 * @class Activity
 * @classdesc Persistence-layer representation of an `ACTIVITY` row
 * plus its category and employee list.
 */
export class Activity {
  /**
   * @param {{
   *   id?: number|null,
   *   name?: string|null,
   *   address?: number,
   *   category?: Category|null,
   *   employees?: ActivityEmployee[]
   * }} [props]
   */
  constructor({ id = null, name = null, address = 0, category = null, employees = [] } = {}) {
    this.id = id;
    this.name = name;
    this.address = address;
    this.category = category;
    /** @type {ActivityEmployee[]} */
    this.employees = employees;
  }
}
