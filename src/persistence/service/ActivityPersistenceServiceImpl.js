/**
 * @fileoverview MySQL-backed implementation of the Activity
 * persistence port.
 *
 * Translates between the DTO shape the domain speaks and the row
 * shape the repository speaks.
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
   * Deletes an activity and every tax declaration filed against it,
   * atomically. See {@link ActivityRepository.deleteCascadingById} for
   * the transaction details.
   *
   * @param {number} id
   * @returns {Promise<void>}
   */
  async deleteActivity(id) {
    return this.activityRepository.deleteCascadingById(id);
  }
}
