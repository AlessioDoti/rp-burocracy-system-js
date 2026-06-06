import { describe, it, expect } from '@jest/globals';
import { TaxMapper } from '../../../../src/persistence/mapper/TaxMapper.js';
import { ActivityMapper } from '../../../../src/persistence/mapper/ActivityMapper.js';
import { CategoryMapper } from '../../../../src/persistence/mapper/CategoryMapper.js';
import { CategoryTaxMapper } from '../../../../src/persistence/mapper/CategoryTaxMapper.js';
import { TaxDTO } from '../../../../src/domain/dto/TaxDTO.js';
import { ActivityDTO } from '../../../../src/domain/dto/ActivityDTO.js';
import { PersonDTO } from '../../../../src/domain/dto/PersonDTO.js';
import { Tax } from '../../../../src/persistence/entity/Tax.js';
import { Activity } from '../../../../src/persistence/entity/Activity.js';

describe('TaxMapper', () => {
  const mapper = new TaxMapper(new ActivityMapper(new CategoryMapper(new CategoryTaxMapper())));

  it('flattens the manager PersonDTO into managerName/Surname/Role on the entity', () => {
    const dto = new TaxDTO({
      activity: new ActivityDTO({ id: 1, name: 'shop', address: 10 }),
      manager: new PersonDTO({ name: 'Mario', surname: 'Rossi', role: 'MANAGER' }),
      expenses: 100,
      earnings: 1000,
      taxId: 9
    });

    const entity = mapper.fromDTO(dto);

    expect(entity).toBeInstanceOf(Tax);
    expect(entity.managerName).toBe('Mario');
    expect(entity.managerSurname).toBe('Rossi');
    expect(entity.managerRole).toBe('MANAGER');
    expect(entity.expenses).toBe(100);
    expect(entity.earnings).toBe(1000);
    expect(entity.id).toBe(9);
    expect(entity.activity).toBeInstanceOf(Activity);
    expect(entity.activity.id).toBe(1);
  });

  it('rebuilds the PersonDTO from manager columns on the way back', () => {
    const entity = new Tax({
      id: 9,
      activity: new Activity({ id: 1, name: 'shop', address: 10 }),
      managerName: 'Mario',
      managerSurname: 'Rossi',
      managerRole: 'MANAGER',
      expenses: 100,
      earnings: 1000,
      revenue: 900,
      taxableIncome: 90,
      taxAmount: 90,
      elapsedDays: 0,
      elapsedBillAmount: 0,
      declarationDate: new Date('2025-01-01T00:00:00Z'),
      payed: true
    });

    const dto = mapper.toDTO(entity);

    expect(dto).toBeInstanceOf(TaxDTO);
    expect(dto.taxId).toBe(9);
    expect(dto.manager).toBeInstanceOf(PersonDTO);
    expect(dto.manager.name).toBe('Mario');
    expect(dto.manager.surname).toBe('Rossi');
    expect(dto.manager.role).toBe('MANAGER');
    expect(dto.payed).toBe(true);
    // The bracket rate is NOT a field on the entity; it is recomputed
    // from the activity's category brackets on every read.
    expect(dto).not.toHaveProperty('taxRate');
  });

  it('handles a null manager without throwing', () => {
    const dto = new TaxDTO({ activity: new ActivityDTO({ id: 1, name: 'shop' }) });
    const entity = mapper.fromDTO(dto);
    expect(entity.managerName).toBeNull();
    expect(entity.managerSurname).toBeNull();
    expect(entity.managerRole).toBeNull();
  });
});
