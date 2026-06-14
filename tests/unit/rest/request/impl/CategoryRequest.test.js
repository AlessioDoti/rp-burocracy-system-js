import { describe, it, expect } from '@jest/globals';
import { CategoryRequest } from '../../../../../src/rest/request/impl/CategoryRequest.js';
import { CategoryTaxRequest } from '../../../../../src/rest/request/impl/CategoryTaxRequest.js';

describe('CategoryRequest', () => {
  it('uses defaults for omitted props', () => {
    const req = new CategoryRequest();
    expect(req.name).toBeNull();
    expect(req.categoryTaxes).toEqual([]);
  });

  it('accepts name and categoryTaxes', () => {
    const taxes = [new CategoryTaxRequest({ amount: 100, rate: 5 })];
    const req = new CategoryRequest({ name: 'food', categoryTaxes: taxes });
    expect(req.name).toBe('food');
    expect(req.categoryTaxes).toHaveLength(1);
    expect(req.categoryTaxes[0]).toBeInstanceOf(CategoryTaxRequest);
  });
});
