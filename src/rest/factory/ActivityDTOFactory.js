/**
 * @fileoverview Builds an `ActivityDTO` from a request object.
 *
 * The insert path returns a full `ActivityDTO` (with `name`, `address`,
 * and `employees`); the request handler attaches the resolved `category`
 * before validation. The update path returns a plain **patch** object
 * — at this point `category` is still the raw primary key from the
 * request body, not a resolved `CategoryDTO`. The handler resolves the
 * id and overwrites the same `category` field with the resolved object
 * before delegating to the service.
 *
 * `instanceof` is used as a primary discriminator; a `type` string tag
 * is accepted as a fallback so JSON-deserialised request objects (which
 * lose their prototype) still dispatch correctly.
 */

import { ActivityDTO } from '../../domain/dto/ActivityDTO.js';
import { ActivityEmployeeDTO } from '../../domain/dto/ActivityEmployeeDTO.js';
import { BaseActivityRequest } from '../request/BaseActivityRequest.js';
import { InsertActivityRequest } from '../request/impl/InsertActivityRequest.js';
import { UpdateActivityRequest } from '../request/impl/UpdateActivityRequest.js';

/**
 * @typedef {{
 *   name?: string,
 *   address?: number,
 *   category?: number,
 *   employees?: Array<{ employeeUuid: string, role: string }>
 * }} ActivityUpdatePatch
 */

/**
 * @class ActivityDTOFactory
 * @classdesc Dispatches between Insert and Update request shapes and
 *   produces the corresponding DTO (or, for updates, a patch).
 */
export class ActivityDTOFactory {
  /**
   * @param {BaseActivityRequest} request
   * @returns {ActivityDTO|ActivityUpdatePatch}
   * @throws {Error} When the request matches neither insert nor update.
   */
  getDTO(request) {
    if (request instanceof InsertActivityRequest || request?.type === 'insert') {
      return this.getInsertDTO(request);
    }
    if (request instanceof UpdateActivityRequest || request?.type === 'update') {
      return this.getUpdateDTO(request);
    }
    throw new Error('Invalid Request, please map a new type of request');
  }

  /**
   * @param {import('../request/impl/InsertActivityRequest.js').InsertActivityRequest} request
   * @returns {ActivityDTO}
   */
  getInsertDTO(request) {
    return new ActivityDTO({
      name: request.name,
      address: request.address,
      employees: (request.employees || []).map(
        (e) => new ActivityEmployeeDTO({ employeeUuid: e.employeeUuid, role: e.role })
      )
    });
  }

  /**
   * @param {import('../request/impl/UpdateActivityRequest.js').UpdateActivityRequest} request
   * @returns {ActivityUpdatePatch}
   */
  getUpdateDTO(request) {
    return {
      name: request.name,
      address: request.address,
      category: request.category,
      employees: request.employees
    };
  }
}
