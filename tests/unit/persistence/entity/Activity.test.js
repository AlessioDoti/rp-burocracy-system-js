import { describe, it, expect } from '@jest/globals';
import { Activity } from '../../../../src/persistence/entity/Activity.js';
import { Category } from '../../../../src/persistence/entity/Category.js';
import { ActivityEmployee } from '../../../../src/persistence/entity/ActivityEmployee.js';

describe('Activity entity', () => {
  it('uses defaults for omitted props', () => {
    const entity = new Activity();
    expect(entity.id).toBeNull();
    expect(entity.name).toBeNull();
    expect(entity.address).toBe(0);
    expect(entity.category).toBeNull();
    expect(entity.employees).toEqual([]);
  });

  it('accepts all fields via constructor', () => {
    const category = new Category({ id: 1, name: 'food' });
    const employees = [new ActivityEmployee({ id: 1, employeeUuid: 'abc', role: 'MANAGER' })];
    const entity = new Activity({ id: 5, name: 'shop', address: 42, category, employees });

    expect(entity.id).toBe(5);
    expect(entity.name).toBe('shop');
    expect(entity.address).toBe(42);
    expect(entity.category).toBeInstanceOf(Category);
    expect(entity.employees).toHaveLength(1);
    expect(entity.employees[0]).toBeInstanceOf(ActivityEmployee);
  });
});
