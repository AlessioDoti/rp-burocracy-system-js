/**
 * @fileoverview Domain service for the Activity aggregate.
 *
 * Owns validation of incoming activity payloads and orchestrates the
 * ActivityPersistenceService.
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
   */
  constructor(activityPersistenceService) {
    super(activityValidationSchema);
    /** @property {import('../port/persistence/ActivityPersistenceService.js').ActivityPersistenceService} */
    this.activityPersistenceService = activityPersistenceService;
  }

  /**
   * @param {number} id
   * @returns {Promise<import('../dto/ActivityDTO.js').ActivityDTO|null>}
   */
  async findByID(id) {
    return this.activityPersistenceService.findByID(id);
  }

  /**
   * Returns all activities linked to an employee UUID.
   *
   * @param {string} employeeUuid
   * @returns {Promise<import('../dto/ActivityDTO.js').ActivityDTO[]>}
   */
  async findByEmployeeUuid(employeeUuid) {
    return this.activityPersistenceService.findByEmployeeUuid(employeeUuid);
  }

  /**
   * @param {{ page: number, size: number, sort: { field: string, direction: 'asc'|'desc' }|null, offset: number }} pageable
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
   * @throws {ValidationError} When the DTO fails the Zod schema.
   */
  async insertActivity(dto) {
    this.validate(dto);
    return this.activityPersistenceService.saveActivity(dto);
  }

  /**
   * Deletes an activity by id.
   *
   * @param {number} id
   * @returns {Promise<void>}
   */
  async deleteActivity(id) {
    return this.activityPersistenceService.deleteActivity(id);
  }

  /**
   * Applies a partial update to an existing activity. Only the fields
   * the caller provided (`!== undefined`) are written; the rest are
   * preserved on the existing row.
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

  // -------------------------------------------------------------------------
  // Employee management — delegates to persistence port
  // -------------------------------------------------------------------------

  /**
   * @param {number} activityId
   * @param {Array<{ employeeUuid: string, role: string }>} employees
   * @returns {Promise<void>}
   */
  async addEmployees(activityId, employees) {
    return this.activityPersistenceService.addEmployees(activityId, employees);
  }

  /**
   * @param {number} activityId
   * @param {Array<{ employeeUuid: string, role: string }>} employees
   * @returns {Promise<void>}
   */
  async replaceEmployees(activityId, employees) {
    return this.activityPersistenceService.replaceEmployees(activityId, employees);
  }

  /**
   * @param {number} activityId
   * @param {string} employeeUuid
   * @returns {Promise<boolean>}
   */
  async hasEmployee(activityId, employeeUuid) {
    return this.activityPersistenceService.hasEmployee(activityId, employeeUuid);
  }
}
