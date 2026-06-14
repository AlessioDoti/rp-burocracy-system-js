/***
 * @fileoverview Domain data transfer object for a person.
 *
 * PersonDTO is the only shape the domain ever sees for a person.
 * It carries the external UUID that is fetched from the rp-person-system
 * microservice. The domain never sees the internal database id.
 */

/***
 * @class PersonDTO
 * @classdesc Immutable-friendly value object representing a person.
 */
export class PersonDTO {
  /**
   * @param {{
   *   uuid?: string|null,
   *   name?: string|null,
   *   surname?: string|null,
   *   birthDate?: Date|string|null
   * }} [props]
   * @property {string|null}        uuid      External UUID (stable reference across microservices).
   * @property {string|null}        name      First name.
   * @property {string|null}        surname   Family name.
   * @property {Date|string|null}   birthDate Date of birth.
   */
  constructor({ uuid = null, name = null, surname = null, birthDate = null } = {}) {
    /** @type {string|null} */
    this.uuid = uuid;
    /** @type {string|null} */
    this.name = name;
    /** @type {string|null} */
    this.surname = surname;
    /** @type {Date|string|null} */
    this.birthDate = birthDate;
  }

  /***
   * @param {PersonDTO} other
   * @returns {boolean}
   */
  equals(other) {
    return (
      other instanceof PersonDTO &&
      this.uuid === other.uuid &&
      this.name === other.name &&
      this.surname === other.surname
    );
  }

  /***
   * @returns {{ uuid: string|null, name: string|null, surname: string|null, birthDate: string|null }}
   */
  toJSON() {
    return {
      uuid: this.uuid,
      name: this.name,
      surname: this.surname,
      birthDate: this.birthDate instanceof Date ? this.birthDate.toISOString().split('T')[0] : this.birthDate
    };
  }
}
