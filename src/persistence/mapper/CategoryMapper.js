/**
 * @fileoverview Maps between `Category` (persistence row) and
 * `CategoryDTO` (domain object), delegating per-bracket conversion to
 * `CategoryTaxMapper`.
 */

import { Category } from '../entity/Category.js';
import { CategoryDTO } from '../../domain/dto/CategoryDTO.js';

/**
 * @class CategoryMapper
 * @classdesc Bidirectional mapper for the Category aggregate.
 */
export class CategoryMapper {
  /**
   * @param {import('./CategoryTaxMapper.js').CategoryTaxMapper} categoryTaxMapper
   */
  constructor(categoryTaxMapper) {
    /** @property {import('./CategoryTaxMapper.js').CategoryTaxMapper} */
    this.categoryTaxMapper = categoryTaxMapper;
  }

  /**
   * @param {import('../../domain/dto/CategoryDTO.js').CategoryDTO|null|undefined} dto
   * @returns {Category|null}
   */
  fromDTO(dto) {
    if (!dto) return null;
    return new Category({
      id: dto.id,
      name: dto.name,
      categoryTaxes: (dto.categoryTaxes || []).map((t) => this.categoryTaxMapper.fromDTO(t))
    });
  }

  /**
   * @param {Category|null|undefined} entity
   * @returns {import('../../domain/dto/CategoryDTO.js').CategoryDTO|null}
   */
  toDTO(entity) {
    if (!entity) return null;
    return new CategoryDTO({
      id: entity.id,
      name: entity.name,
      categoryTaxes: (entity.categoryTaxes || []).map((t) => this.categoryTaxMapper.toDTO(t))
    });
  }
}
