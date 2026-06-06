/**
 * @fileoverview Domain service for the Category aggregate.
 *
 * Validates incoming category payloads (which include the nested list
 * of tax brackets) and orchestrates the CategoryPersistenceService
 * port.
 */

import { ValidatingService } from './ValidatingService.js';
import { categoryValidationSchema } from '../dto/CategoryDTO.js';
import { NotFoundError } from '../error/AppError.js';

/**
 * @class CategoryService
 * @classdesc Bridges the domain with the CategoryPersistenceService
 * port and enforces the category Zod schema (including its nested
 * `categoryTaxes`) on every write.
 */
export class CategoryService extends ValidatingService {
  /**
   * @param {import('../port/persistence/CategoryPersistenceService.js').CategoryPersistenceService} categoryPersistenceService
   *   Persistence port to delegate reads and writes to.
   */
  constructor(categoryPersistenceService) {
    super(categoryValidationSchema);
    /** @property {import('../port/persistence/CategoryPersistenceService.js').CategoryPersistenceService} */
    this.categoryPersistenceService = categoryPersistenceService;
  }

  /**
   * Looks up a category by primary key, with its tax brackets
   * eager-loaded.
   *
   * @param {number} id
   * @returns {Promise<import('../dto/CategoryDTO.js').CategoryDTO|null>}
   */
  async findByID(id) {
    return this.categoryPersistenceService.findByID(id);
  }

  /**
   * Deletes a category by id. No-op when the row does not exist.
   *
   * @param {number} id
   * @returns {Promise<void>}
   */
  async deleteCategory(id) {
    return this.categoryPersistenceService.deleteCategory(id);
  }

  /**
   * Returns one page of categories, with their tax brackets eager-loaded.
   *
   * @param {{ page: number, size: number, sort: { field: string, direction: 'asc'|'desc' }|null, offset: number }} pageable
   * @returns {Promise<import('../dto/Page.js').Page<import('../dto/CategoryDTO.js').CategoryDTO>>}
   */
  async findAll(pageable) {
    return this.categoryPersistenceService.findAll(pageable);
  }

  /**
   * Validates the DTO (including every bracket) and forwards it to the
   * persistence port.
   *
   * @param {import('../dto/CategoryDTO.js').CategoryDTO} dto
   * @returns {Promise<import('../dto/CategoryDTO.js').CategoryDTO>}
   * @throws {ValidationError} When the DTO or one of its brackets fails
   *   the Zod schema.
   */
  async insertCategory(dto) {
    this.validate(dto);
    return this.categoryPersistenceService.saveCategory(dto);
  }

  /**
   * Updates an existing category. Both the name and the bracket set
   * are overwritten from the request DTO (no per-bracket diff).
   *
   * @param {import('../dto/CategoryDTO.js').CategoryDTO} dto
   * @param {number} id
   * @returns {Promise<import('../dto/CategoryDTO.js').CategoryDTO>}
   * @throws {NotFoundError} When no category exists with the given id.
   */
  async updateCategory(dto, id) {
    const found = await this.categoryPersistenceService.findByID(id);
    if (found === null || found === undefined) {
      throw new NotFoundError(`Category with id ${id} does not exist!`);
    }

    found.name = dto.name;
    found.categoryTaxes = dto.categoryTaxes;
    return this.categoryPersistenceService.saveCategory(found);
  }
}
