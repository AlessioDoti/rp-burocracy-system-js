/**
 * @fileoverview Maps between `Activity` (persistence row) and
 * `ActivityDTO` (domain object). Delegated to `CategoryMapper` for
 * the nested category.
 */

import { Activity } from '../entity/Activity.js';
import { ActivityDTO } from '../../domain/dto/ActivityDTO.js';

/**
 * @class ActivityMapper
 * @classdesc Bidirectional mapper for the Activity aggregate.
 */
export class ActivityMapper {
  /**
   * @param {import('./CategoryMapper.js').CategoryMapper} categoryMapper
   */
  constructor(categoryMapper) {
    /** @property {import('./CategoryMapper.js').CategoryMapper} */
    this.categoryMapper = categoryMapper;
  }

  /**
   * Domain DTO → persistence entity. Returns `null` for a falsy input
   * (the repositories rely on this short-circuit to keep `null`s
   * flowing through).
   *
   * @param {import('../../domain/dto/ActivityDTO.js').ActivityDTO|null|undefined} dto
   * @returns {Activity|null}
   */
  fromDTO(dto) {
    if (!dto) return null;
    return new Activity({
      id: dto.id,
      name: dto.name,
      address: dto.address,
      category: this.categoryMapper.fromDTO(dto.category)
    });
  }

  /**
   * Persistence entity → domain DTO. The DTO's `management` list is
   * initialised to `[]` because the persistence layer does not store
   * it (the Person system is still mocked).
   *
   * @param {Activity|null|undefined} entity
   * @returns {import('../../domain/dto/ActivityDTO.js').ActivityDTO|null}
   */
  toDTO(entity) {
    if (!entity) return null;
    return new ActivityDTO({
      id: entity.id,
      name: entity.name,
      address: entity.address,
      category: this.categoryMapper.toDTO(entity.category),
      management: []
    });
  }
}
