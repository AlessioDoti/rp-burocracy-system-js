import { describe, it, expect } from '@jest/globals';
import { ActivityDTOFactory } from '../../../../src/rest/factory/ActivityDTOFactory.js';
import { InsertActivityRequest } from '../../../../src/rest/request/impl/InsertActivityRequest.js';
import { UpdateActivityRequest } from '../../../../src/rest/request/impl/UpdateActivityRequest.js';

describe('ActivityDTOFactory', () => {
  const factory = new ActivityDTOFactory();

  it('builds an ActivityDTO from an InsertActivityRequest (name + address, no category yet)', () => {
    const dto = factory.getDTO(new InsertActivityRequest({ name: 'shop', address: 10 }));
    expect(dto.name).toBe('shop');
    expect(dto.address).toBe(10);
    expect(dto.category).toBeNull();
  });

  it('builds a partial-update patch from an UpdateActivityRequest (every field optional)', () => {
    const patch = factory.getDTO(new UpdateActivityRequest({
      name: 'renamed', address: 7, category: 3
    }));
    // The patch is a plain object, not a DTO.
    expect(patch).not.toBeInstanceOf(InsertActivityRequest);
    expect(patch.name).toBe('renamed');
    expect(patch.address).toBe(7);
    expect(patch.category).toBe(3);
  });

  it('returns a patch with undefined fields when the request carries nothing', () => {
    const patch = factory.getDTO(new UpdateActivityRequest({}));
    expect(patch.name).toBeUndefined();
    expect(patch.address).toBeUndefined();
    expect(patch.category).toBeUndefined();
  });

  it('throws when given an unknown request type', () => {
    expect(() => factory.getDTO({})).toThrow(/Invalid Request/);
  });
});
