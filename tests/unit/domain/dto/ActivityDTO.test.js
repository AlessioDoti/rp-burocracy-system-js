import { describe, it, expect } from '@jest/globals';
import { ActivityDTO } from '../../../../src/domain/dto/ActivityDTO.js';
import { CategoryDTO } from '../../../../src/domain/dto/CategoryDTO.js';
import { ActivityEmployeeDTO } from '../../../../src/domain/dto/ActivityEmployeeDTO.js';

describe('ActivityDTO', () => {
  it('uses defaults for omitted props', () => {
    const dto = new ActivityDTO();
    expect(dto.id).toBeNull();
    expect(dto.name).toBeNull();
    expect(dto.address).toBe(0);
    expect(dto.category).toBeNull();
    expect(dto.employees).toEqual([]);
  });

  it('accepts all fields via constructor', () => {
    const category = new CategoryDTO({ id: 1, name: 'food' });
    const employees = [new ActivityEmployeeDTO({ employeeUuid: 'abc', role: 'MANAGER' })];
    const dto = new ActivityDTO({ id: 5, name: 'shop', address: 42, category, employees });

    expect(dto.id).toBe(5);
    expect(dto.name).toBe('shop');
    expect(dto.address).toBe(42);
    expect(dto.category).toBeInstanceOf(CategoryDTO);
    expect(dto.category.name).toBe('food');
    expect(dto.employees).toHaveLength(1);
    expect(dto.employees[0]).toBeInstanceOf(ActivityEmployeeDTO);
  });

  it('preserves null category', () => {
    const dto = new ActivityDTO({ category: null });
    expect(dto.category).toBeNull();
  });
});
