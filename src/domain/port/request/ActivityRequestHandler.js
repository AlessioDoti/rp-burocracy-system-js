/**
 * @fileoverview Use-case port for the Activity aggregate.
 *
 * Sits between the REST adapter and the domain services. Resolves
 * related aggregates (the category, the management list) before
 * delegating to the service.
 */

import { ActivityDTO } from '../../dto/ActivityDTO.js';

/**
 * @class ActivityRequestHandler
 * @classdesc Use-case port. The REST adapter calls into this; the
 * implementation in `domain/requesthandler/ActivityRequestHandlerImpl`
 * is wired to the domain services.
 */
export class ActivityRequestHandler {
  /**
   * Lists activities, page by page.
   *
   * @param {{ page: number, size: number, sort: { field: string, direction: 'asc'|'desc' }|null, offset: number }} pageable
   * @returns {Promise<import('../../dto/Page.js').Page<ActivityDTO>>}
   */
  // eslint-disable-next-line no-unused-vars
  async handleFindAll(pageable) {
    throw new Error('Not implemented');
  }

  /**
   * Inserts a new activity under the given category.
   *
   * @param {ActivityDTO} dto              Activity payload (the request
   *                                        handler resolves the category
   *                                        from `category` and attaches it
   *                                        before validation).
   * @param {number} category              Category primary key.
   * @param {number[]} [_managementIds]    Reserved for future use; the
   *                                        Person system is still mocked.
   * @returns {Promise<ActivityDTO>}
   */
  // eslint-disable-next-line no-unused-vars
  async handleInsert(dto, category, _managementIds) {
    throw new Error('Not implemented');
  }

  /**
   * Deletes an activity by id.
   *
   * @param {number} id
   * @returns {Promise<void>}
   */
  // eslint-disable-next-line no-unused-vars
  async handleDelete(id) {
    throw new Error('Not implemented');
  }

  /**
   * Applies a partial update to an existing activity.
   *
   * The `patch` is a plain object whose fields mirror the request
   * body:
   * - `name?: string` — when present, replaces the activity name
   * - `address?: number` — when present, replaces the numeric address
   * - `category?: number` — when present, the **primary key** of the
   *   new CATEGORY row. The implementation looks it up and replaces
   *   the `category` field with the resolved `CategoryDTO` before
   *   delegating to the service.
   *
   * At least one of the three fields must be present (enforced by
   * the request-handler-level Zod schema).
   *
   * @param {{
   *   name?: string,
   *   address?: number,
   *   category?: number
   * }} patch           Raw patch (raw `category` id, not a resolved DTO).
   * @param {number} id
   * @param {number[]} [_managementIds] Reserved for future use.
   * @returns {Promise<ActivityDTO>}
   */
  // eslint-disable-next-line no-unused-vars
  async handleUpdate(patch, id, _managementIds) {
    throw new Error('Not implemented');
  }
}
