import { describe, it, expect } from '@jest/globals';
import { ActivityEmployeeDTO } from '../../../../src/domain/dto/ActivityEmployeeDTO.js';

describe('ActivityEmployeeDTO', () => {
  it('uses defaults for omitted props', () => {
    const dto = new ActivityEmployeeDTO();
    expect(dto.employeeUuid).toBeNull();
    expect(dto.role).toBeNull();
  });

  it('accepts all fields via constructor', () => {
    const dto = new ActivityEmployeeDTO({ employeeUuid: 'uuid-123', role: 'MANAGER' });
    expect(dto.employeeUuid).toBe('uuid-123');
    expect(dto.role).toBe('MANAGER');
  });
});
