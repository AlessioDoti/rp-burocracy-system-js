/**
 * @fileoverview Persistence port for the Activity aggregate.
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
   * @returns {Promise<import('../../dto/ActivityDTO.js').ActivityDTO>}
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
   */
  // eslint-disable-next-line no-unused-vars
  async findByID(id) {
    throw new Error('Not implemented');
  }

  /**
   * Deletes an activity by primary key. Cascades to employee links and
   * tax declarations.
   *
   * @param {number} id
   * @returns {Promise<void>}
   */
  // eslint-disable-next-line no-unused-vars
  async deleteActivity(id) {
    throw new Error('Not implemented');
  }

  /**
   * Adds employees to an activity.
   *
   * @param {number} activityId
   * @param {Array<{ employeeUuid: string, role: string }>} employees
   * @returns {Promise<void>}
   */
  // eslint-disable-next-line no-unused-vars
  async addEmployees(activityId, employees) {
    throw new Error('Not implemented');
  }

  /**
   * Removes employees from an activity by UUID.
   *
   * @param {number} activityId
   * @param {string[]} employeeUuids
   * @returns {Promise<void>}
   */
  // eslint-disable-next-line no-unused-vars
  async removeEmployees(activityId, employeeUuids) {
    throw new Error('Not implemented');
  }

  /**
   * Replaces the entire employee list for an activity.
   *
   * @param {number} activityId
   * @param {Array<{ employeeUuid: string, role: string }>} employees
   * @returns {Promise<void>}
   */
  // eslint-disable-next-line no-unused-vars
  async replaceEmployees(activityId, employees) {
    throw new Error('Not implemented');
  }

  /**
   * Returns every activity an employee (by UUID) is linked to.
   *
   * @param {string} employeeUuid
   * @returns {Promise<import('../../dto/ActivityDTO.js').ActivityDTO[]>}
   */
  // eslint-disable-next-line no-unused-vars
  async findByEmployeeUuid(employeeUuid) {
    throw new Error('Not implemented');
  }

  /**
   * Checks whether an employee UUID is currently assigned to the
   * given activity. Used for tax-filing validation.
   *
   * @param {number} activityId
   * @param {string} employeeUuid
   * @returns {Promise<boolean>}
   */
  // eslint-disable-next-line no-unused-vars
  async hasEmployee(activityId, employeeUuid) {
    throw new Error('Not implemented');
  }
}

/**
 * Re-export of the {@link buildPageable} helper.
 */
ActivityPersistenceService.buildPageable = buildPageable;
