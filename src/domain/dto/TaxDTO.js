/***
 * @fileoverview Domain data transfer object for a single tax declaration.
 *
 * A Tax is a periodic declaration filed by the manager of an activity.
 * The monetary fields (`expenses`, `earnings`) are the only inputs from
 * the client; everything else (`revenue`, `taxableIncome`, `taxAmount`,
 * `elapsedDays`, `elapsedBillAmount`, `declarationDate`) is computed by
 * the service from the activity's category brackets and the time
 * elapsed since the previous declaration for the same activity.
 *
 * `taxableIncome` is the base tax (`revenue × bracket rate / 100`,
 * where the rate comes from the category's brackets and is not
 * persisted on the row). `taxAmount` is the total liability
 * (`taxableIncome + late-filing penalty`).
 */

import { z } from 'zod';
import { ActivityDTO } from './ActivityDTO.js';

/**
 * @class TaxDTO
 * @classdesc Value object representing a tax declaration.
 */
export class TaxDTO {
  /**
 * @param {{
 *   activity?: ActivityDTO|null,
 *   manager?: string|null,
 *   expenses?: number,
 *   earnings?: number,
 *   revenue?: number,
 *   taxAmount?: number,
 *   elapsedDays?: number,
 *   elapsedBillAmount?: number,
 *   taxableIncome?: number,
 *   declarationDate?: Date|null,
 *   payed?: boolean,
 *   taxId?: number|null
 * }} [props]
 * @property {ActivityDTO|null} activity           Activity this declaration
 *                                                is filed for (resolved by
 *                                                the request handler before
 *                                                validation).
 * @property {string|null}      manager            UUID of the employee who
 *                                                filed the declaration.
 * @property {number}           expenses           Declared expenses for the
 *                                                period.
   * @property {number}           earnings           Declared earnings for the
   *                                                period.
   * @property {number}           revenue            `earnings − expenses`
   *                                                (set by the service).
   * @property {number}           taxableIncome      `revenue × rate / 100`,
   *                                                where `rate` is the highest
   *                                                CategoryTax bracket with
   *                                                `amount ≤ revenue`. The rate
   *                                                itself is **not** a field on
   *                                                the DTO — it is derived from
   *                                                `activity.category.categoryTaxes`
   *                                                (set by the service).
   * @property {number}           taxAmount          `taxableIncome + elapsedBillAmount`
   *                                                (total liability: tax owed
   *                                                plus late-filing penalty;
   *                                                set by the service).
   * @property {number}           elapsedDays        Days since the previous
   *                                                declaration for the same
   *                                                activity, minus the base
   *                                                constant (set by the service).
   * @property {number}           elapsedBillAmount  `elapsedDays × 15000`
   *                                                (set by the service).
   * @property {Date|null}        declarationDate    Timestamp at which the
   *                                                declaration was filed
   *                                                (set by the service).
   * @property {boolean}          payed              Whether the declaration has
   *                                                been settled.
   * @property {number|null}      taxId              Database primary key.
   *                                                Renamed from `id` to make
   *                                                the boundary explicit in
   *                                                every consumer.
   */
  constructor({
    activity = null,
    manager = null,
    expenses = 0,
    earnings = 0,
    revenue = 0,
    taxAmount = 0,
    elapsedDays = 0,
    elapsedBillAmount = 0,
    taxableIncome = 0,
    declarationDate = null,
    payed = false,
    taxId = null
  } = {}) {
    /** @type {ActivityDTO|null} */
    this.activity = activity;
    /** @type {string|null} */
    this.manager = manager;
    /** @type {number} */
    this.expenses = expenses;
    /** @type {number} */
    this.earnings = earnings;
    /** @type {number} */
    this.revenue = revenue;
    /** @type {number} */
    this.taxAmount = taxAmount;
    /** @type {number} */
    this.elapsedDays = elapsedDays;
    /** @type {number} */
    this.elapsedBillAmount = elapsedBillAmount;
    /** @type {number} */
    this.taxableIncome = taxableIncome;
    /** @type {Date|null} */
    this.declarationDate = declarationDate;
    /** @type {boolean} */
    this.payed = payed;
    /** @type {number|null} */
    this.taxId = taxId;
  }
}

/**
 * Zod schema used by `TaxService` to validate a TaxDTO before
 * persistence. `activity` and `manager` (UUID string) are required.
 *
 * @type {import('zod').ZodType<{
 *   activity: ActivityDTO,
 *   manager: string,
 *   expenses: number,
 *   earnings: number
 * }>}
 */
export const taxValidationSchema = z.object({
  activity: z
    .any({ required_error: 'Activity must be set' })
    .refine((v) => v !== null && v !== undefined, { message: 'Activity must be set' }),
  manager: z.string({ required_error: 'Manager must be set' }).min(1, 'Manager must be set'),
  expenses: z.number({ required_error: 'Expenses must be set', invalid_type_error: 'Expenses must be set' }),
  earnings: z.number({ required_error: 'Earnings must be set', invalid_type_error: 'Earnings must be set' })
});

/**
 * Zod schema for `PATCH /tax/:id`. Every field is optional and a
 * literal `0` is a valid value (e.g. "earnings this period: 0"). A
 * refine enforces "at least one field present" so the request is not
 * a silent no-op.
 *
 * @type {import('zod').ZodType<{
 *   earnings?: number,
 *   expenses?: number,
 *   payed?: boolean,
 *   elapsedDays?: number
 * }>}
 */
export const taxPatchSchema = z.object({
  earnings: z.number({ invalid_type_error: 'Earnings must be a number' }).optional(),
  expenses: z.number({ invalid_type_error: 'Expenses must be a number' }).optional(),
  payed: z.boolean({ invalid_type_error: 'Payed must be a boolean' }).optional(),
  elapsedDays: z.number({ invalid_type_error: 'ElapsedDays must be a number' }).optional()
}).refine(
  (obj) => obj.earnings !== undefined
    || obj.expenses !== undefined
    || obj.payed !== undefined
    || obj.elapsedDays !== undefined,
  { message: 'At least one of earnings, expenses, payed, elapsedDays must be provided' }
);
