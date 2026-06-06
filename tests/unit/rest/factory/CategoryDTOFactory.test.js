import { describe, it, expect } from '@jest/globals';
import { CategoryDTOFactory } from '../../../../src/rest/factory/CategoryDTOFactory.js';
import { CategoryRequest } from '../../../../src/rest/request/impl/CategoryRequest.js';
import { CategoryTaxRequest } from '../../../../src/rest/request/impl/CategoryTaxRequest.js';

describe('CategoryDTOFactory', () => {
  const factory = new CategoryDTOFactory();

  it('builds a CategoryDTO with mapped categoryTaxes', () => {
    const req = new CategoryRequest({
      name: 'food',
      categoryTaxes: [
        new CategoryTaxRequest({ amount: 100, rate: 5 }),
        new CategoryTaxRequest({ amount: 500, rate: 10 })
      ]
    });
    const dto = factory.getDTO(req);
    expect(dto.name).toBe('food');
    expect(dto.categoryTaxes).toHaveLength(2);
    expect(dto.categoryTaxes[0].amount).toBe(100);
    expect(dto.categoryTaxes[0].rate).toBe(5);
  });
});
