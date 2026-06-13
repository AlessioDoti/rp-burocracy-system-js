/**
 * @fileoverview Use-case port for the Activity aggregate.
 *
 * Sits between the REST adapter and the domain services. Resolves
 * related aggregates (the category) before delegating to the service.
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
   * @param {ActivityDTO} dto
   * @param {number} category  Category primary key.
   * @returns {Promise<ActivityDTO>}
   */
  // eslint-disable-next-line no-unused-vars
  async handleInsert(dto, category) {
    throw new Error('Not implemented');
  }

  /**
   * Returns all activities linked to an employee UUID.
   *
   * @param {string} employeeUuid
   * @param {{ checkEmployee?: boolean, userId?: number }} [opts]
   * @returns {Promise<ActivityDTO[]>}
   */
  // eslint-disable-next-line no-unused-vars
  async handleFindByEmployeeUuid(employeeUuid, opts = {}) {
    throw new Error('Not implemented');
  }

  /**
   * Looks up a single activity by primary key.
   *
   * @param {number} id
   * @param {{ checkEmployee?: boolean, userUuid?: string }} [opts]
   * @returns {Promise<ActivityDTO|null>}
   */
  // eslint-disable-next-line no-unused-vars
  async handleFindByID(id, opts = {}) {
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
   * Applies a partial update to an existing activity. The patch is
   * the raw request body shape:
   *
   * - `name?: string`
   * - `address?: number`
   * - `category?: number` (primary key, resolved by the implementation)
 *   - `employees?: [{ employeeUuid, role }]` (replaces the full list;
 *     each UUID is validated against the person microservice)
 *
 * @param {{
 *   name?: string,
 *   address?: number,
 *   category?: number,
 *   employees?: Array<{ employeeUuid: string, role: string }>
 * }} patch
   * @param {number} id
   * @param {{ checkEmployee?: boolean, userUuid?: string }} [opts]
   * @returns {Promise<ActivityDTO>}
   */
  // eslint-disable-next-line no-unused-vars
  async handleUpdate(patch, id, opts = {}) {
    throw new Error('Not implemented');
  }
}
