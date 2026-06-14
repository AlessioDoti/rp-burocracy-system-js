/***
 * @fileoverview Use-case port for the Category aggregate.
 */

import { CategoryDTO } from '../../dto/CategoryDTO.js';

/**
 * @class CategoryRequestHandler
 * @classdesc Use-case port. The REST adapter calls into this; the
 * implementation in `domain/requesthandler/CategoryRequestHandlerImpl`
 * is wired to the CategoryService.
 */
export class CategoryRequestHandler {
  /**
   * Lists categories, page by page.
   *
   * @param {{ page: number, size: number, sort: { field: string, direction: 'asc'|'desc' }|null, offset: number }} pageable
   * @returns {Promise<import('../../dto/Page.js').Page<CategoryDTO>>}
   */
  // eslint-disable-next-line no-unused-vars
  async handleFindAll(pageable) {
    throw new Error('Not implemented');
  }

  /**
   * Inserts a new category.
   *
   * @param {CategoryDTO} dto
   * @returns {Promise<CategoryDTO>}
   */
  // eslint-disable-next-line no-unused-vars
  async handleInsert(dto) {
    throw new Error('Not implemented');
  }

  /**
   * Deletes a category by id.
   *
   * @param {number} id
   * @returns {Promise<void>}
   */
  // eslint-disable-next-line no-unused-vars
  async handleDelete(id) {
    throw new Error('Not implemented');
  }

  /**
   * Updates an existing category. Both the name and the bracket list
   * are overwritten from the request.
   *
   * @param {CategoryDTO} dto
   * @param {number} id
   * @returns {Promise<CategoryDTO>}
   */
  // eslint-disable-next-line no-unused-vars
  async handleUpdate(dto, id) {
    throw new Error('Not implemented');
  }
}
