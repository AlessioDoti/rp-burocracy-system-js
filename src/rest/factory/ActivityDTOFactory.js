/**
 * @fileoverview Builds an `ActivityDTO` from a request object.
 *
 * The insert path returns a full `ActivityDTO` (with `name` and
 * `address`); the request handler attaches the resolved `category`
 * before validation. The update path returns a plain **patch** object
 * (with optional `name`, `address`, `category`) — at this point
 * `category` is still the raw primary key from the request body, not
 * a resolved `CategoryDTO`. The handler resolves the id and
 * overwrites the same `category` field with the resolved object
 * before delegating to the service.
 *
 * `instanceof` is used as a primary discriminator; a `type` string
 * tag is accepted as a fallback so JSON-deserialised request objects
 * (which lose their prototype) still dispatch correctly.
 */

import { ActivityDTO } from '../../domain/dto/ActivityDTO.js';
import { BaseActivityRequest } from '../request/BaseActivityRequest.js';
import { InsertActivityRequest } from '../request/impl/InsertActivityRequest.js';
import { UpdateActivityRequest } from '../request/impl/UpdateActivityRequest.js';

/**
 * @typedef {{
 *   name?: string,
 *   address?: number,
 *   category?: number
 * }} ActivityUpdatePatch
 *
 * Raw patch shape produced by the factory for `UpdateActivityRequest`.
 * The `category` field is the primary key from the request body when
 * the patch leaves the factory; the handler resolves it into a
 * `CategoryDTO` before passing the patch to the service.
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
   * @returns {ActivityDTO} A DTO carrying `name` and `address`. `category` and `management`
   *   are filled in by the request handler.
   */
  getInsertDTO(request) {
    return new ActivityDTO({
      name: request.name,
      address: request.address
    });
  }

  /**
   * @param {import('../request/impl/UpdateActivityRequest.js').UpdateActivityRequest} request
   * @returns {ActivityUpdatePatch} A patch object. Every field is
   *   optional, so the returned object has `undefined` for any
   *   property the caller did not set on the request. The `category`
   *   field carries the raw primary key from the request body when
   *   the patch leaves the factory; the request handler resolves it
   *   into a `CategoryDTO` before calling the service.
   */
  getUpdateDTO(request) {
    return {
      name: request.name,
      address: request.address,
      category: request.category
    };
  }
}
