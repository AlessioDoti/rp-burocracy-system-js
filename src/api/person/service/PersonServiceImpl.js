/**
 * @fileoverview HTTP adapter that calls the rp-person-system microservice
 * to resolve people by UUID or internal userId.
 */

import { PersonService } from '../../../domain/port/person/PersonService.js';
import { PersonDTO } from '../../../domain/dto/PersonDTO.js';
import { logger } from '../../../config/logger.js';

/**
 * @class PersonServiceImpl
 * @classdesc Real adapter that fetches person data via HTTP from the
 * person microservice.
 */
export class PersonServiceImpl extends PersonService {
  /**
   * @param {string} [baseUrl] Base URL of the person microservice.
   *   Defaults to `http://localhost:8082`.
   */
  constructor(baseUrl = 'http://localhost:8082') {
    super();
    /** @property {string} */
    this.baseUrl = baseUrl;
  }

  /**
   * Fetches a person by external UUID from `GET /person/:uuid`.
   *
   * @param {string} uuid External UUID.
   * @returns {Promise<PersonDTO>}
   * @throws {Error} When the person is not found or the service is unreachable.
   */
  async getPersonByUuid(uuid) {
    const url = `${this.baseUrl}/person/${encodeURIComponent(uuid)}`;
    logger.debug({ url }, 'Fetching person from person-service by UUID');

    const response = await fetch(url);

    if (!response.ok) {
      if (response.status === 404) {
        throw new Error(`Person with UUID ${uuid} not found in person-service`);
      }
      throw new Error(`Person-service returned ${response.status} for UUID ${uuid}`);
    }

    const data = await response.json();
    return new PersonDTO({
      uuid: data.externalUuid,
      name: data.name,
      surname: data.surname,
      birthDate: data.birthDate
    });
  }

  /**
   * Fetches a person by internal userId from `GET /person/by-user/:userId`.
   *
   * @param {number} userId Internal user identifier.
   * @returns {Promise<PersonDTO>}
   * @throws {Error} When the person is not found or the service is unreachable.
   */
  async getPersonByUserId(userId) {
    const url = `${this.baseUrl}/person/by-user/${encodeURIComponent(userId)}`;
    logger.debug({ url }, 'Fetching person from person-service by userId');

    const response = await fetch(url);

    if (!response.ok) {
      if (response.status === 404) {
        throw new Error(`Person with userId ${userId} not found in person-service`);
      }
      throw new Error(`Person-service returned ${response.status} for userId ${userId}`);
    }

    const data = await response.json();
    return new PersonDTO({
      uuid: data.externalUuid,
      name: data.name,
      surname: data.surname,
      birthDate: data.birthDate
    });
  }
}
