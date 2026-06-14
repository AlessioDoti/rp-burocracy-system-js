import { describe, it, expect } from '@jest/globals';
import { CategoryTaxDTO } from '../../../../src/domain/dto/CategoryTaxDTO.js';

describe('CategoryTaxDTO', () => {
  it('uses defaults for omitted props', () => {
    const dto = new CategoryTaxDTO();
    expect(dto.id).toBeNull();
    expect(dto.amount).toBe(0);
    expect(dto.rate).toBe(0);
  });

  it('accepts all fields via constructor', () => {
    const dto = new CategoryTaxDTO({ id: 5, amount: 1000, rate: 15 });
    expect(dto.id).toBe(5);
    expect(dto.amount).toBe(1000);
    expect(dto.rate).toBe(15);
  });

  it('allows null id for not-yet-persisted brackets', () => {
    const dto = new CategoryTaxDTO({ amount: 500, rate: 10 });
    expect(dto.id).toBeNull();
  });
});
