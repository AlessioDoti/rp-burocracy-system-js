/**
 * @fileoverview External port for resolving people.
 *
 * The real Person service is intentionally out of scope for now; this
 * port is implemented in `personmock/` with a placeholder that returns
 * a synthetic PersonDTO. Wiring a real implementation later only
 * requires providing a different `PersonService` to the composition
 * root.
 */

import { PersonDTO } from '../../dto/PersonDTO.js';

/**
 * @class PersonService
 * @classdesc Port the domain uses to look up a person given an activity
 * and the person's first name and family name.
 */
export class PersonService {
  /**
   * @param {number} activity  Activity the person is associated with.
   * @param {string} name      First name.
   * @param {string} surname   Family name.
   * @returns {Promise<PersonDTO>} The resolved person; the mock returns
   *   `{name, surname, role: 'MANAGER'}` regardless of the inputs.
   */
  // eslint-disable-next-line no-unused-vars
  async getPersonFromActivityNameAndSurname(activity, name, surname) {
    throw new Error('Not implemented');
  }
}
