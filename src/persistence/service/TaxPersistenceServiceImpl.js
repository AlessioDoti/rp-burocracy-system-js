/***
 * @fileoverview MySQL-backed implementation of the Tax persistence
 * port, including the "days elapsed since the last declaration"
 * derived query.
 */

import { Page } from '../../domain/dto/Page.js';
import { TaxPersistenceService } from '../../domain/port/persistence/TaxPersistenceService.js';

/**
 * @class TaxPersistenceServiceImpl
 * @classdesc Concrete adapter that maps DTOs to entities, calls the
 * repository, and maps the result back into a DTO page.
 */
export class TaxPersistenceServiceImpl extends TaxPersistenceService {
  /**
   * @param {import('../repository/TaxRepository.js').TaxRepository} taxRepository
   * @param {import('../mapper/TaxMapper.js').TaxMapper} taxMapper
   */
  constructor(taxRepository, taxMapper) {
    super();
    /** @property {import('../repository/TaxRepository.js').TaxRepository} */
    this.taxRepository = taxRepository;
    /** @property {import('../mapper/TaxMapper.js').TaxMapper} */
    this.taxMapper = taxMapper;
  }

  /**
   * @param {import('../../domain/dto/TaxDTO.js').TaxDTO} dto
   * @returns {Promise<import('../../domain/dto/TaxDTO.js').TaxDTO>}
   */
  async saveTax(dto) {
    const entity = await this.taxRepository.save(this.taxMapper.fromDTO(dto));
    return this.taxMapper.toDTO(entity);
  }

  /**
   * @param {number} id
   * @returns {Promise<import('../../domain/dto/TaxDTO.js').TaxDTO|null>}
   */
  async findTaxByID(id) {
    const entity = await this.taxRepository.findById(id);
    return this.taxMapper.toDTO(entity);
  }

  /**
   * @param {number|string} activity  Activity primary key.
   * @param {{ page: number, size: number, sort: { field: string, direction: 'asc'|'desc' }|null, offset: number }} pageable
   * @returns {Promise<import('../../domain/dto/Page.js').Page<import('../../domain/dto/TaxDTO.js').TaxDTO>>}
   */
  async findActivityTaxes(activity, pageable) {
    const { rows, total } = await this.taxRepository.findByActivityId(activity, pageable);
    return new Page(
      rows.map((r) => this.taxMapper.toDTO(r)),
      pageable.page,
      pageable.size,
      total
    );
  }

  /**
   * @param {{ page: number, size: number, sort: { field: string, direction: 'asc'|'desc' }|null, offset: number }} pageable
   * @returns {Promise<import('../../domain/dto/Page.js').Page<import('../../domain/dto/TaxDTO.js').TaxDTO>>}
   */
  async findAllTaxes(pageable) {
    const { rows, total } = await this.taxRepository.findAll(pageable);
    return new Page(
      rows.map((r) => this.taxMapper.toDTO(r)),
      pageable.page,
      pageable.size,
      total
    );
  }

  /**
   * Looks up the most recent declaration date for the given activity
   * and returns the number of whole days since then. Returns `0` when
   * no declaration has ever been filed for that activity.
   *
   * @param {string} activity
   * @returns {Promise<number>}
   */
  async getElapsedDays(activity) {
    const lastDeclaration = await this.taxRepository.findTopByActivityNameOrderByDeclarationDateDesc(activity);
    if (!lastDeclaration) return 0;

    const ms = Date.now() - lastDeclaration.getTime();
    return Math.max(0, Math.floor(ms / (1000 * 60 * 60 * 24)));
  }

  /**
   * @param {number|string} activityId
   * @returns {Promise<void>}
   */
  async deleteByActivityId(activityId) {
    await this.taxRepository.deleteByActivityId(activityId);
  }
}
