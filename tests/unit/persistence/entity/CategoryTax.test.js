import { describe, it, expect } from '@jest/globals';
import { CategoryTax } from '../../../../src/persistence/entity/CategoryTax.js';
import { Category } from '../../../../src/persistence/entity/Category.js';

describe('CategoryTax entity', () => {
  it('uses defaults for omitted props', () => {
    const entity = new CategoryTax();
    expect(entity.id).toBeNull();
    expect(entity.amount).toBe(0);
    expect(entity.rate).toBe(0);
    expect(entity.category).toBeNull();
  });

  it('accepts all fields via constructor', () => {
    const category = new Category({ id: 1 });
    const entity = new CategoryTax({ id: 5, amount: 1000, rate: 15, category });
    expect(entity.id).toBe(5);
    expect(entity.amount).toBe(1000);
    expect(entity.rate).toBe(15);
    expect(entity.category).toBeInstanceOf(Category);
  });
});
