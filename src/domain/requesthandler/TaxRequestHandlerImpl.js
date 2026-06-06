/**
 * @fileoverview Concrete use-case for the Tax aggregate.
 *
 * Resolves the activity (by id) and the manager (via the Person
 * service) before delegating to `TaxService`.
 */

import { TaxRequestHandler } from '../port/request/TaxRequestHandler.js';
import { ValidationError } from '../error/AppError.js';
import { taxPatchSchema } from '../dto/TaxDTO.js';
import { ValidatingService } from '../service/ValidatingService.js';

/**
 * @class TaxRequestHandlerImpl
 * @classdesc Wires the REST layer to `TaxService`, `ActivityService`,
 * and `PersonService`.
 */
export class TaxRequestHandlerImpl extends TaxRequestHandler {
  /**
   * @param {import('../service/ActivityService.js').ActivityService} activityService
   * @param {import('../port/person/PersonService.js').PersonService} personService
   * @param {import('../service/TaxService.js').TaxService} taxService
   */
  constructor(activityService, personService, taxService) {
    super();
    /** @property {import('../service/ActivityService.js').ActivityService} */
    this.activityService = activityService;
    /** @property {import('../port/person/PersonService.js').PersonService} */
    this.personService = personService;
    /** @property {import('../service/TaxService.js').TaxService} */
    this.taxService = taxService;
  }

  /**
   * Resolves the activity and the manager, attaches them to the DTO,
   * and delegates to `TaxService.insertTax`.
   *
   * @param {import('../dto/TaxDTO.js').TaxDTO} dto
   * @param {number} activity Activity primary key.
   * @param {string} managerName Manager's first name.
   * @param {string} managerSurname Manager's family name.
   * @returns {Promise<import('../dto/TaxDTO.js').TaxDTO>}
   */
  async handleInsert(dto, activity, managerName, managerSurname) {
    dto.activity = await this.activityService.findByID(activity);
    dto.manager = await this.personService.getPersonFromActivityNameAndSurname(
      activity,
      managerName,
      managerSurname
    );
    return this.taxService.insertTax(dto);
  }

  /**
   * @param {number|string} activity  Activity primary key (string from the URL is coerced to `Number` to match `POST /tax/:activity`).
   * @param {{ page: number, size: number, sort: { field: string, direction: 'asc'|'desc' }|null, offset: number }} pageable
   * @returns {Promise<import('../dto/Page.js').Page<import('../dto/TaxDTO.js').TaxDTO>>}
   */
  async handleFindByActivity(activity, pageable) {
    return this.taxService.findTaxByActivity(Number(activity), pageable);
  }

  /**
   * @param {{ page: number, size: number, sort: { field: string, direction: 'asc'|'desc' }|null, offset: number }} pageable
   * @returns {Promise<import('../dto/Page.js').Page<import('../dto/TaxDTO.js').TaxDTO>>}
   */
  async handleFindAll(pageable) {
    return this.taxService.findAllTaxes(pageable);
  }

  /**
   * Validates the patch with the Zod `taxPatchSchema` (at-least-one
   * field, per-field type checks) and delegates to `TaxService.updateTax`.
   *
   * @param {{ earnings?: number, expenses?: number, payed?: boolean, elapsedDays?: number }} patch
   * @param {number} id
   * @returns {Promise<import('../dto/TaxDTO.js').TaxDTO>}
   * @throws {ValidationError} When the patch is empty or any field has the wrong type.
   */
  async handleUpdate(patch, id) {
    const parsed = taxPatchSchema.safeParse(patch);
    if (!parsed.success) {
      const messages = ValidatingService.formatZodError(parsed.error);
      throw new ValidationError(`Tax patch validation failed: ${messages.join('; ')}`);
    }
    return this.taxService.updateTax(parsed.data, id);
  }
}
