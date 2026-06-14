import { describe, it, expect } from '@jest/globals';
import { BaseActivityRequest } from '../../../../src/rest/request/BaseActivityRequest.js';

describe('BaseActivityRequest', () => {
  it('uses defaults for omitted props', () => {
    const req = new BaseActivityRequest();
    expect(req.name).toBeNull();
    expect(req.address).toBe(0);
    expect(req.employees).toEqual([]);
  });

  it('accepts all fields via constructor', () => {
    const employees = [{ employeeUuid: 'abc', role: 'MANAGER' }];
    const req = new BaseActivityRequest({ name: 'shop', address: 42, employees });
    expect(req.name).toBe('shop');
    expect(req.address).toBe(42);
    expect(req.employees).toEqual(employees);
  });
});
