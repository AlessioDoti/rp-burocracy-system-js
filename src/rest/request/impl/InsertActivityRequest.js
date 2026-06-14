/***
 * @fileoverview Request body for `POST /activities/:categoryId`.
 *
 * The `category` is resolved by the request handler from the
 * `:categoryId` URL parameter. `employees` is an optional list of
 * employee UUIDS and roles to attach on creation.
 */

import { BaseActivityRequest } from '../BaseActivityRequest.js';

/**
 * @class InsertActivityRequest
 * @classdesc Activity insert payload.
 */
export class InsertActivityRequest extends BaseActivityRequest {
  /**
   * @param {{
   *   name?: string,
   *   address?: number,
   *   employees?: Array<{ employeeUuid: string, role: string }>
   * }} [props]
   */
  constructor(props = {}) {
    super(props);
  }
}
