/***
 * @fileoverview Maps between `CategoryTax` (persistence row) and
 * `CategoryTaxDTO` (domain object).
 */

import { CategoryTax } from '../entity/CategoryTax.js';
import { CategoryTaxDTO } from '../../domain/dto/CategoryTaxDTO.js';

/**
 * @class CategoryTaxMapper
 * @classdesc Bidirectional mapper for a single tax bracket.
 */
export class CategoryTaxMapper {
  /**
   * @param {import('../../domain/dto/CategoryTaxDTO.js').CategoryTaxDTO|null|undefined} dto
   * @returns {CategoryTax|null}
   */
  fromDTO(dto) {
    if (!dto) return null;
    return new CategoryTax({
      id: dto.id,
      amount: dto.amount,
      rate: dto.rate
    });
  }

  /**
   * @param {CategoryTax|null|undefined} entity
   * @returns {import('../../domain/dto/CategoryTaxDTO.js').CategoryTaxDTO|null}
   */
  toDTO(entity) {
    if (!entity) return null;
    return new CategoryTaxDTO({
      id: entity.id,
      amount: entity.amount,
      rate: entity.rate
    });
  }
}
