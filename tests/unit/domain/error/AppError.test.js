import { describe, it, expect } from '@jest/globals';
import {
  AppError,
  ValidationError,
  NotFoundError,
  ConflictError,
  ForbiddenError,
  ForeignKeyViolationError
} from '../../../../src/domain/error/AppError.js';

describe('AppError hierarchy', () => {
  it('AppError has default code INTERNAL_ERROR', () => {
    const err = new AppError('oops');
    expect(err.name).toBe('AppError');
    expect(err.code).toBe('INTERNAL_ERROR');
    expect(err.message).toBe('oops');
  });

  it('AppError accepts custom code and details', () => {
    const err = new AppError('custom', { code: 'CUSTOM', details: { foo: 'bar' } });
    expect(err.code).toBe('CUSTOM');
    expect(err.details).toEqual({ foo: 'bar' });
  });

  it('ValidationError carries VALIDATION_ERROR code and details', () => {
    const err = new ValidationError('invalid', ['field: required']);
    expect(err).toBeInstanceOf(AppError);
    expect(err.code).toBe('VALIDATION_ERROR');
    expect(err.details).toEqual(['field: required']);
  });

  it('NotFoundError carries NOT_FOUND code', () => {
    const err = new NotFoundError('not found');
    expect(err).toBeInstanceOf(AppError);
    expect(err.code).toBe('NOT_FOUND');
  });

  it('ConflictError carries CONFLICT code', () => {
    const err = new ConflictError('duplicate');
    expect(err).toBeInstanceOf(AppError);
    expect(err.code).toBe('CONFLICT');
  });

  it('ForbiddenError has default message and FORBIDDEN code', () => {
    const err = new ForbiddenError();
    expect(err).toBeInstanceOf(AppError);
    expect(err.code).toBe('FORBIDDEN');
    expect(err.message).toBe('Forbidden');
  });

  it('ForbiddenError accepts custom message', () => {
    const err = new ForbiddenError('custom forbidden');
    expect(err.message).toBe('custom forbidden');
  });

  it('ForeignKeyViolationError carries FOREIGN_KEY_VIOLATION code and details', () => {
    const details = { constraint: 'FK_ACTIVITY_CATEGORY', referencedTable: 'CATEGORY' };
    const err = new ForeignKeyViolationError('fk fail', details);
    expect(err).toBeInstanceOf(AppError);
    expect(err.code).toBe('FOREIGN_KEY_VIOLATION');
    expect(err.details).toEqual(details);
  });
});
