import { describe, it, expect } from '@jest/globals';
import { CategoryDTO } from '../../../../src/domain/dto/CategoryDTO.js';
import { CategoryTaxDTO } from '../../../../src/domain/dto/CategoryTaxDTO.js';

describe('CategoryDTO', () => {
  it('uses defaults for omitted props', () => {
    const dto = new CategoryDTO();
    expect(dto.id).toBeNull();
    expect(dto.name).toBeNull();
    expect(dto.categoryTaxes).toEqual([]);
  });

  it('accepts all fields via constructor', () => {
    const taxes = [
      new CategoryTaxDTO({ id: 1, amount: 0, rate: 10 }),
      new CategoryTaxDTO({ id: 2, amount: 1000, rate: 20 })
    ];
    const dto = new CategoryDTO({ id: 7, name: 'food', categoryTaxes: taxes });

    expect(dto.id).toBe(7);
    expect(dto.name).toBe('food');
    expect(dto.categoryTaxes).toHaveLength(2);
    expect(dto.categoryTaxes[0]).toBeInstanceOf(CategoryTaxDTO);
    expect(dto.categoryTaxes[0].amount).toBe(0);
  });
});
