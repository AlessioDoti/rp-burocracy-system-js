import { describe, it, expect, jest } from '@jest/globals';
import { globalErrorHandler } from '../../../../../src/rest/controller/advice/GlobalResponseEntityExceptionHandler.js';
import {
  AppError,
  ValidationError,
  NotFoundError,
  ConflictError,
  ForbiddenError,
  ForeignKeyViolationError
} from '../../../../../src/domain/error/AppError.js';

describe('GlobalResponseEntityExceptionHandler', () => {
  const buildRes = () => {
    const res = {};
    res.status = jest.fn(() => res);
    res.json = jest.fn(() => res);
    return res;
  };

  it('maps ValidationError to HTTP 400', () => {
    const err = new ValidationError('invalid', ['field: required']);
    const res = buildRes();
    globalErrorHandler(err, {}, res, jest.fn());
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      error: { code: 'VALIDATION_ERROR', message: 'invalid', details: ['field: required'] }
    });
  });

  it('maps NotFoundError to HTTP 404', () => {
    const err = new NotFoundError('not found');
    const res = buildRes();
    globalErrorHandler(err, {}, res, jest.fn());
    expect(res.status).toHaveBeenCalledWith(404);
  });

  it('maps ForbiddenError to HTTP 403', () => {
    const err = new ForbiddenError();
    const res = buildRes();
    globalErrorHandler(err, {}, res, jest.fn());
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({
      error: { code: 'FORBIDDEN', message: 'Forbidden' }
    });
  });

  it('maps ConflictError to HTTP 409', () => {
    const err = new ConflictError('duplicate');
    const res = buildRes();
    globalErrorHandler(err, {}, res, jest.fn());
    expect(res.status).toHaveBeenCalledWith(409);
  });

  it('maps ForeignKeyViolationError to HTTP 409', () => {
    const err = new ForeignKeyViolationError('fk fail', { constraint: 'FK_ACTIVITY' });
    const res = buildRes();
    globalErrorHandler(err, {}, res, jest.fn());
    expect(res.status).toHaveBeenCalledWith(409);
  });

  it('maps malformed JSON (entity.parse.failed) to HTTP 400', () => {
    const err = Object.assign(new Error('Unexpected token'), { type: 'entity.parse.failed' });
    const res = buildRes();
    globalErrorHandler(err, {}, res, jest.fn());
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      error: { code: 'INVALID_JSON', message: 'Malformed JSON body' }
    });
  });

  it('maps a MySQL ER_DUP_ENTRY (translated) to HTTP 409', () => {
    const dbError = Object.assign(new Error('Duplicate entry'), {
      code: 'ER_DUP_ENTRY',
      errno: 1062,
      sqlMessage: "Duplicate entry 'x' for key 'ACTIVITY.UK_ACTIVITY_NAME'"
    });
    const res = buildRes();
    globalErrorHandler(dbError, {}, res, jest.fn());
    expect(res.status).toHaveBeenCalledWith(409);
  });

  it('includes message and stack in non-production environment', () => {
    // Note: env.NODE_ENV is cached at first import as 'test', so the
    // handler always runs in non-production mode in unit tests.
    const err = new Error('debug info');
    err.stack = 'Error: debug info\n    at line1\n    at line2';
    const res = buildRes();
    globalErrorHandler(err, {}, res, jest.fn());
    expect(res.status).toHaveBeenCalledWith(500);
    const body = res.json.mock.calls[0][0];
    expect(body.error.message).toBe('debug info');
    expect(body.error.stack).toBeDefined();
  });

  it('maps unknown AppError subclasses to 500', () => {
    class CustomError extends AppError {
      constructor() { super('custom', { code: 'CUSTOM' }); }
    }
    const err = new CustomError();
    const res = buildRes();
    globalErrorHandler(err, {}, res, jest.fn());
    expect(res.status).toHaveBeenCalledWith(500);
  });
});
