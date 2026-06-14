import { describe, it, expect } from '@jest/globals';
import { Tax } from '../../../../src/persistence/entity/Tax.js';
import { Activity } from '../../../../src/persistence/entity/Activity.js';

describe('Tax entity', () => {
  it('uses defaults for omitted props', () => {
    const entity = new Tax();
    expect(entity.id).toBeNull();
    expect(entity.activity).toBeNull();
    expect(entity.personUuid).toBeNull();
    expect(entity.expenses).toBe(0);
    expect(entity.earnings).toBe(0);
    expect(entity.revenue).toBe(0);
    expect(entity.taxAmount).toBe(0);
    expect(entity.elapsedDays).toBe(0);
    expect(entity.elapsedBillAmount).toBe(0);
    expect(entity.taxableIncome).toBe(0);
    expect(entity.declarationDate).toBeNull();
    expect(entity.payed).toBe(false);
  });

  it('accepts all fields via constructor', () => {
    const activity = new Activity({ id: 1, name: 'shop' });
    const date = new Date('2026-06-06T00:00:00.000Z');
    const entity = new Tax({
      id: 10, activity, personUuid: 'uuid-p',
      expenses: 500, earnings: 3000, revenue: 2500,
      taxAmount: 250, elapsedDays: 3, elapsedBillAmount: 45000,
      taxableIncome: 250, declarationDate: date, payed: true
    });

    expect(entity.id).toBe(10);
    expect(entity.activity).toBeInstanceOf(Activity);
    expect(entity.personUuid).toBe('uuid-p');
    expect(entity.expenses).toBe(500);
    expect(entity.earnings).toBe(3000);
    expect(entity.revenue).toBe(2500);
    expect(entity.taxAmount).toBe(250);
    expect(entity.elapsedDays).toBe(3);
    expect(entity.elapsedBillAmount).toBe(45000);
    expect(entity.taxableIncome).toBe(250);
    expect(entity.declarationDate).toBe(date);
    expect(entity.payed).toBe(true);
  });
});
