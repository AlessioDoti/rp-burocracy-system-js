/***
 * @fileoverview External port for resolving people.
 *
 * Implemented by an HTTP adapter that calls the rp-person-system
 * microservice.
 */

import { PersonDTO } from '../../dto/PersonDTO.js';

/**
 * @class PersonService
 * @classdesc Port the domain uses to look up people by UUID or
 * internal userId.
 */
export class PersonService {
  /**
   * Fetches a person by their external UUID.
   *
   * @param {string} uuid External UUID.
   * @returns {Promise<PersonDTO>}
   */

  async getPersonByUuid(uuid) {
    throw new Error('Not implemented');
  }

  /***
   * Fetches a person by their internal userId.
   *
   * @param {number} userId
   * @returns {Promise<PersonDTO>}
   */

  async getPersonByUserId(userId) {
    throw new Error('Not implemented');
  }
}
