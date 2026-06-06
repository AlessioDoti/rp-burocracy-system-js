/**
 * @fileoverview Persistence port for the Activity aggregate.
 *
 * This class is the contract every persistence adapter must honour.
 * Subclasses (e.g. the MySQL-backed implementation in
 * `persistence/service/ActivityPersistenceServiceImpl.js`) override the
 * methods; the domain never imports those implementations directly.
 */

import { buildPageable } from '../../dto/Page.js';

/**
 * @class ActivityPersistenceService
 * @classdesc Port the domain uses to persist and query Activity
 * aggregates. All methods return DTOs, never raw entities.
 */
export class ActivityPersistenceService {
  /**
   * Returns one page of activities, with their categories eager-loaded.
   *
   * @param {{ page: number, size: number, sort: { field: string, direction: 'asc'|'desc' }|null, offset: number }} pageable
   * @returns {Promise<import('../../dto/Page.js').Page<import('../../dto/ActivityDTO.js').ActivityDTO>>}
   */
  // eslint-disable-next-line no-unused-vars
  async findAll(pageable) {
    throw new Error('Not implemented');
  }

  /**
   * Inserts a new activity or updates an existing one (based on the
   * presence of `dto.id`).
   *
   * @param {import('../../dto/ActivityDTO.js').ActivityDTO} dto
   * @returns {Promise<import('../../dto/ActivityDTO.js').ActivityDTO>} The
   *   persisted DTO (with `id` populated on insert).
   */
  // eslint-disable-next-line no-unused-vars
  async saveActivity(dto) {
    throw new Error('Not implemented');
  }

  /**
   * Looks up an activity by primary key.
   *
   * @param {number} id
   * @returns {Promise<import('../../dto/ActivityDTO.js').ActivityDTO|null>}
   *   `null` when no row matches.
   */
  // eslint-disable-next-line no-unused-vars
  async findByID(id) {
    throw new Error('Not implemented');
  }

  /**
   * Deletes an activity by primary key. **Cascades** to every tax
   * declaration filed against the activity; the two deletes are
   * performed in a single transaction by the persistence adapter.
   * No-op if the row does not exist.
   *
   * @param {number} id
   * @returns {Promise<void>}
   */
  // eslint-disable-next-line no-unused-vars
  async deleteActivity(id) {
    throw new Error('Not implemented');
  }
}

/**
 * Re-export of the {@link buildPageable} helper as a static method on
 * the port, so consumers can build a `pageable` argument without
 * importing the helper directly.
 */
ActivityPersistenceService.buildPageable = buildPageable;
