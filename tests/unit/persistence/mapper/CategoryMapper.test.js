import { describe, it, expect } from '@jest/globals';
import { CategoryMapper } from '../../../../src/persistence/mapper/CategoryMapper.js';
import { CategoryTaxMapper } from '../../../../src/persistence/mapper/CategoryTaxMapper.js';
import { CategoryDTO } from '../../../../src/domain/dto/CategoryDTO.js';
import { CategoryTaxDTO } from '../../../../src/domain/dto/CategoryTaxDTO.js';
import { Category } from '../../../../src/persistence/entity/Category.js';
import { CategoryTax } from '../../../../src/persistence/entity/CategoryTax.js';

describe('CategoryMapper', () => {
  const mapper = new CategoryMapper(new CategoryTaxMapper());

  it('maps a CategoryDTO to a Category entity (including categoryTaxes)', () => {
    const dto = new CategoryDTO({
      id: 1,
      name: 'food',
      categoryTaxes: [new CategoryTaxDTO({ id: 10, amount: 100, rate: 5 })]
    });

    const entity = mapper.fromDTO(dto);

    expect(entity).toBeInstanceOf(Category);
    expect(entity.id).toBe(1);
    expect(entity.name).toBe('food');
    expect(entity.categoryTaxes).toHaveLength(1);
    expect(entity.categoryTaxes[0]).toBeInstanceOf(CategoryTax);
    expect(entity.categoryTaxes[0].amount).toBe(100);
  });

  it('maps a Category entity to a CategoryDTO (including categoryTaxes)', () => {
    const entity = new Category({
      id: 7,
      name: 'tech',
      categoryTaxes: [new CategoryTax({ id: 2, amount: 200, rate: 20 })]
    });

    const dto = mapper.toDTO(entity);

    expect(dto).toBeInstanceOf(CategoryDTO);
    expect(dto.id).toBe(7);
    expect(dto.name).toBe('tech');
    expect(dto.categoryTaxes[0]).toBeInstanceOf(CategoryTaxDTO);
  });

  it('handles empty categoryTaxes list', () => {
    const dto = new CategoryDTO({ id: 1, name: 'x' });
    const entity = mapper.fromDTO(dto);
    expect(entity.categoryTaxes).toEqual([]);
  });

  it('returns null when input is null/undefined', () => {
    expect(mapper.fromDTO(null)).toBeNull();
    expect(mapper.toDTO(null)).toBeNull();
  });
});
