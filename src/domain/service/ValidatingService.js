/***
 * @fileoverview Base class for domain services that validate a DTO
 * with a Zod schema before touching the persistence port.
 *
 * Errors are surfaced as `ValidationError` (HTTP 400) so the global
 * error middleware maps them to a 400 response. Validation is the
 * only shared concern across services, which is why this class exists
 * rather than duplicating the safeParse + format logic in every
 * service.
 */

import { ValidationError } from '../error/AppError.js';
import { logger } from '../../config/logger.js';

/**
 * @class ValidatingService
 * @classdesc Generic validator base. Subclasses provide a Zod schema
 * in their constructor and call {@link ValidatingService#validate}
 * before any persistence write. Handlers that validate request-shaped
 * patches (e.g. `activityPatchSchema`) can reuse
 * {@link ValidatingService.formatZodError} to produce the same
 * `ValidationError` shape without reimplementing the mapping.
 */
export class ValidatingService {
  /**
   * @param {import('zod').ZodTypeAny} schema Zod schema used to validate
   *   the DTO. Required — there is no default.
   * @throws {Error} When constructed without a schema, so misconfigured
   *   services fail fast at startup rather than at the first request.
   */
  constructor(schema) {
    if (!schema) {
      throw new Error('ValidatingService requires a Zod schema');
    }
    /*** @property {import('zod').ZodTypeAny} schema */
    this.schema = schema;
  }

  /***
   * Runs `this.schema.safeParse(dto)` and throws a `ValidationError`
   * on failure, with the issue list formatted as
   * `"<path>: <message>"` strings (one per Zod issue).
   *
   * @param {object} dto The DTO to validate. May be a plain object or a
   *   DTO instance — Zod will coerce in either case.
   * @returns {void}
   * @throws {ValidationError} When the DTO does not conform to the
   *   schema. `error.details` is the formatted issue list.
   */
  validate(dto) {
    logger.debug({ dto }, 'Validating DTO');
    const result = this.schema.safeParse(dto);
    if (!result.success) {
      throw new ValidationError('Validation failed', ValidatingService.formatZodError(result.error));
    }
  }

  /***
   * Formats a Zod error into the same `"<path>: <message>"` strings
   * that {@link ValidatingService#validate} produces. Reused by
   * request handlers that validate patches against a schema they own
   * (so the validation error shape is identical across the API).
   *
   * @param {import('zod').ZodError} zodError
   * @returns {string[]} One `"<path>: <message>"` per issue.
   */
  static formatZodError(zodError) {
    return zodError.issues.map(
      (issue) => `${issue.path.join('.') || '<root>'}: ${issue.message}`
    );
  }
}
