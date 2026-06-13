/**
 * @fileoverview Global Express error-handling middleware.
 *
 * Maps the typed `AppError` hierarchy (defined in
 * `src/domain/error/AppError.js`) to the right HTTP status code via
 * the `STATUS_BY_CODE` map below, surfaces malformed JSON bodies as
 * 400, translates known MySQL driver errors into typed `AppError`s,
 * and masks every other error as a generic 500.
 *
 * The status-code mapping lives here (and not on the error classes)
 * on purpose: the domain stays free of transport concerns. Swapping
 * the transport — gRPC, CLI, queue worker — only requires recomputing
 * the mapping for the new protocol, without touching any domain code.
 *
 * In `production`, internal error messages are masked so they never
 * leak to the client. In every other environment (`development`,
 * `test`) the actual `message` and a short stack slice are included
 * in the response to ease local debugging.
 */

import { AppError } from '../../../domain/error/AppError.js';
import { env } from '../../../config/env.js';
import { logger } from '../../../config/logger.js';
import { translateDbError } from '../../../persistence/errors/dbErrors.js';

/**
 * Maps a stable `AppError.code` to the HTTP status the REST API will
 * return. The default for unmapped codes is 500 (see {@link statusFor}).
 *
 * @type {Record<string, number>}
 */
const STATUS_BY_CODE = {
  VALIDATION_ERROR: 400,
  NOT_FOUND: 404,
  FORBIDDEN: 403,
  CONFLICT: 409,
  FOREIGN_KEY_VIOLATION: 409,
  INTERNAL_ERROR: 500
};

/**
 * @param {{ code?: string }} err
 * @returns {number} The HTTP status to send for this error.
 */
function statusFor(err) {
  return STATUS_BY_CODE[err.code] ?? 500;
}

/**
 * Express error-handling middleware (4-argument signature).
 *
 * @param {Error & { type?: string, status?: number }} err
 * @param {import('express').Request}  req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} _next
 * @returns {void}
 */
export function globalErrorHandler(err, req, res, _next) {
  if (err instanceof AppError) {
    const statusCode = statusFor(err);
    logger.warn(
      { err: { code: err.code, message: err.message, statusCode, details: err.details } },
      'Handled domain error'
    );
    return res.status(statusCode).json({
      error: {
        code: err.code,
        message: err.message,
        ...(err.details ? { details: err.details } : {})
      }
    });
  }

  if (err && err.type === 'entity.parse.failed') {
    logger.warn({ err: err.message }, 'Malformed JSON body');
    return res.status(400).json({ error: { code: 'INVALID_JSON', message: 'Malformed JSON body' } });
  }

  // Translate known DB errors (e.g. duplicate key, FK violation) into
  // typed AppErrors so they surface as 409/... rather than generic 500s.
  const translated = translateDbError(err);
  if (translated !== err && translated instanceof AppError) {
    const statusCode = statusFor(translated);
    logger.error(
      { err: { code: translated.code, message: translated.message, statusCode, details: translated.details } },
      'Database error'
    );
    return res.status(statusCode).json({
      error: {
        code: translated.code,
        message: 'An unexpected error occurred. Please try again later.'
      }
    });
  }

  const isProd = env.NODE_ENV === 'production';
  logger.error({ err: err?.stack || err }, 'Unhandled error');
  return res.status(500).json({
    error: {
      code: 'INTERNAL_ERROR',
      message: isProd ? 'Internal server error' : (err?.message || 'Internal server error'),
      ...(isProd ? {} : { stack: (err?.stack || '').split('\n').slice(0, 8) })
    }
  });
}
