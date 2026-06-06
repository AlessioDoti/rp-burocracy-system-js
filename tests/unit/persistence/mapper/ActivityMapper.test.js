import { describe, it, expect } from '@jest/globals';
import { ActivityMapper } from '../../../../src/persistence/mapper/ActivityMapper.js';
import { CategoryMapper } from '../../../../src/persistence/mapper/CategoryMapper.js';
import { CategoryTaxMapper } from '../../../../src/persistence/mapper/CategoryTaxMapper.js';
import { ActivityDTO } from '../../../../src/domain/dto/ActivityDTO.js';
import { CategoryDTO } from '../../../../src/domain/dto/CategoryDTO.js';
import { Activity } from '../../../../src/persistence/entity/Activity.js';
import { Category } from '../../../../src/persistence/entity/Category.js';

describe('ActivityMapper', () => {
  const mapper = new ActivityMapper(new CategoryMapper(new CategoryTaxMapper()));

  it('maps an ActivityDTO to an Activity entity (delegating category)', () => {
    const dto = new ActivityDTO({
      id: 1,
      name: 'shop',
      address: 42,
      category: new CategoryDTO({ id: 7, name: 'retail' })
    });
    const entity = mapper.fromDTO(dto);
    expect(entity).toBeInstanceOf(Activity);
    expect(entity.id).toBe(1);
    expect(entity.name).toBe('shop');
    expect(entity.address).toBe(42);
    expect(entity.category).toBeInstanceOf(Category);
    expect(entity.category.id).toBe(7);
  });

  it('maps an Activity entity to an ActivityDTO (delegating category)', () => {
    const entity = new Activity({
      id: 1,
      name: 'shop',
      address: 42,
      category: new Category({ id: 7, name: 'retail' })
    });
    const dto = mapper.toDTO(entity);
    expect(dto).toBeInstanceOf(ActivityDTO);
    expect(dto.id).toBe(1);
    expect(dto.category).toBeInstanceOf(CategoryDTO);
    expect(dto.category.id).toBe(7);
  });

  it('returns null when input is null/undefined', () => {
    expect(mapper.fromDTO(null)).toBeNull();
    expect(mapper.toDTO(null)).toBeNull();
  });
});
