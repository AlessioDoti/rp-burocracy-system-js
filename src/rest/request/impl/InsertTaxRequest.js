/***
 * @fileoverview Request body for `POST /tax/:activity`.
 *
 * Carries the financial data and the `employeeUuid` of the person
 * filing the declaration. The employee UUID is validated locally
 * against the ACTIVITIES_EMPLOYEES table.
 */

import { BaseTaxRequest } from '../BaseTaxRequest.js';

/**
 * @class InsertTaxRequest
 * @classdesc Tax insert payload.
 */
export class InsertTaxRequest extends BaseTaxRequest {
  /**
   * @param {{ expenses?: number, earnings?: number, employeeUuid?: string }} [props]
   * @property {number}  expenses      Declared expenses.
   * @property {number}  earnings      Declared earnings.
   * @property {string|null} employeeUuid  External UUID of the employee filing the declaration.
   */
  constructor({ expenses = 0, earnings = 0, employeeUuid = null } = {}) {
    super({ expenses, earnings });
    this.employeeUuid = employeeUuid;
  }
}
