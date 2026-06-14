import { describe, it, expect } from '@jest/globals';
import { PersonDTO } from '../../../../src/domain/dto/PersonDTO.js';

describe('PersonDTO', () => {
  it('uses defaults for omitted props', () => {
    const dto = new PersonDTO();
    expect(dto.uuid).toBeNull();
    expect(dto.name).toBeNull();
    expect(dto.surname).toBeNull();
    expect(dto.birthDate).toBeNull();
  });

  it('accepts all fields via constructor', () => {
    const dto = new PersonDTO({ uuid: 'abc-123', name: 'Mario', surname: 'Rossi', birthDate: '1990-01-01' });
    expect(dto.uuid).toBe('abc-123');
    expect(dto.name).toBe('Mario');
    expect(dto.surname).toBe('Rossi');
    expect(dto.birthDate).toBe('1990-01-01');
  });

  describe('equals', () => {
    it('returns true when all fields match', () => {
      const a = new PersonDTO({ uuid: '1', name: 'A', surname: 'B' });
      const b = new PersonDTO({ uuid: '1', name: 'A', surname: 'B' });
      expect(a.equals(b)).toBe(true);
    });

    it('returns false when fields differ', () => {
      const a = new PersonDTO({ uuid: '1', name: 'A', surname: 'B' });
      const b = new PersonDTO({ uuid: '2', name: 'A', surname: 'B' });
      expect(a.equals(b)).toBe(false);
    });

    it('returns false when compared to null', () => {
      expect(new PersonDTO().equals(null)).toBe(false);
    });
  });

  describe('toJSON', () => {
    it('serialises string birthDate as-is', () => {
      const dto = new PersonDTO({ name: 'Mario', surname: 'Rossi', birthDate: '1990-01-01' });
      expect(dto.toJSON().birthDate).toBe('1990-01-01');
    });

    it('serialises Date birthDate as YYYY-MM-DD', () => {
      const dto = new PersonDTO({ name: 'Mario', surname: 'Rossi', birthDate: new Date('1990-01-01T00:00:00Z') });
      expect(dto.toJSON().birthDate).toBe('1990-01-01');
    });
  });
});
