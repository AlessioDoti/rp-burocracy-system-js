import { describe, it, expect } from '@jest/globals';
import { UpdateTaxRequest } from '../../../../../src/rest/request/impl/UpdateTaxRequest.js';
import { BaseTaxRequest } from '../../../../../src/rest/request/BaseTaxRequest.js';

describe('UpdateTaxRequest', () => {
  it('extends BaseTaxRequest and leaves fields undefined when omitted', () => {
    const req = new UpdateTaxRequest();
    expect(req).toBeInstanceOf(BaseTaxRequest);
    expect(req.expenses).toBeUndefined();
    expect(req.earnings).toBeUndefined();
    expect(req.payed).toBeUndefined();
    expect(req.elapsedDays).toBeUndefined();
  });

  it('accepts all patch fields', () => {
    const req = new UpdateTaxRequest({ expenses: 100, earnings: 500, payed: true, elapsedDays: 3 });
    expect(req.expenses).toBe(100);
    expect(req.earnings).toBe(500);
    expect(req.payed).toBe(true);
    expect(req.elapsedDays).toBe(3);
  });

  it('accepts partial patch (only payed)', () => {
    const req = new UpdateTaxRequest({ payed: false });
    expect(req.payed).toBe(false);
    expect(req.expenses).toBeUndefined();
    expect(req.earnings).toBeUndefined();
    expect(req.elapsedDays).toBeUndefined();
  });
});
