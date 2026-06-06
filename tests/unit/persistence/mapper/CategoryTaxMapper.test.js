import { describe, it, expect } from '@jest/globals';
import { CategoryTaxMapper } from '../../../../src/persistence/mapper/CategoryTaxMapper.js';
import { CategoryTaxDTO } from '../../../../src/domain/dto/CategoryTaxDTO.js';
import { CategoryTax } from '../../../../src/persistence/entity/CategoryTax.js';

describe('CategoryTaxMapper', () => {
  const mapper = new CategoryTaxMapper();

  it('maps a DTO to an entity, preserving all fields', () => {
    const dto = new CategoryTaxDTO({ id: 1, amount: 1000, rate: 15 });
    const entity = mapper.fromDTO(dto);
    expect(entity).toBeInstanceOf(CategoryTax);
    expect(entity.id).toBe(1);
    expect(entity.amount).toBe(1000);
    expect(entity.rate).toBe(15);
  });

  it('maps an entity to a DTO, preserving all fields', () => {
    const entity = new CategoryTax({ id: 5, amount: 500, rate: 10 });
    const dto = mapper.toDTO(entity);
    expect(dto).toBeInstanceOf(CategoryTaxDTO);
    expect(dto.id).toBe(5);
    expect(dto.amount).toBe(500);
    expect(dto.rate).toBe(10);
  });

  it('returns null when mapping a nullish DTO', () => {
    expect(mapper.fromDTO(null)).toBeNull();
    expect(mapper.fromDTO(undefined)).toBeNull();
  });

  it('returns null when mapping null entity', () => {
    expect(mapper.toDTO(null)).toBeNull();
    expect(mapper.toDTO(undefined)).toBeNull();
  });
});
