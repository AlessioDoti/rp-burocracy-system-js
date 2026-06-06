/**
 * @fileoverview Request body for `POST /taxes`.
 *
 * Carries the financial data; the request handler resolves the
 * activity by id and the manager by name + surname.
 */

import { BaseTaxRequest } from '../BaseTaxRequest.js';

/**
 * @class InsertTaxRequest
 * @classdesc Tax insert payload.
 */
export class InsertTaxRequest extends BaseTaxRequest {
  /**
   * @param {{ expenses?: number, earnings?: number, managerName?: string, managerSurname?: string }} [props]
   * @property {number} expenses       Declared expenses.
   * @property {number} earnings       Declared earnings.
   * @property {string} managerName    Manager's first name.
   * @property {string} managerSurname Manager's family name.
   */
  constructor({ expenses = 0, earnings = 0, managerName = null, managerSurname = null } = {}) {
    super({ expenses, earnings });
    this.managerName = managerName;
    this.managerSurname = managerSurname;
  }
}
