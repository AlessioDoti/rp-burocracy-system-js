/**
 * @fileoverview MySQL-backed implementation of the Category
 * persistence port.
 */

import { Page } from '../../domain/dto/Page.js';
import { CategoryPersistenceService } from '../../domain/port/persistence/CategoryPersistenceService.js';

/**
 * @class CategoryPersistenceServiceImpl
 * @classdesc Concrete adapter that maps DTOs to entities, calls the
 * repository, and maps the result back into a DTO page.
 */
export class CategoryPersistenceServiceImpl extends CategoryPersistenceService {
  /**
   * @param {import('../repository/CategoryRepository.js').CategoryRepository} categoryRepository
   * @param {import('../mapper/CategoryMapper.js').CategoryMapper} categoryMapper
   */
  constructor(categoryRepository, categoryMapper) {
    super();
    /** @property {import('../repository/CategoryRepository.js').CategoryRepository} */
    this.categoryRepository = categoryRepository;
    /** @property {import('../mapper/CategoryMapper.js').CategoryMapper} */
    this.categoryMapper = categoryMapper;
  }

  /**
   * @param {import('../../domain/dto/CategoryDTO.js').CategoryDTO} dto
   * @returns {Promise<import('../../domain/dto/CategoryDTO.js').CategoryDTO>}
   */
  async saveCategory(dto) {
    const entity = await this.categoryRepository.save(this.categoryMapper.fromDTO(dto));
    return this.categoryMapper.toDTO(entity);
  }

  /**
   * @param {number} id
   * @returns {Promise<import('../../domain/dto/CategoryDTO.js').CategoryDTO|null>}
   */
  async findByID(id) {
    const entity = await this.categoryRepository.findById(id);
    return this.categoryMapper.toDTO(entity);
  }

  /**
   * @param {number} id
   * @returns {Promise<void>}
   */
  async deleteCategory(id) {
    return this.categoryRepository.deleteById(id);
  }

  /**
   * @param {{ page: number, size: number, sort: { field: string, direction: 'asc'|'desc' }|null, offset: number }} pageable
   * @returns {Promise<import('../../domain/dto/Page.js').Page<import('../../domain/dto/CategoryDTO.js').CategoryDTO>>}
   */
  async findAll(pageable) {
    const { rows, total } = await this.categoryRepository.findAll(pageable);
    return new Page(
      rows.map((r) => this.categoryMapper.toDTO(r)),
      pageable.page,
      pageable.size,
      total
    );
  }
}
