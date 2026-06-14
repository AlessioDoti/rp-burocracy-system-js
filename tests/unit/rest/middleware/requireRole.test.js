import { describe, it, expect, jest } from '@jest/globals';
import { requireRole } from '../../../../src/rest/middleware/requireRole.js';

describe('requireRole middleware', () => {
  const mockReqResNext = (overrides = {}) => {
    const req = {
      user: { uuid: 'abc', username: 'test', roles: ['ADMIN'] },
      path: '/test',
      ...overrides
    };
    const res = {
      status: jest.fn(() => res),
      json: jest.fn()
    };
    const next = jest.fn();
    return { req, res, next };
  };

  it('calls next() when user has the required role', () => {
    const { req, res, next } = mockReqResNext();
    requireRole('ADMIN')(req, res, next);
    expect(next).toHaveBeenCalled();
  });

  it('calls next() when user has one of the allowed roles', () => {
    const { req, res, next } = mockReqResNext();
    requireRole('GOVERNMENT', 'ADMIN')(req, res, next);
    expect(next).toHaveBeenCalled();
  });

  it('returns 403 when user lacks the required role', () => {
    const { req, res, next } = mockReqResNext({ user: { username: 'test', roles: ['USER'] } });
    requireRole('ADMIN')(req, res, next);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({
      error: { code: 'FORBIDDEN', message: 'Insufficient permissions' }
    });
  });

  it('returns 401 when there is no user on the request', () => {
    const { req, res, next } = mockReqResNext({ user: undefined });
    requireRole('ADMIN')(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({
      error: { code: 'UNAUTHORIZED', message: 'Authentication required' }
    });
  });

  it('returns 403 when user has empty roles array', () => {
    const { req, res, next } = mockReqResNext({ user: { username: 'test', roles: [] } });
    requireRole('ADMIN')(req, res, next);
    expect(res.status).toHaveBeenCalledWith(403);
  });
});
