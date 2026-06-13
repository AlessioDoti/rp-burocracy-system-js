/**
 * @fileoverview Tax declaration persistence entity.
 *
 * Row shape for the `TAX` table. The `personUuid` field stores the
 * external UUID of the person who filed the declaration — a stable
 * reference across microservices.
 */

import { Activity } from './Activity.js';

/**
 * @class Tax
 * @classdesc Persistence-layer representation of a `TAX` row plus its
 * owning activity.
 */
export class Tax {
  /**
   * @param {{
   *   id?: number|null,
   *   activity?: Activity|null,
   *   personUuid?: string|null,
   *   expenses?: number,
   *   earnings?: number,
   *   revenue?: number,
   *   taxAmount?: number,
   *   elapsedDays?: number,
   *   elapsedBillAmount?: number,
   *   taxableIncome?: number,
   *   declarationDate?: Date|null,
   *   payed?: boolean
   * }} [props]
   * @property {number|null} id                Surrogate primary key. `null` for not-yet-inserted rows.
   * @property {Activity|null} activity         Owning activity, or `null` when not yet loaded.
   * @property {string|null} personUuid         External UUID of the person who filed the declaration.
   * @property {number}      expenses           Declared expenses for the period.
   * @property {number}      earnings           Declared earnings for the period.
   * @property {number}      revenue            `earnings − expenses`.
   * @property {number}      taxableIncome      `revenue × rate / 100`.
   * @property {number}      taxAmount          `taxableIncome + elapsedBillAmount`.
   * @property {number}      elapsedDays        Days elapsed since the previous declaration, minus the 7-day grace period.
   * @property {number}      elapsedBillAmount  `elapsedDays × 15 000`.
   * @property {Date|null}   declarationDate    Timestamp the declaration was filed.
   * @property {boolean}     payed              Whether the declaration has been settled.
   */
  constructor({
    id = null,
    activity = null,
    personUuid = null,
    expenses = 0,
    earnings = 0,
    revenue = 0,
    taxAmount = 0,
    elapsedDays = 0,
    elapsedBillAmount = 0,
    taxableIncome = 0,
    declarationDate = null,
    payed = false
  } = {}) {
    this.id = id;
    this.activity = activity;
    this.personUuid = personUuid;
    this.expenses = expenses;
    this.earnings = earnings;
    this.revenue = revenue;
    this.taxAmount = taxAmount;
    this.elapsedDays = elapsedDays;
    this.elapsedBillAmount = elapsedBillAmount;
    this.taxableIncome = taxableIncome;
    this.declarationDate = declarationDate;
    this.payed = payed;
  }
}
