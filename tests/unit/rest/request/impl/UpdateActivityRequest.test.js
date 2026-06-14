import { describe, it, expect } from '@jest/globals';
import { UpdateActivityRequest } from '../../../../../src/rest/request/impl/UpdateActivityRequest.js';

describe('UpdateActivityRequest', () => {
  it('leaves all fields undefined when omitted (PATCH semantics)', () => {
    const req = new UpdateActivityRequest();
    expect(req.name).toBeUndefined();
    expect(req.address).toBeUndefined();
    expect(req.category).toBeUndefined();
    expect(req.employees).toBeUndefined();
  });

  it('accepts optional fields', () => {
    const req = new UpdateActivityRequest({
      name: 'renamed',
      address: 99,
      category: 3,
      employees: [{ employeeUuid: 'abc', role: 'MANAGER' }]
    });
    expect(req.name).toBe('renamed');
    expect(req.address).toBe(99);
    expect(req.category).toBe(3);
    expect(req.employees).toHaveLength(1);
  });

  it('accepts partial patch (only name)', () => {
    const req = new UpdateActivityRequest({ name: 'renamed' });
    expect(req.name).toBe('renamed');
    expect(req.address).toBeUndefined();
    expect(req.category).toBeUndefined();
  });
});
