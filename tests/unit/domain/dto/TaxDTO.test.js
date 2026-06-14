import { describe, it, expect } from '@jest/globals';
import { TaxDTO } from '../../../../src/domain/dto/TaxDTO.js';
import { ActivityDTO } from '../../../../src/domain/dto/ActivityDTO.js';

describe('TaxDTO', () => {
  it('uses defaults for omitted props', () => {
    const dto = new TaxDTO();
    expect(dto.activity).toBeNull();
    expect(dto.manager).toBeNull();
    expect(dto.expenses).toBe(0);
    expect(dto.earnings).toBe(0);
    expect(dto.revenue).toBe(0);
    expect(dto.taxAmount).toBe(0);
    expect(dto.elapsedDays).toBe(0);
    expect(dto.elapsedBillAmount).toBe(0);
    expect(dto.taxableIncome).toBe(0);
    expect(dto.declarationDate).toBeNull();
    expect(dto.payed).toBe(false);
    expect(dto.taxId).toBeNull();
  });

  it('accepts all fields via constructor', () => {
    const activity = new ActivityDTO({ id: 1, name: 'shop' });
    const date = new Date('2026-06-06T00:00:00.000Z');
    const dto = new TaxDTO({
      activity,
      manager: 'uuid-manager',
      expenses: 500,
      earnings: 3000,
      revenue: 2500,
      taxAmount: 250,
      elapsedDays: 3,
      elapsedBillAmount: 45000,
      taxableIncome: 250,
      declarationDate: date,
      payed: true,
      taxId: 10
    });

    expect(dto.activity).toBeInstanceOf(ActivityDTO);
    expect(dto.activity.id).toBe(1);
    expect(dto.manager).toBe('uuid-manager');
    expect(dto.expenses).toBe(500);
    expect(dto.earnings).toBe(3000);
    expect(dto.revenue).toBe(2500);
    expect(dto.taxAmount).toBe(250);
    expect(dto.elapsedDays).toBe(3);
    expect(dto.elapsedBillAmount).toBe(45000);
    expect(dto.taxableIncome).toBe(250);
    expect(dto.declarationDate).toBe(date);
    expect(dto.payed).toBe(true);
    expect(dto.taxId).toBe(10);
  });

  it('preserves null declarationDate and null activity', () => {
    const dto = new TaxDTO();
    expect(dto.declarationDate).toBeNull();
    expect(dto.activity).toBeNull();
  });
});
