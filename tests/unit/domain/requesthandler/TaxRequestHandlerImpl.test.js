import { describe, it, expect, jest } from '@jest/globals';
import { TaxRequestHandlerImpl } from '../../../../src/domain/requesthandler/TaxRequestHandlerImpl.js';
import { ActivityDTO } from '../../../../src/domain/dto/ActivityDTO.js';
import { PersonDTO } from '../../../../src/domain/dto/PersonDTO.js';

const buildMocks = () => ({
  activityService: {
    findByID: jest.fn(),
    findAll: jest.fn(),
    insertActivity: jest.fn(),
    deleteActivity: jest.fn(),
    updateActivity: jest.fn()
  },
  personService: {
    getPersonFromActivityNameAndSurname: jest.fn()
  },
  taxService: {
    insertTax: jest.fn(),
    findTaxByActivity: jest.fn(),
    findAllTaxes: jest.fn(),
    updateTax: jest.fn()
  }
});

describe('TaxRequestHandlerImpl', () => {
  it('handleInsert resolves activity and manager, then delegates to insertTax', async () => {
    const { activityService, personService, taxService } = buildMocks();
    activityService.findByID.mockResolvedValue(new ActivityDTO({ id: 1, name: 'shop' }));
    personService.getPersonFromActivityNameAndSurname.mockResolvedValue(
      new PersonDTO({ name: 'Mario', surname: 'Rossi', role: 'MANAGER' })
    );
    taxService.insertTax.mockImplementation(async (dto) => {
      dto.taxId = 99;
      return dto;
    });

    const handler = new TaxRequestHandlerImpl(activityService, personService, taxService);
    const result = await handler.handleInsert({ earnings: 1000, expenses: 200 }, 1, 'Mario', 'Rossi');

    expect(activityService.findByID).toHaveBeenCalledWith(1);
    expect(personService.getPersonFromActivityNameAndSurname)
      .toHaveBeenCalledWith(1, 'Mario', 'Rossi');
    expect(result.activity.id).toBe(1);
    expect(result.manager.name).toBe('Mario');
    expect(result.taxId).toBe(99);
  });

  it('handleFindByActivity coerces the activity id and delegates to the service', async () => {
    const { activityService, personService, taxService } = buildMocks();
    taxService.findTaxByActivity.mockResolvedValue('PAGE');
    const handler = new TaxRequestHandlerImpl(activityService, personService, taxService);
    await expect(handler.handleFindByActivity('7', { page: 0, size: 10 })).resolves.toBe('PAGE');
    expect(taxService.findTaxByActivity).toHaveBeenCalledWith(7, { page: 0, size: 10 });
  });

  it('handleFindAll delegates to findAllTaxes', async () => {
    const { activityService, personService, taxService } = buildMocks();
    taxService.findAllTaxes.mockResolvedValue('PAGE');
    const handler = new TaxRequestHandlerImpl(activityService, personService, taxService);
    await expect(handler.handleFindAll({ page: 0, size: 10 })).resolves.toBe('PAGE');
  });

  it('handleUpdate rejects an empty patch with ValidationError (at least one field required)', async () => {
    const { activityService, personService, taxService } = buildMocks();
    const handler = new TaxRequestHandlerImpl(activityService, personService, taxService);
    await expect(handler.handleUpdate({}, 1)).rejects.toThrow(/At least one/);
    // The service must NOT be called when the patch is empty.
    expect(taxService.updateTax).not.toHaveBeenCalled();
  });

  it('handleUpdate rejects a wrong-type patch with ValidationError', async () => {
    const { activityService, personService, taxService } = buildMocks();
    const handler = new TaxRequestHandlerImpl(activityService, personService, taxService);
    await expect(handler.handleUpdate({ payed: 'yes' }, 1)).rejects.toThrow(/Payed must be a boolean/);
    expect(taxService.updateTax).not.toHaveBeenCalled();
  });

  it('handleUpdate delegates to updateTax with the parsed patch', async () => {
    const { activityService, personService, taxService } = buildMocks();
    taxService.updateTax.mockResolvedValue('UPDATED');
    const handler = new TaxRequestHandlerImpl(activityService, personService, taxService);
    await expect(handler.handleUpdate({ payed: true }, 1)).resolves.toBe('UPDATED');
    expect(taxService.updateTax).toHaveBeenCalledWith({ payed: true }, 1);
  });
});
