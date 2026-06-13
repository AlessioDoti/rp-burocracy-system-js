/**
 * @fileoverview Maps between `Tax` (persistence row) and `TaxDTO`
 * (domain object). The person UUID is stored as a scalar column
 * on the row side and carried as a plain string on the DTO.
 */

import { Tax } from '../entity/Tax.js';
import { TaxDTO } from '../../domain/dto/TaxDTO.js';

/**
 * @class TaxMapper
 * @classdesc Bidirectional mapper for the Tax aggregate.
 */
export class TaxMapper {
  /**
   * @param {import('./ActivityMapper.js').ActivityMapper} activityMapper
   */
  constructor(activityMapper) {
    /** @property {import('./ActivityMapper.js').ActivityMapper} */
    this.activityMapper = activityMapper;
  }

  /**
   * Domain DTO → persistence entity.
   *
   * @param {import('../../domain/dto/TaxDTO.js').TaxDTO|null|undefined} dto
   * @returns {Tax|null}
   */
  fromDTO(dto) {
    if (!dto) return null;
    return new Tax({
      id: dto.taxId,
      activity: this.activityMapper.fromDTO(dto.activity),
      personUuid: dto.manager ?? null,
      expenses: dto.expenses,
      earnings: dto.earnings,
      revenue: dto.revenue,
      taxAmount: dto.taxAmount,
      elapsedDays: dto.elapsedDays,
      elapsedBillAmount: dto.elapsedBillAmount,
      taxableIncome: dto.taxableIncome,
      declarationDate: dto.declarationDate,
      payed: dto.payed
    });
  }

  /**
   * Persistence entity → domain DTO. The person UUID is carried as a
   * plain string in the `manager` field.
   *
   * @param {Tax|null|undefined} entity
   * @returns {import('../../domain/dto/TaxDTO.js').TaxDTO|null}
   */
  toDTO(entity) {
    if (!entity) return null;
    return new TaxDTO({
      taxId: entity.id,
      activity: this.activityMapper.toDTO(entity.activity),
      manager: entity.personUuid,
      expenses: entity.expenses,
      earnings: entity.earnings,
      revenue: entity.revenue,
      taxAmount: entity.taxAmount,
      elapsedDays: entity.elapsedDays,
      elapsedBillAmount: entity.elapsedBillAmount,
      taxableIncome: entity.taxableIncome,
      declarationDate: entity.declarationDate,
      payed: entity.payed
    });
  }
}
