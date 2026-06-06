/**
 * @fileoverview Domain service for the Activity aggregate.
 *
 * Owns validation of incoming activity payloads and orchestrates the
 * ActivityPersistenceService. Translation between HTTP-shaped request
 * objects and domain DTOs is performed by the request handler in
 * `domain/requesthandler/`, never by this service.
 */

import { ValidatingService } from './ValidatingService.js';
import { activityValidationSchema } from '../dto/ActivityDTO.js';
import { NotFoundError } from '../error/AppError.js';

/**
 * @class ActivityService
 * @classdesc Bridges the domain with the ActivityPersistenceService
 * port and enforces the activity Zod schema on every write.
 */
export class ActivityService extends ValidatingService {
  /**
   * @param {import('../port/persistence/ActivityPersistenceService.js').ActivityPersistenceService} activityPersistenceService
   *   Persistence port to delegate reads and writes to.
   */
  constructor(activityPersistenceService) {
    super(activityValidationSchema);
    /** @property {import('../port/persistence/ActivityPersistenceService.js').ActivityPersistenceService} */
    this.activityPersistenceService = activityPersistenceService;
  }

  /**
   * Looks up an activity by primary key.
   *
   * @param {number} id
   * @returns {Promise<import('../dto/ActivityDTO.js').ActivityDTO|null>}
   *   The activity (with its category eager-loaded) or `null` if no
   *   row matches.
   */
  async findByID(id) {
    return this.activityPersistenceService.findByID(id);
  }

  /**
   * Returns one page of activities, with categories eager-loaded.
   *
   * @param {{ page: number, size: number, sort: { field: string, direction: 'asc'|'desc' }|null, offset: number }} pageable
   *   Built by `buildPageable` from query parameters.
   * @returns {Promise<import('../dto/Page.js').Page<import('../dto/ActivityDTO.js').ActivityDTO>>}
   */
  async findAll(pageable) {
    return this.activityPersistenceService.findAll(pageable);
  }

  /**
   * Validates the DTO and forwards it to the persistence port.
   *
   * @param {import('../dto/ActivityDTO.js').ActivityDTO} dto
   * @returns {Promise<import('../dto/ActivityDTO.js').ActivityDTO>}
   *   The persisted DTO (with `id` populated on insert).
   * @throws {ValidationError} When the DTO fails the Zod schema.
   */
  async insertActivity(dto) {
    this.validate(dto);
    return this.activityPersistenceService.saveActivity(dto);
  }

  /**
   * Deletes an activity by id. No-op when the row does not exist.
   *
   * @param {number} id
   * @returns {Promise<void>}
   */
  async deleteActivity(id) {
    return this.activityPersistenceService.deleteActivity(id);
  }

  /**
   * Applies a partial update to an existing activity. Only the fields
   * the caller actually provided (`!== undefined`) are written; the
   * rest are preserved on the existing row. The patch is assumed to
   * be request-shape-validated (the `ActivityRequestHandlerImpl` does
   * that with `activityPatchSchema`) and to carry a resolved
   * `CategoryDTO` (not a raw id) when `category` is present, so this
   * method does not re-validate.
   *
   * @param {{
   *   name?: string,
   *   address?: number,
   *   category?: import('../dto/CategoryDTO.js').CategoryDTO
   * }} patch
   * @param {number} id
   * @returns {Promise<import('../dto/ActivityDTO.js').ActivityDTO>}
   * @throws {NotFoundError} When no activity exists with the given id.
   */
  async updateActivity(patch, id) {
    const found = await this.activityPersistenceService.findByID(id);
    if (found === null || found === undefined) {
      throw new NotFoundError(`Activity with id ${id} does not exist!`);
    }

    if (patch.name !== undefined) found.name = patch.name;
    if (patch.address !== undefined) found.address = patch.address;
    if (patch.category !== undefined && patch.category !== null) {
      found.category = patch.category;
    }

    return this.activityPersistenceService.saveActivity(found);
  }
}
