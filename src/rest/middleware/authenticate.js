/**
 * @fileoverview Express middleware that verifies a Bearer JWT access token
 * via Passport's Bearer strategy (configured in `src/config/passport.js`).
 *
 * On success it sets `req.user = { uuid, username, roles }`.
 * On failure it returns 401 with a standard error payload.
 */

import passport from 'passport';
import { logger } from '../../config/logger.js';

/**
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 * @returns {void}
 */
export function authenticate(req, res, next) {
  passport.authenticate('bearer', { session: false }, (err, user, info) => {
    if (err) {
      logger.error({ err }, 'Authentication error');
      return res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Authentication error' } });
    }
    if (!user) {
      return res.status(401).json({
        error: {
          code: 'UNAUTHORIZED',
          message: info?.message || 'Invalid or expired token'
        }
      });
    }
    req.user = user;
    next();
  })(req, res, next);
}
