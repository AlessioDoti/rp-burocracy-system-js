/**
 * @fileoverview Persistence port for the Category aggregate.
 */

import { buildPageable } from '../../dto/Page.js';

/**
 * @class CategoryPersistenceService
 * @classdesc Port the domain uses to persist and query Category
 * aggregates, including their nested tax brackets.
 */
export class CategoryPersistenceService {
  /**
   * Inserts a new category (with its tax brackets) or updates an
   * existing one. Updates replace the bracket set wholesale — there is
   * no per-bracket diff.
   *
   * @param {import('../../dto/CategoryDTO.js').CategoryDTO} dto
   * @returns {Promise<import('../../dto/CategoryDTO.js').CategoryDTO>}
   */
  // eslint-disable-next-line no-unused-vars
  async saveCategory(dto) {
    throw new Error('Not implemented');
  }

  /**
   * Looks up a category by primary key, with its tax brackets
   * eager-loaded.
   *
   * @param {number} id
   * @returns {Promise<import('../../dto/CategoryDTO.js').CategoryDTO|null>}
   */
  // eslint-disable-next-line no-unused-vars
  async findByID(id) {
    throw new Error('Not implemented');
  }

  /**
   * Deletes a category by primary key. No-op if the row does not exist.
   *
   * @param {number} id
   * @returns {Promise<void>}
   */
  // eslint-disable-next-line no-unused-vars
  async deleteCategory(id) {
    throw new Error('Not implemented');
  }

  /**
   * Returns one page of categories, with their tax brackets eager-loaded.
   *
   * @param {{ page: number, size: number, sort: { field: string, direction: 'asc'|'desc' }|null, offset: number }} pageable
   * @returns {Promise<import('../../dto/Page.js').Page<import('../../dto/CategoryDTO.js').CategoryDTO>>}
   */
  // eslint-disable-next-line no-unused-vars
  async findAll(pageable) {
    throw new Error('Not implemented');
  }
}

CategoryPersistenceService.buildPageable = buildPageable;
