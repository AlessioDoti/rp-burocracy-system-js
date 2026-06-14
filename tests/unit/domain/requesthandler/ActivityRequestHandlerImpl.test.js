import { describe, it, expect, jest } from '@jest/globals';
import { ActivityRequestHandlerImpl } from '../../../../src/domain/requesthandler/ActivityRequestHandlerImpl.js';
import { CategoryDTO } from '../../../../src/domain/dto/CategoryDTO.js';
import { NotFoundError, ValidationError } from '../../../../src/domain/error/AppError.js';

const buildMocks = () => ({
  activityService: {
    findAll: jest.fn(),
    findByID: jest.fn(),
    insertActivity: jest.fn(),
    deleteActivity: jest.fn(),
    updateActivity: jest.fn(),
    hasEmployee: jest.fn(),
    replaceEmployees: jest.fn()
  },
  categoryService: {
    findByID: jest.fn(),
    findAll: jest.fn(),
    insertCategory: jest.fn(),
    deleteCategory: jest.fn(),
    updateCategory: jest.fn()
  },
  personService: {
    getPersonByUuid: jest.fn(),
    getPersonByUserId: jest.fn()
  }
});

describe('ActivityRequestHandlerImpl', () => {
  it('handleFindAll delegates to the activity service', async () => {
    const { activityService, categoryService } = buildMocks();
    activityService.findAll.mockResolvedValue('PAGE');
      const handler = new ActivityRequestHandlerImpl(activityService, categoryService, { getPersonByUuid: jest.fn() });
      await expect(handler.handleFindAll({ page: 0, size: 10 })).resolves.toBe('PAGE');
  });

  describe('handleInsert', () => {
    it('resolves the category by id and forwards to insertActivity', async () => {
      const { activityService, categoryService, personService } = buildMocks();
      const category = new CategoryDTO({ id: 7, name: 'retail' });
      categoryService.findByID.mockResolvedValue(category);
      activityService.insertActivity.mockImplementation(async (dto) => dto);

      const handler = new ActivityRequestHandlerImpl(activityService, categoryService, personService);
      const result = await handler.handleInsert({ name: 'shop', address: 1 }, 7);

      expect(categoryService.findByID).toHaveBeenCalledWith(7);
      expect(activityService.insertActivity).toHaveBeenCalledTimes(1);
      expect(result.category).toBe(category);
    });

    it('throws NotFoundError when the category does not exist', async () => {
      const { activityService, categoryService, personService } = buildMocks();
      categoryService.findByID.mockResolvedValue(null);

      const handler = new ActivityRequestHandlerImpl(activityService, categoryService, personService);
      await expect(
        handler.handleInsert({ name: 'shop', address: 1 }, 999)
      ).rejects.toBeInstanceOf(NotFoundError);
      expect(activityService.insertActivity).not.toHaveBeenCalled();
    });
  });

  describe('handleUpdate', () => {
    it('rejects an empty patch with ValidationError', async () => {
      const { activityService, categoryService, personService } = buildMocks();
      const handler = new ActivityRequestHandlerImpl(activityService, categoryService, personService);

      await expect(handler.handleUpdate({}, 1))
        .rejects.toBeInstanceOf(ValidationError);
      expect(categoryService.findByID).not.toHaveBeenCalled();
      expect(activityService.updateActivity).not.toHaveBeenCalled();
    });

    it('rejects a patch whose only field is the wrong type', async () => {
      const { activityService, categoryService, personService } = buildMocks();
      const handler = new ActivityRequestHandlerImpl(activityService, categoryService, personService);

      await expect(handler.handleUpdate({ address: 'not-a-number' }, 1))
        .rejects.toBeInstanceOf(ValidationError);
      expect(activityService.updateActivity).not.toHaveBeenCalled();
    });

    it('forwards a name-only patch to the service without touching the category service', async () => {
      const { activityService, categoryService, personService } = buildMocks();
      activityService.updateActivity.mockResolvedValue();
      activityService.findByID.mockResolvedValue({ name: 'renamed' });

      const handler = new ActivityRequestHandlerImpl(activityService, categoryService, personService);
      const result = await handler.handleUpdate({ name: 'renamed' }, 1);

      expect(categoryService.findByID).not.toHaveBeenCalled();
      expect(activityService.updateActivity).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'renamed' }),
        1
      );
      expect(result.name).toBe('renamed');
    });

    it('resolves the category by id and forwards the resolved patch to updateActivity', async () => {
      const { activityService, categoryService, personService } = buildMocks();
      const category = new CategoryDTO({ id: 7, name: 'food' });
      categoryService.findByID.mockResolvedValue(category);
      activityService.updateActivity.mockResolvedValue();
      activityService.findByID.mockResolvedValue({ name: 'renamed', address: 5, category });

      const handler = new ActivityRequestHandlerImpl(activityService, categoryService, personService);
      const result = await handler.handleUpdate(
        { name: 'renamed', address: 5, category: 7 },
        1
      );

      expect(categoryService.findByID).toHaveBeenCalledWith(7);
      expect(activityService.updateActivity).toHaveBeenCalledTimes(1);
      const forwarded = activityService.updateActivity.mock.calls[0][0];
      expect(forwarded.name).toBe('renamed');
      expect(forwarded.address).toBe(5);
      expect(forwarded.category).toBe(category);
      expect('categoryId' in forwarded).toBe(false);
      expect(result.category).toBe(category);
    });

    it('throws NotFoundError when the category does not exist', async () => {
      const { activityService, categoryService, personService } = buildMocks();
      categoryService.findByID.mockResolvedValue(null);

      const handler = new ActivityRequestHandlerImpl(activityService, categoryService, personService);
      await expect(
        handler.handleUpdate({ name: 'x', category: 999 }, 1)
      ).rejects.toBeInstanceOf(NotFoundError);
      expect(activityService.updateActivity).not.toHaveBeenCalled();
    });

    it('forwards a category-only patch (without name/address)', async () => {
      const { activityService, categoryService, personService } = buildMocks();
      const category = new CategoryDTO({ id: 7, name: 'food' });
      categoryService.findByID.mockResolvedValue(category);
      activityService.updateActivity.mockResolvedValue();

      const handler = new ActivityRequestHandlerImpl(activityService, categoryService, personService);
      await handler.handleUpdate({ category: 7 }, 1);

      const forwarded = activityService.updateActivity.mock.calls[0][0];
      expect(forwarded.category).toBe(category);
      expect(forwarded.name).toBeUndefined();
      expect(forwarded.address).toBeUndefined();
    });
  });

  it('handleDelete delegates to deleteActivity', async () => {
    const { activityService, categoryService, personService } = buildMocks();
    activityService.deleteActivity.mockResolvedValue();
    const handler = new ActivityRequestHandlerImpl(activityService, categoryService, personService);
    await handler.handleDelete(1);
    expect(activityService.deleteActivity).toHaveBeenCalledWith(1);
  });
});
