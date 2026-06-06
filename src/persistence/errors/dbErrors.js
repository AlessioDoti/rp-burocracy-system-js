/**
 * @fileoverview Translates known MySQL driver errors into typed
 * `AppError` subclasses so the global error handler can return the
 * correct HTTP status code instead of masking every database failure
 * as a generic 500.
 *
 * Keep the mapping small: only handle errors whose meaning is clear
 * and whose HTTP translation is unambiguous. Everything else stays
 * untranslated and is logged + masked as 500 by the global handler.
 */

import { ConflictError, ForeignKeyViolationError } from '../../domain/error/AppError.js';

/**
 * @typedef {Error & {
 *   code?: string,    // e.g. 'ER_DUP_ENTRY'
 *   errno?: number,   // e.g. 1062
 *   sqlState?: string,
 *   sqlMessage?: string
 * }} MysqlError
 */

/**
 * Parses the constraint metadata out of a MySQL FK error message.
 *
 * Format: `... CONSTRAINT `<name>` FOREIGN KEY (`<fkCol>`) REFERENCES
 * `<table>` (`<col>`)`
 *
 * @param {string|undefined} sqlMessage
 * @returns {{ constraint: string, foreignKeyColumn: string|undefined, referencedTable: string|undefined, referencedColumn: string|undefined }}
 */
function parseFkConstraint(sqlMessage) {
  const match = sqlMessage?.match(
    /CONSTRAINT `([^`]+)` FOREIGN KEY \(`([^`]+)`\) REFERENCES `([^`]+)` \(`([^`]+)`\)/
  );
  if (match) {
    return {
      constraint: match[1],
      foreignKeyColumn: match[2],
      referencedTable: match[3],
      referencedColumn: match[4]
    };
  }
  const nameOnly = sqlMessage?.match(/CONSTRAINT `([^`]+)`/);
  return {
    constraint: nameOnly ? nameOnly[1] : 'unknown',
    foreignKeyColumn: undefined,
    referencedTable: undefined,
    referencedColumn: undefined
  };
}

/**
 * Maps a MySQL error to an `AppError` when the meaning is unambiguous.
 * Returns the original error untouched when no mapping applies.
 *
 * - `ER_DUP_ENTRY` (1062) → `ConflictError` (409). Raised by `INSERT`
 *   or `UPDATE` when a row would violate a `UNIQUE` constraint.
 * - `ER_ROW_IS_REFERENCED_2` (1451) → `ForeignKeyViolationError` (409).
 *   Raised by `DELETE` or `UPDATE` on a parent row that is still
 *   referenced by a child row.
 * - `ER_NO_REFERENCED_ROW_2` (1452) → `ForeignKeyViolationError` (409).
 *   Raised by `INSERT` or `UPDATE` on a child row that points to a
 *   parent that does not exist.
 *
 * @param {MysqlError|null|undefined} err
 * @returns {Error} A typed `AppError` when the input is a known
 *   MySQL error; the original error otherwise.
 */
export function translateDbError(err) {
  if (!err) return err;

  if (err.code === 'ER_DUP_ENTRY' || err.errno === 1062) {
    const match = err.sqlMessage?.match(/Duplicate entry '(.+?)' for key '(.+?)'/);
    const value = match ? match[1] : 'unknown';
    const key = match ? match[2] : 'unknown';
    return new ConflictError(
      `Duplicate value '${value}' violates unique constraint '${key}'`
    );
  }

  if (err.code === 'ER_ROW_IS_REFERENCED_2' || err.errno === 1451) {
    const details = parseFkConstraint(err.sqlMessage);
    return new ForeignKeyViolationError(
      `Cannot delete or update: row is still referenced by other rows (constraint: ${details.constraint})`,
      details
    );
  }

  if (err.code === 'ER_NO_REFERENCED_ROW_2' || err.errno === 1452) {
    const details = parseFkConstraint(err.sqlMessage);
    return new ForeignKeyViolationError(
      `Cannot add or update: referenced row does not exist (constraint: ${details.constraint})`,
      details
    );
  }

  return err;
}
