import { describe, it, expect } from '@jest/globals';
import { translateDbError } from '../../../../src/persistence/errors/dbErrors.js';
import { ConflictError, ForeignKeyViolationError } from '../../../../src/domain/error/AppError.js';

describe('translateDbError', () => {
  describe('ER_DUP_ENTRY (1062)', () => {
    it('translates ER_DUP_ENTRY (string code) into a ConflictError with parsed value and key', () => {
      const dbError = Object.assign(new Error('Duplicate entry'), {
        code: 'ER_DUP_ENTRY',
        errno: 1062,
        sqlState: '23000',
        sqlMessage: "Duplicate entry 'Main Street Shop' for key 'ACTIVITY.UK_ACTIVITY_NAME'"
      });

      const translated = translateDbError(dbError);

      expect(translated).toBeInstanceOf(ConflictError);
      expect(translated.code).toBe('CONFLICT');
      expect(translated.message).toBe(
        "Duplicate value 'Main Street Shop' violates unique constraint 'ACTIVITY.UK_ACTIVITY_NAME'"
      );
    });

    it('translates ER_DUP_ENTRY (numeric errno only) into a ConflictError', () => {
      const dbError = Object.assign(new Error('Duplicate entry'), {
        errno: 1062,
        sqlMessage: "Duplicate entry 'foo' for key 'X.UQ'"
      });
      expect(translateDbError(dbError)).toBeInstanceOf(ConflictError);
    });

    it('falls back to "unknown" when the message does not match the expected shape', () => {
      const dbError = Object.assign(new Error('weird'), {
        code: 'ER_DUP_ENTRY',
        errno: 1062,
        sqlMessage: 'something else entirely'
      });
      const translated = translateDbError(dbError);
      expect(translated).toBeInstanceOf(ConflictError);
      expect(translated.message).toBe(
        "Duplicate value 'unknown' violates unique constraint 'unknown'"
      );
    });
  });

  describe('ER_ROW_IS_REFERENCED_2 (1451)', () => {
    const fkMessage =
      "Cannot delete or update a parent row: a foreign key constraint fails " +
      "(`burocracy`.`FK_ACTIVITY_CATEGORY`, CONSTRAINT `FK_ACTIVITY_CATEGORY` " +
      "FOREIGN KEY (`CATEGORY_ID`) REFERENCES `CATEGORY` (`id`))";

    it('translates into a ForeignKeyViolationError with parsed constraint details', () => {
      const dbError = Object.assign(new Error('FK fail'), {
        code: 'ER_ROW_IS_REFERENCED_2',
        errno: 1451,
        sqlMessage: fkMessage
      });

      const translated = translateDbError(dbError);

      expect(translated).toBeInstanceOf(ForeignKeyViolationError);
      expect(translated.code).toBe('FOREIGN_KEY_VIOLATION');
      expect(translated.message).toBe(
        'Cannot delete or update: row is still referenced by other rows (constraint: FK_ACTIVITY_CATEGORY)'
      );
      expect(translated.details).toEqual({
        constraint: 'FK_ACTIVITY_CATEGORY',
        foreignKeyColumn: 'CATEGORY_ID',
        referencedTable: 'CATEGORY',
        referencedColumn: 'id'
      });
    });

    it('falls back to constraint="unknown" when the message cannot be parsed', () => {
      const dbError = Object.assign(new Error('FK fail'), {
        errno: 1451,
        sqlMessage: 'no constraint info here'
      });
      const translated = translateDbError(dbError);
      expect(translated).toBeInstanceOf(ForeignKeyViolationError);
      expect(translated.details).toEqual({
        constraint: 'unknown',
        foreignKeyColumn: undefined,
        referencedTable: undefined,
        referencedColumn: undefined
      });
    });
  });

  describe('ER_NO_REFERENCED_ROW_2 (1452)', () => {
    const fkMessage =
      "Cannot add or update a child row: a foreign key constraint fails " +
      "(`burocracy`.`FK_TAX_ACTIVITY`, CONSTRAINT `FK_TAX_ACTIVITY` " +
      "FOREIGN KEY (`ACTIVITY_ID`) REFERENCES `ACTIVITY` (`id`))";

    it('translates into a ForeignKeyViolationError', () => {
      const dbError = Object.assign(new Error('FK fail'), {
        code: 'ER_NO_REFERENCED_ROW_2',
        errno: 1452,
        sqlMessage: fkMessage
      });

      const translated = translateDbError(dbError);

      expect(translated).toBeInstanceOf(ForeignKeyViolationError);
      expect(translated.code).toBe('FOREIGN_KEY_VIOLATION');
      expect(translated.message).toBe(
        'Cannot add or update: referenced row does not exist (constraint: FK_TAX_ACTIVITY)'
      );
      expect(translated.details).toEqual({
        constraint: 'FK_TAX_ACTIVITY',
        foreignKeyColumn: 'ACTIVITY_ID',
        referencedTable: 'ACTIVITY',
        referencedColumn: 'id'
      });
    });
  });

  describe('passthrough', () => {
    it('returns the original error untouched for unrelated MySQL errors', () => {
      const dbError = Object.assign(new Error('connection lost'), {
        code: 'ECONNRESET',
        errno: -4077
      });
      expect(translateDbError(dbError)).toBe(dbError);
    });

    it('returns the input untouched when it is null or undefined', () => {
      expect(translateDbError(null)).toBeNull();
      expect(translateDbError(undefined)).toBeUndefined();
    });
  });
});
