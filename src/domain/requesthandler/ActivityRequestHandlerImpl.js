/**
 * @fileoverview Concrete use-case for the Activity aggregate.
 *
 * Resolves the category from the request payload and validates
 * employee UUIDs against the person microservice before delegating
 * to `ActivityService`.
 */

import { ActivityRequestHandler } from '../port/request/ActivityRequestHandler.js';
import { NotFoundError, ValidationError, ForbiddenError } from '../error/AppError.js';
import { activityPatchSchema } from '../dto/ActivityDTO.js';
import { ValidatingService } from '../service/ValidatingService.js';

/**
 * @class ActivityRequestHandlerImpl
 * @classdesc Wires the REST layer to `ActivityService`,
 * `CategoryService`, and `PersonService`.
 */
export class ActivityRequestHandlerImpl extends ActivityRequestHandler {
  /**
   * @param {import('../service/ActivityService.js').ActivityService} activityService
   * @param {import('../service/CategoryService.js').CategoryService} categoryService
   * @param {import('../port/person/PersonService.js').PersonService} personService
   */
  constructor(activityService, categoryService, personService) {
    super();
    /** @property {import('../service/ActivityService.js').ActivityService} */
    this.activityService = activityService;
    /** @property {import('../service/CategoryService.js').CategoryService} */
    this.categoryService = categoryService;
    /** @property {import('../port/person/PersonService.js').PersonService} */
    this.personService = personService;
  }

  /**
   * @param {{ page: number, size: number, sort: { field: string, direction: 'asc'|'desc' }|null, offset: number }} pageable
   * @returns {Promise<import('../../dto/Page.js').Page<import('../../dto/ActivityDTO.js').ActivityDTO>>}
   */
  async handleFindAll(pageable) {
    return this.activityService.findAll(pageable);
  }

  /**
   * Looks up the category by id, validates employee UUIDs, and
   * delegates to `ActivityService.insertActivity`.
   *
   * @param {import('../dto/ActivityDTO.js').ActivityDTO} dto
   * @param {number} category  Category primary key.
   * @returns {Promise<import('../dto/ActivityDTO.js').ActivityDTO>}
   * @throws {NotFoundError} When the category or any employee UUID does not exist.
   */
  async handleInsert(dto, category) {
    const resolved = await this.categoryService.findByID(category);
    if (resolved === null || resolved === undefined) {
      throw new NotFoundError(`Category with id ${category} does not exist!`);
    }
    dto.category = resolved;

    if (dto.employees && dto.employees.length > 0) {
      await this._validateEmployeeUuids(dto.employees);
    }

    return this.activityService.insertActivity(dto);
  }

  /**
   * @param {string} employeeUuid
   * @param {{ checkEmployee?: boolean, userId?: number }} [opts]
   * @returns {Promise<import('../dto/ActivityDTO.js').ActivityDTO[]>}
   */
  async handleFindByEmployeeUuid(employeeUuid, opts = {}) {
    // ACTIVITY_MANAGER without ADMIN/GOVERNMENT can only see their own record
    if (opts.checkEmployee && opts.userId != null) {
      const person = await this.personService.getPersonByUserId(opts.userId);
      if (person.uuid !== employeeUuid) {
        throw new ForbiddenError('You can only view your own employee activities');
      }
    }

    return this.activityService.findByEmployeeUuid(employeeUuid);
  }

  /**
   * @param {number} id
   * @param {{ checkEmployee?: boolean, userId?: number }} [opts]
   * @returns {Promise<import('../dto/ActivityDTO.js').ActivityDTO|null>}
   */
  async handleFindByID(id, opts = {}) {
    const activity = await this.activityService.findByID(id);
    if (!activity) return null;

    if (opts.checkEmployee && opts.userId != null) {
      const person = await this.personService.getPersonByUserId(opts.userId);
      const isEmployee = await this.activityService.hasEmployee(id, person.uuid);
      if (!isEmployee) {
        throw new ForbiddenError('You are not an employee of this activity');
      }
    }

    return activity;
  }

  /**
   * @param {number} id
   * @returns {Promise<void>}
   */
  async handleDelete(id) {
    return this.activityService.deleteActivity(id);
  }

  /**
   * Applies a partial update. Validates the patch with
   * `activityPatchSchema`, resolves the category, validates
   * employee UUIDs, then applies base-field changes and employee
   * replacement.
   *
   * @param {{
   *   name?: string,
   *   address?: number,
   *   category?: number,
   *   employees?: Array<{ employeeUuid: string, role: string }>
   * }} patch
   * @param {number} id
   * @param {{ checkEmployee?: boolean, userId?: number }} [opts]
   * @returns {Promise<import('../dto/ActivityDTO.js').ActivityDTO>}
   */
  async handleUpdate(patch, id, opts = {}) {
    const parsed = activityPatchSchema.safeParse(patch);
    if (!parsed.success) {
      throw new ValidationError(
        'Validation failed',
        ValidatingService.formatZodError(parsed.error)
      );
    }
    const resolved = { ...parsed.data };

    // ACTIVITY_MANAGER without ADMIN/GOVERNMENT must be an employee
    if (opts.checkEmployee && opts.userId != null) {
      const person = await this.personService.getPersonByUserId(opts.userId);
      const isEmployee = await this.activityService.hasEmployee(id, person.uuid);
      if (!isEmployee) {
        throw new ForbiddenError('You are not an employee of this activity');
      }
    }

    if (resolved.category !== undefined) {
      const categoryDto = await this.categoryService.findByID(resolved.category);
      if (categoryDto === null || categoryDto === undefined) {
        throw new NotFoundError(`Category with id ${resolved.category} does not exist!`);
      }
      resolved.category = categoryDto;
    }

    // Validate employee UUIDs before making any changes
    if (resolved.employees !== undefined && resolved.employees.length > 0) {
      await this._validateEmployeeUuids(resolved.employees);
    }

    // Update base activity fields (name / address / category)
    const hasFieldUpdate =
      resolved.name !== undefined
      || resolved.address !== undefined
      || resolved.category !== undefined;

    if (hasFieldUpdate) {
      await this.activityService.updateActivity(resolved, id);
    }

    // Replace the full employee list (empty array = remove all)
    if (resolved.employees !== undefined) {
      await this.activityService.replaceEmployees(id, resolved.employees);
    }

    // Reload and return the current state
    return this.activityService.findByID(id);
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  /**
   * Validates that every employee UUID in the list exists in the
   * person microservice. Throws `ValidationError` with all invalid
   * UUIDs if any are not found.
   *
   * @param {Array<{ employeeUuid: string, role: string }>} employees
   * @returns {Promise<void>}
   * @throws {ValidationError} When one or more UUIDs are not found.
   * @private
   */
  async _validateEmployeeUuids(employees) {
    const notFound = [];

    for (const emp of employees) {
      try {
        await this.personService.getPersonByUuid(emp.employeeUuid);
      } catch {
        notFound.push(emp.employeeUuid);
      }
    }

    if (notFound.length > 0) {
      throw new ValidationError(
        `The following employee UUIDs do not exist in the person system: ${notFound.join(', ')}`
      );
    }
  }
}
