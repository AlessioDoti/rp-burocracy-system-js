/***
 * @fileoverview Persistence port for the Tax aggregate, plus the
 * "elapsed days" derived query that powers the tax computation.
 */

import { buildPageable } from '../../dto/Page.js';

/**
 * @class TaxPersistenceService
 * @classdesc Port the domain uses to persist and query Tax aggregates
 * and to read the time elapsed since the last declaration for a given
 * activity.
 */
export class TaxPersistenceService {
  /**
   * Inserts or updates a tax declaration.
   *
   * @param {import('../../dto/TaxDTO.js').TaxDTO} dto
   * @returns {Promise<import('../../dto/TaxDTO.js').TaxDTO>}
   */
  // eslint-disable-next-line no-unused-vars
  async saveTax(dto) {
    throw new Error('Not implemented');
  }

  /**
   * Looks up a tax declaration by primary key, with the full
   * activity → category → brackets chain eager-loaded.
   *
   * @param {number} id
   * @returns {Promise<import('../../dto/TaxDTO.js').TaxDTO|null>}
   */
  // eslint-disable-next-line no-unused-vars
  async findTaxByID(id) {
    throw new Error('Not implemented');
  }

  /**
   * Returns one page of tax declarations for a given activity id.
   *
   * @param {number|string} activity Activity primary key.
   * @param {{ page: number, size: number, sort: { field: string, direction: 'asc'|'desc' }|null, offset: number }} pageable
   * @returns {Promise<import('../dto/Page.js').Page<import('../dto/TaxDTO.js').TaxDTO>>}
   */
  // eslint-disable-next-line no-unused-vars
  async findActivityTaxes(activity, pageable) {
    throw new Error('Not implemented');
  }

  /**
   * Returns one page of every tax declaration, newest first by default.
   *
   * @param {{ page: number, size: number, sort: { field: string, direction: 'asc'|'desc' }|null, offset: number }} pageable
   * @returns {Promise<import('../../dto/Page.js').Page<import('../../dto/TaxDTO.js').TaxDTO>>}
   */
  // eslint-disable-next-line no-unused-vars
  async findAllTaxes(pageable) {
    throw new Error('Not implemented');
  }

  /**
   * Returns the number of whole days elapsed since the most recent
   * declaration for the given activity name. Returns `0` when no
   * declaration has ever been filed for that activity.
   *
   * @param {string} activity Activity name (the join key).
   * @returns {Promise<number>}
   */
  // eslint-disable-next-line no-unused-vars
  async getElapsedDays(activity) {
    throw new Error('Not implemented');
  }

  /**
   * Deletes every tax declaration filed against the given activity.
   * The caller is responsible for keeping this call and any activity
   * delete in a single transaction when atomicity is required.
   *
   * @param {number|string} activityId
   * @returns {Promise<void>}
   */
  // eslint-disable-next-line no-unused-vars
  async deleteByActivityId(activityId) {
    throw new Error('Not implemented');
  }
}

TaxPersistenceService.buildPageable = buildPageable;
