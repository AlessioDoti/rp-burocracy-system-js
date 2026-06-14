import { describe, it, expect } from '@jest/globals';
import { CategoryTaxRequest } from '../../../../../src/rest/request/impl/CategoryTaxRequest.js';

describe('CategoryTaxRequest', () => {
  it('uses defaults for omitted props', () => {
    const req = new CategoryTaxRequest();
    expect(req.amount).toBe(0);
    expect(req.rate).toBe(0);
  });

  it('accepts amount and rate', () => {
    const req = new CategoryTaxRequest({ amount: 500, rate: 10 });
    expect(req.amount).toBe(500);
    expect(req.rate).toBe(10);
  });
});
