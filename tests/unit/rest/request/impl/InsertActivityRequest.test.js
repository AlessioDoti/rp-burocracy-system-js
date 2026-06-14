import { describe, it, expect } from '@jest/globals';
import { InsertActivityRequest } from '../../../../../src/rest/request/impl/InsertActivityRequest.js';
import { BaseActivityRequest } from '../../../../../src/rest/request/BaseActivityRequest.js';

describe('InsertActivityRequest', () => {
  it('extends BaseActivityRequest and uses its defaults', () => {
    const req = new InsertActivityRequest();
    expect(req).toBeInstanceOf(BaseActivityRequest);
    expect(req.name).toBeNull();
    expect(req.address).toBe(0);
    expect(req.employees).toEqual([]);
  });

  it('accepts name, address, and employees', () => {
    const req = new InsertActivityRequest({
      name: 'shop',
      address: 42,
      employees: [{ employeeUuid: 'abc', role: 'MANAGER' }]
    });
    expect(req.name).toBe('shop');
    expect(req.address).toBe(42);
    expect(req.employees).toHaveLength(1);
  });
});
