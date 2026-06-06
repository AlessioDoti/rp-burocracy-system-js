/**
 * @fileoverview Request body for `POST /activities/:categoryId`.
 *
 * The `category` is resolved by the request handler from the
 * `:categoryId` URL parameter, and `managementIds` is reserved for the
 * (still mocked) Person system.
 */

import { BaseActivityRequest } from '../BaseActivityRequest.js';

/**
 * @class InsertActivityRequest
 * @classdesc Activity insert payload. Carries `name` and `address`
 *   from the base; the handler attaches the resolved `category` and
 *   forwards the DTO to `ActivityService.insertActivity`.
 */
export class InsertActivityRequest extends BaseActivityRequest {
  /**
   * @param {{
   *   name?: string,
   *   address?: number,
   *   managementIds?: number[]
   * }} [props]
   */
  constructor(props = {}) {
    super(props);
  }
}
