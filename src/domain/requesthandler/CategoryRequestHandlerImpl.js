/***
 * @fileoverview Concrete use-case for the Category aggregate.
 *
 * Thin pass-through to `CategoryService`; no additional orchestration
 * is required because the DTO already carries every bracket.
 */

import { CategoryRequestHandler } from '../port/request/CategoryRequestHandler.js';

/**
 * @class CategoryRequestHandlerImpl
 * @classdesc Wires the REST layer to `CategoryService`.
 */
export class CategoryRequestHandlerImpl extends CategoryRequestHandler {
  /**
   * @param {import('../service/CategoryService.js').CategoryService} categoryService
   */
  constructor(categoryService) {
    super();
    /** @property {import('../service/CategoryService.js').CategoryService} */
    this.categoryService = categoryService;
  }

  /**
   * @param {{ page: number, size: number, sort: { field: string, direction: 'asc'|'desc' }|null, offset: number }} pageable
   * @returns {Promise<import('../dto/Page.js').Page<import('../dto/CategoryDTO.js').CategoryDTO>>}
   */
  async handleFindAll(pageable) {
    return this.categoryService.findAll(pageable);
  }

  /**
   * @param {import('../dto/CategoryDTO.js').CategoryDTO} dto
   * @returns {Promise<import('../dto/CategoryDTO.js').CategoryDTO>}
   */
  async handleInsert(dto) {
    return this.categoryService.insertCategory(dto);
  }

  /**
   * @param {number} id
   * @returns {Promise<void>}
   */
  async handleDelete(id) {
    return this.categoryService.deleteCategory(id);
  }

  /**
   * @param {import('../dto/CategoryDTO.js').CategoryDTO} dto
   * @param {number} id
   * @returns {Promise<import('../dto/CategoryDTO.js').CategoryDTO>}
   */
  async handleUpdate(dto, id) {
    return this.categoryService.updateCategory(dto, id);
  }
}
