/**
 * @fileoverview Domain data transfer object for a category.
 *
 * A Category groups activities that share the same tax policy. The
 * `categoryTaxes` list is ordered (the order in which it was loaded
 * from the database), and the tax rate is computed by the service by
 * picking the bracket with the highest `amount` not exceeding the
 * activity's revenue.
 */

import { z } from 'zod';
import { CategoryTaxDTO } from './CategoryTaxDTO.js';

/**
 * Zod schema for the nested bracket object inside a request body.
 *
 * @type {import('zod').ZodType<{ amount: number, rate: number }>}
 */
export const categoryTaxRequestSchema = z.object({
  amount: z.number().finite(),
  rate: z.number().int()
});

/**
 * @class CategoryDTO
 * @classdesc Value object representing a category and its tax brackets.
 */
export class CategoryDTO {
  /**
   * @param {{
   *   id?: number|null,
   *   name?: string|null,
   *   categoryTaxes?: CategoryTaxDTO[]
   * }} [props]
   * @property {number|null}     id            Database primary key.
   * @property {string|null}     name          Unique category name.
   * @property {CategoryTaxDTO[]} categoryTaxes Ordered list of tax brackets.
   */
  constructor({ id = null, name = null, categoryTaxes = [] } = {}) {
    /** @type {number|null} */
    this.id = id;
    /** @type {string|null} */
    this.name = name;
    /** @type {CategoryTaxDTO[]} */
    this.categoryTaxes = categoryTaxes;
  }
}

/**
 * Zod schema used by `CategoryService` to validate a CategoryDTO before
 * persistence. Only `name` is required at the boundary — brackets are
 * validated by the nested schema when present.
 *
 * @type {import('zod').ZodType<{ name: string }>}
 */
export const categoryValidationSchema = z.object({
  name: z.string({ required_error: 'Name must be set' }).min(1, 'Name must be set')
});
