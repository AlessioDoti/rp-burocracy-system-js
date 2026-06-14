/***
 * @fileoverview Use-case port for the Tax aggregate.
 */

import { TaxDTO } from '../../dto/TaxDTO.js';

/**
 * @class TaxRequestHandler
 * @classdesc Use-case port. The REST adapter calls into this; the
 * implementation in `domain/requesthandler/TaxRequestHandlerImpl`
 * is wired to TaxService and ActivityService.
 */
export class TaxRequestHandler {
  /**
   * Inserts a new tax declaration for the given activity.
   * The `employeeUuid` is validated locally against the activity's
   * employee list.
   *
   * @param {TaxDTO} dto
   * @param {number} activity       Activity primary key.
   * @param {string} employeeUuid   External UUID of the employee (validated locally).
   * @param {{ checkEmployee?: boolean, userId?: number }} [opts]
   * @returns {Promise<TaxDTO>}
   */
  // eslint-disable-next-line no-unused-vars
  async handleInsert(dto, activity, employeeUuid, opts = {}) {
    throw new Error('Not implemented');
  }

  /**
   * Lists a page of declarations for the activity with the given name.
   *
   * @param {number|string} activity
   * @param {{ page: number, size: number, sort: { field: string, direction: 'asc'|'desc' }|null, offset: number }} pageable
   * @param {{ checkEmployee?: boolean, userId?: number }} [opts]
   * @returns {Promise<import('../../dto/Page.js').Page<TaxDTO>>}
   */
  // eslint-disable-next-line no-unused-vars
  async handleFindByActivity(activity, pageable, opts = {}) {
    throw new Error('Not implemented');
  }

  /**
   * Lists every tax declaration, page by page.
   *
   * @param {{ page: number, size: number, sort: { field: string, direction: 'asc'|'desc' }|null, offset: number }} pageable
   * @returns {Promise<import('../../dto/Page.js').Page<TaxDTO>>}
   */
  // eslint-disable-next-line no-unused-vars
  async handleFindAll(pageable) {
    throw new Error('Not implemented');
  }

  /**
   * Updates an existing tax declaration.
   *
   * @param {{ earnings?: number, expenses?: number, payed?: boolean, elapsedDays?: number }} patch
   * @param {number} id
   * @returns {Promise<TaxDTO>}
   */
  // eslint-disable-next-line no-unused-vars
  async handleUpdate(patch, id) {
    throw new Error('Not implemented');
  }
}
