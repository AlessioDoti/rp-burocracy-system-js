/**
 * @fileoverview Maps between `Tax` (persistence row) and `TaxDTO`
 * (domain object). The Person snapshot is flattened into three scalar
 * columns on the row side and rebuilt into a `PersonDTO` on the DTO
 * side.
 */

import { Tax } from '../entity/Tax.js';
import { TaxDTO } from '../../domain/dto/TaxDTO.js';
import { PersonDTO } from '../../domain/dto/PersonDTO.js';

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
   * Domain DTO → persistence entity. The Person DTO is denormalised
   * into three columns (`managerName`, `managerSurname`,
   * `managerRole`); a missing `manager` is preserved as `null`s.
   *
   * @param {import('../../domain/dto/TaxDTO.js').TaxDTO|null|undefined} dto
   * @returns {Tax|null}
   */
  fromDTO(dto) {
    if (!dto) return null;
    return new Tax({
      id: dto.taxId,
      activity: this.activityMapper.fromDTO(dto.activity),
      managerName: dto.manager?.name ?? null,
      managerSurname: dto.manager?.surname ?? null,
      managerRole: dto.manager?.role ?? null,
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
   * Persistence entity → domain DTO. The three manager columns are
   * reassembled into a `PersonDTO`.
   *
   * @param {Tax|null|undefined} entity
   * @returns {import('../../domain/dto/TaxDTO.js').TaxDTO|null}
   */
  toDTO(entity) {
    if (!entity) return null;
    return new TaxDTO({
      taxId: entity.id,
      activity: this.activityMapper.toDTO(entity.activity),
      manager: new PersonDTO({
        name: entity.managerName,
        surname: entity.managerSurname,
        role: entity.managerRole
      }),
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
