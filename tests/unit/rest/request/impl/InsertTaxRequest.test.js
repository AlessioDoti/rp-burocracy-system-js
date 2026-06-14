import { describe, it, expect } from '@jest/globals';
import { InsertTaxRequest } from '../../../../../src/rest/request/impl/InsertTaxRequest.js';
import { BaseTaxRequest } from '../../../../../src/rest/request/BaseTaxRequest.js';

describe('InsertTaxRequest', () => {
  it('extends BaseTaxRequest and uses its defaults', () => {
    const req = new InsertTaxRequest();
    expect(req).toBeInstanceOf(BaseTaxRequest);
    expect(req.expenses).toBe(0);
    expect(req.earnings).toBe(0);
    expect(req.employeeUuid).toBeNull();
  });

  it('accepts expenses, earnings, and employeeUuid', () => {
    const req = new InsertTaxRequest({ expenses: 500, earnings: 3000, employeeUuid: 'uuid-abc' });
    expect(req.expenses).toBe(500);
    expect(req.earnings).toBe(3000);
    expect(req.employeeUuid).toBe('uuid-abc');
  });
});
