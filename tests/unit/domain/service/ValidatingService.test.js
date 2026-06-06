import { describe, it, expect } from '@jest/globals';
import { z } from 'zod';
import { ValidatingService } from '../../../../src/domain/service/ValidatingService.js';
import { ValidationError } from '../../../../src/domain/error/AppError.js';

describe('ValidatingService', () => {
  const schema = z.object({ name: z.string().min(1) });
  const service = new ValidatingService(schema);

  it('does not throw when the DTO satisfies the schema', () => {
    expect(() => service.validate({ name: 'ok' })).not.toThrow();
  });

  it('throws a ValidationError when the DTO fails the schema', () => {
    try {
      service.validate({});
    } catch (err) {
      expect(err).toBeInstanceOf(ValidationError);
      expect(err.code).toBe('VALIDATION_ERROR');
      expect(Array.isArray(err.details)).toBe(true);
      return;
    }
    throw new Error('Expected validate to throw');
  });

  it('throws if instantiated without a schema', () => {
    expect(() => new ValidatingService()).toThrow(/requires a Zod schema/);
  });
});
