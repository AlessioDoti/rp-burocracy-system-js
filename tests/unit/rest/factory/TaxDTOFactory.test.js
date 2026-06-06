import { describe, it, expect } from '@jest/globals';
import { TaxDTOFactory } from '../../../../src/rest/factory/TaxDTOFactory.js';
import { InsertTaxRequest } from '../../../../src/rest/request/impl/InsertTaxRequest.js';
import { UpdateTaxRequest } from '../../../../src/rest/request/impl/UpdateTaxRequest.js';

describe('TaxDTOFactory', () => {
  const factory = new TaxDTOFactory();

  it('builds a TaxDTO from an InsertTaxRequest (earnings+expenses only)', () => {
    const dto = factory.getDTO(new InsertTaxRequest({ earnings: 1000, expenses: 200 }));
    expect(dto.earnings).toBe(1000);
    expect(dto.expenses).toBe(200);
  });

  it('builds a Tax patch object from an UpdateTaxRequest (undefined for omitted fields)', () => {
    const patch = factory.getDTO(new UpdateTaxRequest({
      payed: true,
      elapsedDays: 30
    }));
    // PATCH semantics: omitted fields are undefined, NOT 0/false.
    expect(patch.earnings).toBeUndefined();
    expect(patch.expenses).toBeUndefined();
    expect(patch.payed).toBe(true);
    expect(patch.elapsedDays).toBe(30);
  });

  it('preserves a literal 0 in the patch (does not coerce it to undefined)', () => {
    const patch = factory.getDTO(new UpdateTaxRequest({
      earnings: 0,
      expenses: 0
    }));
    expect(patch.earnings).toBe(0);
    expect(patch.expenses).toBe(0);
    expect(patch.payed).toBeUndefined();
    expect(patch.elapsedDays).toBeUndefined();
  });

  it('throws when given an unknown request type', () => {
    expect(() => factory.getDTO({})).toThrow(/Invalid Request/);
  });
});
