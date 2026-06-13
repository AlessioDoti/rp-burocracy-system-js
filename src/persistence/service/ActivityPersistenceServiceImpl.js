/**
 * @fileoverview MySQL-backed implementation of the Activity
 * persistence port.
 */

import { Page } from '../../domain/dto/Page.js';
import { ActivityPersistenceService } from '../../domain/port/persistence/ActivityPersistenceService.js';

/**
 * @class ActivityPersistenceServiceImpl
 * @classdesc Concrete adapter that maps DTOs to entities, calls the
 * repository, and maps the result back into a DTO page.
 */
export class ActivityPersistenceServiceImpl extends ActivityPersistenceService {
  /**
   * @param {import('../repository/ActivityRepository.js').ActivityRepository} activityRepository
   * @param {import('../mapper/ActivityMapper.js').ActivityMapper} activityMapper
   */
  constructor(activityRepository, activityMapper) {
    super();
    /** @property {import('../repository/ActivityRepository.js').ActivityRepository} */
    this.activityRepository = activityRepository;
    /** @property {import('../mapper/ActivityMapper.js').ActivityMapper} */
    this.activityMapper = activityMapper;
  }

  /**
   * @param {{ page: number, size: number, sort: { field: string, direction: 'asc'|'desc' }|null, offset: number }} pageable
   * @returns {Promise<import('../../domain/dto/Page.js').Page<import('../../domain/dto/ActivityDTO.js').ActivityDTO>>}
   */
  async findAll(pageable) {
    const { rows, total } = await this.activityRepository.findAll(pageable);
    return new Page(
      rows.map((r) => this.activityMapper.toDTO(r)),
      pageable.page,
      pageable.size,
      total
    );
  }

  /**
   * @param {import('../../domain/dto/ActivityDTO.js').ActivityDTO} dto
   * @returns {Promise<import('../../domain/dto/ActivityDTO.js').ActivityDTO>}
   */
  async saveActivity(dto) {
    const entity = await this.activityRepository.save(this.activityMapper.fromDTO(dto));
    return this.activityMapper.toDTO(entity);
  }

  /**
   * @param {number} id
   * @returns {Promise<import('../../domain/dto/ActivityDTO.js').ActivityDTO|null>}
   */
  async findByID(id) {
    const entity = await this.activityRepository.findById(id);
    return this.activityMapper.toDTO(entity);
  }

  /**
   * @param {number} id
   * @returns {Promise<void>}
   */
  async deleteActivity(id) {
    return this.activityRepository.deleteCascadingById(id);
  }

  /**
   * @param {number} activityId
   * @param {Array<{ employeeUuid: string, role: string }>} employees
   * @returns {Promise<void>}
   */
  async addEmployees(activityId, employees) {
    return this.activityRepository.addEmployees(activityId, employees);
  }

  /**
   * @param {number} activityId
   * @param {string[]} employeeUuids
   * @returns {Promise<void>}
   */
  async removeEmployees(activityId, employeeUuids) {
    return this.activityRepository.removeEmployees(activityId, employeeUuids);
  }

  /**
   * @param {number} activityId
   * @param {Array<{ employeeUuid: string, role: string }>} employees
   * @returns {Promise<void>}
   */
  async replaceEmployees(activityId, employees) {
    return this.activityRepository.replaceEmployees(activityId, employees);
  }

  /**
   * @param {string} employeeUuid
   * @returns {Promise<import('../../domain/dto/ActivityDTO.js').ActivityDTO[]>}
   */
  async findByEmployeeUuid(employeeUuid) {
    const entities = await this.activityRepository.findByEmployeeUuid(employeeUuid);
    return entities.map((e) => this.activityMapper.toDTO(e));
  }

  /**
   * @param {number} activityId
   * @param {string} employeeUuid
   * @returns {Promise<boolean>}
   */
  async hasEmployee(activityId, employeeUuid) {
    return this.activityRepository.hasEmployee(activityId, employeeUuid);
  }
}
