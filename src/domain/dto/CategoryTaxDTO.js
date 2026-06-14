/***
 * @fileoverview Domain data transfer object for a single tax bracket.
 *
 * A CategoryTax is the building block of a category's progressive tax
 * policy: every bracket declares a minimum revenue (`amount`) and the
 * percentage (`rate`) that applies to revenue ≥ `amount`. The bracket
 * with the highest `amount` not exceeding the activity's revenue wins.
 */

import { z } from 'zod';

/**
 * Zod schema for validating a CategoryTaxDTO before persistence.
 * Mirrors the constraints that any other layer would impose
 * (non-null amount, integer rate, optional id).
 *
 * @type {import('zod').ZodType<{
 *   id?: number|null,
 *   amount: number,
 *   rate: number
 * }>}
 */
export const categoryTaxSchema = z.object({
  id: z.number().int().positive().optional().nullable(),
  amount: z.number().finite(),
  rate: z.number().int()
});

/**
 * @class CategoryTaxDTO
 * @classdesc Value object representing a single tax bracket.
 */
export class CategoryTaxDTO {
  /**
   * @param {{
   *   id?: number|null,
   *   amount?: number,
   *   rate?: number
   * }} [props]
   * @property {number|null} id      Database primary key (null until persisted).
   * @property {number}      amount  Lower bound of the bracket (inclusive).
   *                                 Brackets with `amount === 0` are interpreted
   *                                 as the "default" fallback when no other
   *                                 bracket matches.
   * @property {number}      rate    Tax rate as a percentage (e.g. `20` for 20%).
   */
  constructor({ id = null, amount = 0, rate = 0 } = {}) {
    /** @type {number|null} */
    this.id = id;
    /** @type {number} */
    this.amount = amount;
    /** @type {number} */
    this.rate = rate;
  }
}
