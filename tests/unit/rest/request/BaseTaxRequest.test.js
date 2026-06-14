import { describe, it, expect } from '@jest/globals';
import { BaseTaxRequest } from '../../../../src/rest/request/BaseTaxRequest.js';

describe('BaseTaxRequest', () => {
  it('leaves fields undefined when omitted (PATCH semantics)', () => {
    const req = new BaseTaxRequest();
    expect(req.expenses).toBeUndefined();
    expect(req.earnings).toBeUndefined();
  });

  it('accepts expenses and earnings', () => {
    const req = new BaseTaxRequest({ expenses: 500, earnings: 3000 });
    expect(req.expenses).toBe(500);
    expect(req.earnings).toBe(3000);
  });
});
