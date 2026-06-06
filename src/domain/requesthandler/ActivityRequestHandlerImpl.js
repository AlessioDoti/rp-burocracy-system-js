/**
 * @fileoverview Concrete use-case for the Activity aggregate.
 *
 * Resolves the category from the request payload before delegating
 * validation and persistence to `ActivityService`. The category can
 * come either from a URL parameter (insert) or from the request body
 * (update); the implementation is identical.
 */

import { ActivityRequestHandler } from '../port/request/ActivityRequestHandler.js';
import { NotFoundError, ValidationError } from '../error/AppError.js';
import { activityPatchSchema } from '../dto/ActivityDTO.js';
import { ValidatingService } from '../service/ValidatingService.js';

/**
 * @class ActivityRequestHandlerImpl
 * @classdesc Wires the REST layer to `ActivityService` and
 * `CategoryService`. The category lookup is the only bit of
 * orchestration the implementation adds on top of the service.
 */
export class ActivityRequestHandlerImpl extends ActivityRequestHandler {
  /**
   * @param {import('../service/ActivityService.js').ActivityService} activityService
   * @param {import('../service/CategoryService.js').CategoryService} categoryService
   */
  constructor(activityService, categoryService) {
    super();
    /** @property {import('../service/ActivityService.js').ActivityService} */
    this.activityService = activityService;
    /** @property {import('../service/CategoryService.js').CategoryService} */
    this.categoryService = categoryService;
  }

  /**
   * @param {{ page: number, size: number, sort: { field: string, direction: 'asc'|'desc' }|null, offset: number }} pageable
   * @returns {Promise<import('../../dto/Page.js').Page<import('../../dto/ActivityDTO.js').ActivityDTO>>}
   */
  async handleFindAll(pageable) {
    return this.activityService.findAll(pageable);
  }

  /**
   * Looks up the category by id and attaches it to the DTO before
   * delegating to `ActivityService.insertActivity`.
   *
   * @param {import('../dto/ActivityDTO.js').ActivityDTO} dto
   * @param {number} category Category primary key.
   * @param {number[]} [_managementIds] Reserved for future use; the
   *   Person system is still mocked.
   * @returns {Promise<import('../dto/ActivityDTO.js').ActivityDTO>}
   * @throws {NotFoundError} When no category exists with the given id.
   */
  async handleInsert(dto, category, _managementIds) {
    const resolved = await this.categoryService.findByID(category);
    if (resolved === null || resolved === undefined) {
      throw new NotFoundError(`Category with id ${category} does not exist!`);
    }
    dto.category = resolved;
    return this.activityService.insertActivity(dto);
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
   * `activityPatchSchema` (so the request shape is checked at the
   * boundary, not by the domain service), resolves the category if
   * one was provided, and hands the resolved patch to
   * `ActivityService.updateActivity`.
   *
   * The service is not asked to re-validate the patch: the existing
   * row is already valid (it passed the insert schema), and the patch
   * is already shape-validated. The service only merges the defined
   * fields into the existing entity.
   *
   * @param {{
   *   name?: string,
   *   address?: number,
   *   category?: number
   * }} patch         Raw patch — `category` is the primary key from
   *                  the request body, not a resolved DTO.
   * @param {number} id
   * @param {number[]} [_managementIds] Reserved for future use.
   * @returns {Promise<import('../dto/ActivityDTO.js').ActivityDTO>}
   * @throws {ValidationError} When the patch does not match
   *   `activityPatchSchema`.
   * @throws {NotFoundError} When the activity does not exist, or
   *   when `patch.category` is provided and no category has that id.
   */
  async handleUpdate(patch, id, _managementIds) {
    // Validate the request-shaped patch at the boundary. Throws
    // ValidationError on failure; that becomes HTTP 400 in the global
    // error handler.
    const parsed = activityPatchSchema.safeParse(patch);
    if (!parsed.success) {
      throw new ValidationError(
        'Validation failed',
        ValidatingService.formatZodError(parsed.error)
      );
    }
    /** @type {{ name?: string, address?: number, category?: number|import('../../dto/CategoryDTO.js').CategoryDTO }} */
    const resolved = { ...parsed.data };

    if (resolved.category !== undefined) {
      const categoryDto = await this.categoryService.findByID(resolved.category);
      if (categoryDto === null || categoryDto === undefined) {
        throw new NotFoundError(`Category with id ${resolved.category} does not exist!`);
      }
      resolved.category = categoryDto;
    }

    return this.activityService.updateActivity(resolved, id);
  }
}
