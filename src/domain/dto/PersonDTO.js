/**
 * @fileoverview Domain data transfer object for a person.
 *
 * PersonDTO is the only shape the domain ever sees for a person. The
 * real Person system is intentionally mocked for now; see the
 * `personmock/` adapter for the placeholder implementation.
 */

/**
 * @class PersonDTO
 * @classdesc Immutable-friendly value object representing a person.
 *
 * The constructor accepts a single options object so the call site reads
 * as named parameters (no positional-argument confusion). All fields are
 * optional and default to `null`, which is what the validator considers
 * "absent".
 */
export class PersonDTO {
  /**
   * @param {{
   *   name?: string|null,
   *   surname?: string|null,
   *   role?: string|null
   * }} [props]
   * @property {string|null} name     First name (or `null` when unknown).
   * @property {string|null} surname  Family name (or `null` when unknown).
   * @property {string|null} role     Role label (e.g. `"MANAGER"`); used by
   *                                  the persistence layer to discriminate
   *                                  the kind of relationship to the
   *                                  activity (currently a free string).
   */
  constructor({ name = null, surname = null, role = null } = {}) {
    /** @type {string|null} */
    this.name = name;
    /** @type {string|null} */
    this.surname = surname;
    /** @type {string|null} */
    this.role = role;
  }

  /**
   * Two PersonDTOs are considered equal when every field matches. Useful
   * for tests and for future change-detection in the persistence layer.
   *
   * @param {PersonDTO} other
   * @returns {boolean}
   */
  equals(other) {
    return (
      other instanceof PersonDTO &&
      this.name === other.name &&
      this.surname === other.surname &&
      this.role === other.role
    );
  }

  /**
   * Serialises to the shape stored in the DB columns:
   * the PersonDTO is flattened into `name`, `surname`, `role` — no
   * nested object.
   *
   * @returns {{ name: string|null, surname: string|null, role: string|null }}
   */
  toJSON() {
    return { name: this.name, surname: this.surname, role: this.role };
  }
}
