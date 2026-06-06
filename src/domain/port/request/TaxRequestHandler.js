/**
 * @fileoverview Use-case port for the Tax aggregate.
 */

import { TaxDTO } from '../../dto/TaxDTO.js';

/**
 * @class TaxRequestHandler
 * @classdesc Use-case port. The REST adapter calls into this; the
 * implementation in `domain/requesthandler/TaxRequestHandlerImpl` is
 * wired to the TaxService, ActivityService, and PersonService.
 */
export class TaxRequestHandler {
  /**
   * Inserts a new tax declaration. The activity is resolved by id; the
   * manager is resolved through the (mocked) Person service.
   *
   * @param {TaxDTO} dto             DTO carrying `earnings` and `expenses`.
   * @param {number} activity        Activity primary key.
   * @param {string} managerName     Manager's first name.
   * @param {string} managerSurname  Manager's family name.
   * @returns {Promise<TaxDTO>}
   */
  // eslint-disable-next-line no-unused-vars
  async handleInsert(dto, activity, managerName, managerSurname) {
    throw new Error('Not implemented');
  }

  /**
   * Lists the declarations filed against the given activity name.
   *
   * @param {string} activity
   * @param {{ page: number, size: number, sort: { field: string, direction: 'asc'|'desc' }|null, offset: number }} pageable
   * @returns {Promise<import('../../dto/Page.js').Page<TaxDTO>>}
   */
  // eslint-disable-next-line no-unused-vars
  async handleFindByActivity(activity, pageable) {
    throw new Error('Not implemented');
  }

  /**
   * Lists every tax declaration, newest first.
   *
   * @param {{ page: number, size: number, sort: { field: string, direction: 'asc'|'desc' }|null, offset: number }} pageable
   * @returns {Promise<import('../../dto/Page.js').Page<TaxDTO>>}
   */
  // eslint-disable-next-line no-unused-vars
  async handleFindAll(pageable) {
    throw new Error('Not implemented');
  }

  /**
   * Updates an existing tax declaration. `0` values in the request
   * mean "leave the existing value untouched".
   *
   * @param {TaxDTO} dto
   * @param {number} id
   * @returns {Promise<TaxDTO>}
   */
  // eslint-disable-next-line no-unused-vars
  async handleUpdate(dto, id) {
    throw new Error('Not implemented');
  }
}
