/***
 * @fileoverview Express middleware factory that restricts access by role.
 *
 * Must be used AFTER `authenticate` so that `req.user` is available.
 *
 * Usage:
 *   router.get('/admin', authenticate, requireRole('ADMIN'), handler)
 *   router.get('/gov', authenticate, requireRole('ADMIN', 'GOVERNMENT'), handler)
 */

import { logger } from '../../config/logger.js';

/**
 * @param {...string} allowedRoles  One or more roles allowed to access the route.
 * @returns {import('express').RequestHandler}
 */
export function requireRole(...allowedRoles) {
  return (req, res, next) => {
    const user = /** @type {{ uuid?: string, username?: string, roles?: string[] }|undefined} */ (req.user);

    if (!user) {
      logger.warn({ path: req.path }, 'requireRole called without authenticate middleware');
      return res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Authentication required' } });
    }

    const hasRole = user.roles && user.roles.some((role) => allowedRoles.includes(role));
    if (!hasRole) {
      logger.warn({ user: user.username, required: allowedRoles, actual: user.roles }, 'Access denied by role');
      return res.status(403).json({ error: { code: 'FORBIDDEN', message: 'Insufficient permissions' } });
    }

    next();
  };
}
