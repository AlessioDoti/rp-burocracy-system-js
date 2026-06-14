/**
 * @jest-environment node
 */
import { describe, it, expect, jest } from '@jest/globals';
import passport from 'passport';
import { authenticate } from '../../../../src/rest/middleware/authenticate.js';

describe('authenticate middleware', () => {
  const mockReqResNext = () => {
    const req = {};
    const res = {
      status: jest.fn(() => res),
      json: jest.fn()
    };
    const next = jest.fn();
    return { req, res, next };
  };

  it('calls next() when authentication succeeds', () => {
    const user = { uuid: 'abc', username: 'test', roles: ['ADMIN'] };
    jest.spyOn(passport, 'authenticate').mockImplementation((strategy, opts, callback) => {
      return (req, res, next) => {
        callback(null, user, null);
        next();
      };
    });

    const { req, res, next } = mockReqResNext();
    authenticate(req, res, next);
    expect(req.user).toEqual(user);
    expect(next).toHaveBeenCalled();
  });

  it('returns 401 when no user is authenticated', () => {
    jest.spyOn(passport, 'authenticate').mockImplementation((strategy, opts, callback) => {
      return (req, res, next) => {
        callback(null, false, { message: 'Invalid token' });
      };
    });

    const { req, res, next } = mockReqResNext();
    authenticate(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({
      error: { code: 'UNAUTHORIZED', message: 'Invalid token' }
    });
  });

  it('returns 500 when passport encounters an error', () => {
    const authError = new Error('passport error');
    jest.spyOn(passport, 'authenticate').mockImplementation((strategy, opts, callback) => {
      return (req, res, next) => {
        callback(authError, false, null);
      };
    });

    const { req, res, next } = mockReqResNext();
    authenticate(req, res, next);
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      error: { code: 'INTERNAL_ERROR', message: 'Authentication error' }
    });
  });
});
