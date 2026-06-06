/**
 * @fileoverview Request body for `PATCH /tax/:id`.
 *
 * All fields are optional. A field is "patched" only when the client
 * actually includes it in the body — the `taxPatchSchema` (Zod)
 * enforces "at least one field" and per-field type checks. The
 * service merges the patch into the persisted row using
 * `!== undefined` (NOT `!== 0`): a literal `0` is a valid value and
 * must not be silently dropped.
 */

import { BaseTaxRequest } from '../BaseTaxRequest.js';

/**
 * @class UpdateTaxRequest
 * @classdesc Tax PATCH payload.
 */
export class UpdateTaxRequest extends BaseTaxRequest {
  /**
   * @param {{ expenses?: number, earnings?: number, payed?: boolean, elapsedDays?: number }} [props]
   * @property {number|undefined}  expenses     Declared expenses. Omit to keep the persisted value.
   * @property {number|undefined}  earnings     Declared earnings. Omit to keep the persisted value.
   * @property {boolean|undefined} payed        Whether the declaration has been settled. Omit to keep the persisted value.
   * @property {number|undefined}  elapsedDays  Days elapsed since the previous declaration. Omit to keep the persisted value.
   */
  constructor({ expenses, earnings, payed, elapsedDays } = {}) {
    super({ expenses, earnings });
    this.payed = payed;
    this.elapsedDays = elapsedDays;
  }
}
