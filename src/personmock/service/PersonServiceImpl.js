/**
 * @fileoverview Stand-in implementation of the `PersonService` port.
 *
 * Returns a placeholder `PersonDTO` with role `MANAGER` regardless of
 * the inputs. The real Person system is not yet wired in; replace
 * this class with a real adapter in the composition root when it
 * becomes available.
 */

import { PersonService } from '../../domain/port/person/PersonService.js';
import { PersonDTO } from '../../domain/dto/PersonDTO.js';

/**
 * @class PersonServiceImpl
 * @classdesc Mock adapter that always resolves the manager. Inputs are
 * accepted for signature parity but currently ignored.
 */
export class PersonServiceImpl extends PersonService {
  /**
   * @param {number} _activity Activity id; ignored by the mock.
   * @param {string} name      First name to echo back.
   * @param {string} surname   Family name to echo back.
   * @returns {Promise<import('../../domain/dto/PersonDTO.js').PersonDTO>}
   *   `{name, surname, role: 'MANAGER'}`.
   */
  async getPersonFromActivityNameAndSurname(_activity, name, surname) {
    return new PersonDTO({ name, surname, role: 'MANAGER' });
  }
}
