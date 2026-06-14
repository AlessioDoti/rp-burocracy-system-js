import { describe, it, expect } from '@jest/globals';
import { Category } from '../../../../src/persistence/entity/Category.js';
import { CategoryTax } from '../../../../src/persistence/entity/CategoryTax.js';

describe('Category entity', () => {
  it('uses defaults for omitted props', () => {
    const entity = new Category();
    expect(entity.id).toBeNull();
    expect(entity.name).toBeNull();
    expect(entity.categoryTaxes).toEqual([]);
  });

  it('accepts all fields via constructor', () => {
    const taxes = [new CategoryTax({ id: 1, amount: 0, rate: 10 })];
    const entity = new Category({ id: 7, name: 'food', categoryTaxes: taxes });
    expect(entity.id).toBe(7);
    expect(entity.name).toBe('food');
    expect(entity.categoryTaxes).toHaveLength(1);
    expect(entity.categoryTaxes[0]).toBeInstanceOf(CategoryTax);
  });
});
