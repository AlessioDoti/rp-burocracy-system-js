import { describe, it, expect, jest } from '@jest/globals';
import { TaxService } from '../../../../src/domain/service/TaxService.js';
import { TaxDTO } from '../../../../src/domain/dto/TaxDTO.js';
import { ActivityDTO } from '../../../../src/domain/dto/ActivityDTO.js';
import { CategoryDTO } from '../../../../src/domain/dto/CategoryDTO.js';
import { CategoryTaxDTO } from '../../../../src/domain/dto/CategoryTaxDTO.js';
import { NotFoundError, ValidationError } from '../../../../src/domain/error/AppError.js';

const buildPortMock = () => ({
  saveTax: jest.fn(),
  findTaxByID: jest.fn(),
  findActivityTaxes: jest.fn(),
  findAllTaxes: jest.fn(),
  getElapsedDays: jest.fn()
});

const buildCategoryWithTaxes = () =>
  new CategoryDTO({
    name: 'food',
    categoryTaxes: [
      new CategoryTaxDTO({ amount: 0, rate: 0 }),
      new CategoryTaxDTO({ amount: 1000, rate: 10 }),
      new CategoryTaxDTO({ amount: 5000, rate: 20 })
    ]
  });

describe('TaxService', () => {
  it('rejects inserts missing the activity or the manager', async () => {
    const port = buildPortMock();
    const service = new TaxService(port);

    await expect(service.insertTax(new TaxDTO({ manager: '' })))
      .rejects.toBeInstanceOf(ValidationError);
    await expect(service.insertTax(new TaxDTO({ activity: new ActivityDTO() })))
      .rejects.toBeInstanceOf(ValidationError);
  });

  it('computes revenue, tax rate (by bracket), tax amount, and declarationDate on insert', async () => {
    const port = buildPortMock();
    port.getElapsedDays.mockResolvedValue(10); // > ELAPSED_DAYS_BASE (7)
    port.saveTax.mockImplementation(async (dto) => {
      dto.taxId = 1;
      return dto;
    });

    const service = new TaxService(port);
    const dto = new TaxDTO({
      activity: new ActivityDTO({ id: 1, name: 'shop', address: 0, category: buildCategoryWithTaxes() }),
      manager: 'uuid-mario',
      earnings: 3000,
      expenses: 500
    });

    const result = await service.insertTax(dto);

    // revenue = 3000 - 500 = 2500
    expect(result.revenue).toBe(2500);
    // bracket: amount <= 2500 → highest is 1000@10%.

    expect(result.taxableIncome).toBe(250);
    // elapsedDays = 10 - 7 = 3 → bill = 3 * 15000 = 45000.
    expect(result.elapsedDays).toBe(3);
    expect(result.elapsedBillAmount).toBe(45000);
    // taxAmount = taxableIncome + elapsedBillAmount (tax owed + late-filing penalty).
    expect(result.taxAmount).toBe(250 + 45000);
    expect(result.declarationDate).toBeInstanceOf(Date);
  });

  it('falls back to 0% when the activity has no category taxes', async () => {
    const port = buildPortMock();
    port.getElapsedDays.mockResolvedValue(0);
    port.saveTax.mockImplementation(async (dto) => dto);
    const service = new TaxService(port);

    const dto = new TaxDTO({
      activity: new ActivityDTO({ id: 1, name: 'shop', address: 0, category: new CategoryDTO({ categoryTaxes: [] }) }),
      manager: 'uuid-person',
      earnings: 100,
      expenses: 0
    });
    const result = await service.insertTax(dto);
    // No matching bracket → rate 0 → taxableIncome 0, taxAmount 0.
    expect(result.taxableIncome).toBe(0);
    expect(result.taxAmount).toBe(0);
  });

  it('patches only the fields present in the request (true PATCH semantics)', async () => {
    const port = buildPortMock();
    const found = new TaxDTO({
      activity: new ActivityDTO({ id: 1, name: 'shop', category: buildCategoryWithTaxes() }),
      manager: 'uuid-manager',
      expenses: 500,
      earnings: 2000,
      payed: false,
      elapsedDays: 5
    });
    port.findTaxByID.mockResolvedValue(found);
    port.saveTax.mockImplementation(async (d) => d);
    const service = new TaxService(port);

    // Only `payed` and `elapsedDays` are in the patch. The others

    const result = await service.updateTax({ payed: true, elapsedDays: 10 }, 1);

    expect(result.expenses).toBe(500);
    expect(result.earnings).toBe(2000);
    expect(result.payed).toBe(true);
    expect(result.elapsedDays).toBe(10);
  });

  it('applies a literal 0 from the patch (NOT a "no change" sentinel)', async () => {
    const port = buildPortMock();
    const found = new TaxDTO({
      activity: new ActivityDTO({ id: 1, name: 'shop', category: buildCategoryWithTaxes() }),
      manager: 'uuid-manager',
      expenses: 500,
      earnings: 2000,
      payed: true,
      elapsedDays: 5
    });
    port.findTaxByID.mockResolvedValue(found);
    port.saveTax.mockImplementation(async (d) => d);
    const service = new TaxService(port);

    const result = await service.updateTax({ earnings: 0, payed: false }, 1);

    expect(result.earnings).toBe(0); // 0 applied, not dropped
    expect(result.expenses).toBe(500); // not in patch → kept
    expect(result.payed).toBe(false); // false applied
    expect(result.elapsedDays).toBe(5); // not in patch → kept
  });

  it('throws NotFoundError when updating a missing tax', async () => {
    const port = buildPortMock();
    port.findTaxByID.mockResolvedValue(null);
    const service = new TaxService(port);
    await expect(service.updateTax({ payed: true }, 99)).rejects.toBeInstanceOf(NotFoundError);
  });
});
