/***
 * @fileoverview Concrete use-case for the Tax aggregate.
 *
 * Resolves the activity (by id) and validates the employee UUID
 * locally against the ACTIVITIES_EMPLOYEES table before delegating
 * to `TaxService`.
 */

import { TaxRequestHandler } from '../port/request/TaxRequestHandler.js';
import { ValidationError, ForbiddenError } from '../error/AppError.js';
import { taxPatchSchema } from '../dto/TaxDTO.js';
import { ValidatingService } from '../service/ValidatingService.js';

/**
 * @class TaxRequestHandlerImpl
 * @classdesc Wires the REST layer to `TaxService`, `ActivityService`, and `PersonService`.
 */
export class TaxRequestHandlerImpl extends TaxRequestHandler {
  /**
   * @param {import('../service/ActivityService.js').ActivityService} activityService
   * @param {import('../service/TaxService.js').TaxService} taxService
   * @param {import('../port/person/PersonService.js').PersonService} personService
   */
  constructor(activityService, taxService, personService) {
    super();
    /** @property {import('../service/ActivityService.js').ActivityService} */
    this.activityService = activityService;
    /** @property {import('../service/TaxService.js').TaxService} */
    this.taxService = taxService;
    /** @property {import('../port/person/PersonService.js').PersonService} */
    this.personService = personService;
  }

  /**
   * Resolves the activity and validates the employee UUID locally
   * against the activity's employee list. The UUID is stored directly
   * on `dto.manager`.
   *
   * @param {import('../dto/TaxDTO.js').TaxDTO} dto
   * @param {number} activity        Activity primary key.
   * @param {string} employeeUuid    External UUID of the employee.
   * @param {{ checkEmployee?: boolean, userId?: number }} [opts]
   * @returns {Promise<import('../dto/TaxDTO.js').TaxDTO>}
   * @throws {ValidationError} When the employeeUuid is not assigned to the activity.
   */
  async handleInsert(dto, activity, employeeUuid, opts = {}) {
    dto.activity = await this.activityService.findByID(activity);
    if (!dto.activity) {
      throw new ValidationError(`Activity with id ${activity} does not exist`);
    }

    if (opts.checkEmployee && opts.userId != null) {
      const person = await this.personService.getPersonByUserId(opts.userId);
      if (!person || !person.uuid) {
        throw new ForbiddenError('You are not an employee of this activity');
      }
      const isEmployee = await this.activityService.hasEmployee(activity, person.uuid);
      if (!isEmployee) {
        throw new ForbiddenError('You are not an employee of this activity');
      }
    }

    const isValid = await this.activityService.hasEmployee(activity, employeeUuid);
    if (!isValid) {
      throw new ValidationError(
        `Employee ${employeeUuid} is not assigned to activity ${activity}`
      );
    }

    dto.manager = employeeUuid;
    return this.taxService.insertTax(dto);
  }

  /***
   * @param {number|string} activity  Activity primary key.
   * @param {{ page: number, size: number, sort: { field: string, direction: 'asc'|'desc' }|null, offset: number }} pageable
   * @param {{ checkEmployee?: boolean, userId?: number }} [opts]
   * @returns {Promise<import('../dto/Page.js').Page<import('../dto/TaxDTO.js').TaxDTO>>}
   */
  async handleFindByActivity(activity, pageable, opts = {}) {
    const activityId = Number(activity);

    // ACTIVITY_MANAGER without ADMIN/GOVERNMENT must be an employee
    if (opts.checkEmployee && opts.userId != null) {
      const person = await this.personService.getPersonByUserId(opts.userId);
      if (!person || !person.uuid) {
        throw new ForbiddenError('You are not an employee of this activity');
      }
      const isEmployee = await this.activityService.hasEmployee(activityId, person.uuid);
      if (!isEmployee) {
        throw new ForbiddenError('You are not an employee of this activity');
      }
    }

    return this.taxService.findTaxByActivity(activityId, pageable);
  }

  /***
   * @param {{ page: number, size: number, sort: { field: string, direction: 'asc'|'desc' }|null, offset: number }} pageable
   * @returns {Promise<import('../dto/Page.js').Page<import('../dto/TaxDTO.js').TaxDTO>>}
   */
  async handleFindAll(pageable) {
    return this.taxService.findAllTaxes(pageable);
  }

  /***
   * @param {{ earnings?: number, expenses?: number, payed?: boolean, elapsedDays?: number }} patch
   * @param {number} id
   * @returns {Promise<import('../dto/TaxDTO.js').TaxDTO>}
   * @throws {ValidationError}
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
