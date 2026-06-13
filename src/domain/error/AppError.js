/**
 * @fileoverview Typed error hierarchy used by the domain and adapter
 * layers. Each error carries a stable, machine-readable `code` plus an
 * optional structured `details` payload; the HTTP status code is NOT
 * defined here — the REST layer owns that mapping (see
 * `src/rest/controller/advice/GlobalResponseEntityExceptionHandler.js`),
 * which keeps the domain free of transport concerns.
 */

/**
 * @class AppError
 * @classdesc Base class for every error the application is willing to
 * surface to the client. Subclasses set `code`.
 *
 * Catching `AppError` (or one of its subclasses) means the error is
 * expected and has a user-facing message; anything else is an internal
 * error and is logged + masked before reaching the client.
 */
export class AppError extends Error {
  /**
   * @param {string} message Human-readable error message (English).
   * @param {{
   *   code?: string,
   *   details?: unknown
   * }} [opts]
   * @property {string}  code     Short machine-readable identifier
   *                              (e.g. `NOT_FOUND`, `VALIDATION_ERROR`).
   *                              The REST layer maps it to an HTTP
   *                              status code.
   * @property {unknown} [details] Optional structured detail (e.g. a
   *                              list of validation issues).
   */
  constructor(message, { code = 'INTERNAL_ERROR', details } = {}) {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
    if (details !== undefined) this.details = details;
  }
}

/**
 * @class ValidationError
 * @classdesc Thrown when a DTO fails the Zod schema enforced at the
 * service boundary. The REST layer maps `code: 'VALIDATION_ERROR'`
 * to HTTP 400.
 */
export class ValidationError extends AppError {
  /**
   * @param {string} message
   * @param {string[]} [details] List of `"<path>: <message>"` strings, one
   *   per Zod issue. Surfaced as `error.details` in the response body.
   */
  constructor(message, details) {
    super(message, { code: 'VALIDATION_ERROR', details });
  }
}

/**
 * @class NotFoundError
 * @classdesc Thrown when an update or delete targets a row that does
 * not exist. The REST layer maps `code: 'NOT_FOUND'` to HTTP 404.
 */
export class NotFoundError extends AppError {
  /**
   * @param {string} message
   */
  constructor(message) {
    super(message, { code: 'NOT_FOUND' });
  }
}

/**
 * @class ConflictError
 * @classdesc Thrown when a write would violate a uniqueness constraint
 * or another business invariant. The REST layer maps
 * `code: 'CONFLICT'` to HTTP 409.
 */
export class ConflictError extends AppError {
  /**
   * @param {string} message
   */
  constructor(message) {
    super(message, { code: 'CONFLICT' });
  }
}

/**
 * @class ForeignKeyViolationError
 * @classdesc Thrown when a write would violate a foreign key
 * constraint. The REST layer maps `code: 'FOREIGN_KEY_VIOLATION'`
 * to HTTP 409 and surfaces a structured `details` payload so the
 * frontend can decide whether to prompt the user to clean up the
 * references first.
 */
export class ForbiddenError extends AppError {
  /**
   * @param {string} [message='Forbidden']
   */
  constructor(message = 'Forbidden') {
    super(message, { code: 'FORBIDDEN' });
  }
}

export class ForeignKeyViolationError extends AppError {
  /**
   * @param {string} message
   * @param {{
   *   constraint?: string,
   *   referencedTable?: string,
   *   referencedColumn?: string,
   *   foreignKeyColumn?: string
   * }} [details]
   */
  constructor(message, details) {
    super(message, { code: 'FOREIGN_KEY_VIOLATION', details });
  }
}
