/**
 * @fileoverview Maps between `Activity` (persistence row) and
 * `ActivityDTO` (domain object).
 */

import { Activity } from '../entity/Activity.js';
import { ActivityDTO } from '../../domain/dto/ActivityDTO.js';
import { ActivityEmployeeDTO } from '../../domain/dto/ActivityEmployeeDTO.js';
import { ActivityEmployee } from '../entity/ActivityEmployee.js';

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
   * Domain DTO → persistence entity.
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
      category: this.categoryMapper.fromDTO(dto.category),
      employees: (dto.employees || []).map((e) => new ActivityEmployee({
        employeeUuid: e.employeeUuid,
        role: e.role
      }))
    });
  }

  /**
   * Persistence entity → domain DTO.
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
      employees: (entity.employees || []).map((e) => new ActivityEmployeeDTO({
        employeeUuid: e.employeeUuid,
        role: e.role
      }))
    });
  }
}
