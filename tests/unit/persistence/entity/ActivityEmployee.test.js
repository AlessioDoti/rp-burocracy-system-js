import { describe, it, expect } from '@jest/globals';
import { ActivityEmployee } from '../../../../src/persistence/entity/ActivityEmployee.js';

describe('ActivityEmployee entity', () => {
  it('uses defaults for omitted props', () => {
    const entity = new ActivityEmployee();
    expect(entity.id).toBeNull();
    expect(entity.activityId).toBeNull();
    expect(entity.employeeUuid).toBeNull();
    expect(entity.role).toBeNull();
  });

  it('accepts all fields via constructor', () => {
    const entity = new ActivityEmployee({ id: 1, activityId: 5, employeeUuid: 'uuid-abc', role: 'MANAGER' });
    expect(entity.id).toBe(1);
    expect(entity.activityId).toBe(5);
    expect(entity.employeeUuid).toBe('uuid-abc');
    expect(entity.role).toBe('MANAGER');
  });
});
