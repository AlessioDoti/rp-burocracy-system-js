/***
 * @fileoverview Passport.js Bearer strategy configuration.
 *
 * Validates JWT access tokens issued by the auth-system using the
 * shared `JWT_SECRET`. On success it attaches
 * `{ uuid, username, roles }` to `req.user`.
 */

import passport from 'passport';
import { Strategy as BearerStrategy } from 'passport-http-bearer';
import jwt from 'jsonwebtoken';
import { env } from './env.js';
import { logger } from './logger.js';

/**
 * Initialises Passport with the Bearer strategy.
 * Must be called once during app bootstrap (in `app.js`).
 */
export function configurePassport() {
  passport.use(
    new BearerStrategy((token, done) => {
      try {
        const decoded = jwt.verify(token, env.JWT_SECRET, {
          issuer: 'rp-auth-system',
          algorithms: ['HS256']
        });

        return done(null, {
          uuid: /** @type {string} */ (decoded.sub),
          username: /** @type {string} */ (decoded.username),
          roles: /** @type {string[]} */ (decoded.roles),
          userId: /** @type {number} */ (decoded.userId)
        });
      } catch (err) {
        logger.warn({ err }, 'JWT verification failed');
        return done(null, false, {
          message: err.name === 'TokenExpiredError'
            ? 'Token has expired'
            : 'Invalid or malformed token'
        });
      }
    })
  );

  logger.info('Passport Bearer strategy configured');
}
