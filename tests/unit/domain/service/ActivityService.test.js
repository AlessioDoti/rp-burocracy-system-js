import { describe, it, expect, jest } from '@jest/globals';
import { ActivityService } from '../../../../src/domain/service/ActivityService.js';
import { ActivityDTO } from '../../../../src/domain/dto/ActivityDTO.js';
import { CategoryDTO } from '../../../../src/domain/dto/CategoryDTO.js';
import { NotFoundError, ValidationError } from '../../../../src/domain/error/AppError.js';

const buildPortMock = () => ({
  findAll: jest.fn(),
  saveActivity: jest.fn(),
  findByID: jest.fn(),
  deleteActivity: jest.fn()
});

describe('ActivityService', () => {
  it('delegates findAll to the persistence port', async () => {
    const port = buildPortMock();
    port.findAll.mockResolvedValue('PAGE');
    const service = new ActivityService(port);
    await expect(service.findAll({ page: 0, size: 10, sort: null, offset: 0 })).resolves.toBe('PAGE');
  });

  describe('insertActivity', () => {
    it('validates the DTO before persisting on insert', async () => {
      const port = buildPortMock();
      const service = new ActivityService(port);
      // missing name -> should fail validation
      await expect(service.insertActivity(new ActivityDTO({ address: 1 }))).rejects.toBeInstanceOf(ValidationError);
      expect(port.saveActivity).not.toHaveBeenCalled();
    });

    it('persists the DTO after validation passes', async () => {
      const port = buildPortMock();
      port.saveActivity.mockResolvedValue('SAVED');
      const service = new ActivityService(port);
      const result = await service.insertActivity(
        new ActivityDTO({ name: 'shop', address: 1, category: new CategoryDTO({ id: 1, name: 'retail' }) })
      );
      expect(result).toBe('SAVED');
      expect(port.saveActivity).toHaveBeenCalledTimes(1);
    });
  });

  describe('updateActivity (partial update / PATCH semantics)', () => {
    it('throws NotFoundError when the activity does not exist', async () => {
      const port = buildPortMock();
      port.findByID.mockResolvedValue(null);
      const service = new ActivityService(port);
      await expect(service.updateActivity({ name: 'x' }, 99))
        .rejects.toBeInstanceOf(NotFoundError);
    });

    it('applies only the name when the patch is name-only', async () => {
      const port = buildPortMock();
      const existing = new ActivityDTO({
        id: 1, name: 'old', address: 7, category: new CategoryDTO({ id: 1, name: 'retail' })
      });
      port.findByID.mockResolvedValue(existing);
      port.saveActivity.mockImplementation(async (dto) => dto);
      const service = new ActivityService(port);

      const result = await service.updateActivity({ name: 'new' }, 1);

      expect(result.name).toBe('new');
      expect(result.address).toBe(7); // preserved
      expect(result.category.id).toBe(1); // preserved
    });

    it('applies only the address when the patch is address-only (and accepts 0)', async () => {
      const port = buildPortMock();
      const existing = new ActivityDTO({
        id: 1, name: 'shop', address: 7, category: new CategoryDTO({ id: 1, name: 'retail' })
      });
      port.findByID.mockResolvedValue(existing);
      port.saveActivity.mockImplementation(async (dto) => dto);
      const service = new ActivityService(port);

      const result = await service.updateActivity({ address: 0 }, 1);

      expect(result.address).toBe(0); // explicitly set to 0
      expect(result.name).toBe('shop'); // preserved
    });

    it('applies only the category when the patch is category-only', async () => {
      const port = buildPortMock();
      const oldCategory = new CategoryDTO({ id: 1, name: 'retail' });
      const newCategory = new CategoryDTO({ id: 2, name: 'food' });
      const existing = new ActivityDTO({ id: 1, name: 'shop', address: 7, category: oldCategory });
      port.findByID.mockResolvedValue(existing);
      port.saveActivity.mockImplementation(async (dto) => dto);
      const service = new ActivityService(port);

      const result = await service.updateActivity({ category: newCategory }, 1);

      expect(result.category).toBe(newCategory);
      expect(result.name).toBe('shop'); // preserved
      expect(result.address).toBe(7); // preserved
    });

    it('applies every provided field when the patch carries all three', async () => {
      const port = buildPortMock();
      const oldCategory = new CategoryDTO({ id: 1, name: 'retail' });
      const newCategory = new CategoryDTO({ id: 2, name: 'food' });
      const existing = new ActivityDTO({ id: 1, name: 'old', address: 1, category: oldCategory });
      port.findByID.mockResolvedValue(existing);
      port.saveActivity.mockImplementation(async (dto) => dto);
      const service = new ActivityService(port);

      const result = await service.updateActivity(
        { name: 'new', address: 99, category: newCategory },
        1
      );

      expect(result.name).toBe('new');
      expect(result.address).toBe(99);
      expect(result.category).toBe(newCategory);
    });

    it('does not re-validate the patch (handler is responsible for request-shape validation)', async () => {
      const port = buildPortMock();
      const existing = new ActivityDTO({
        id: 1, name: 'shop', address: 7, category: new CategoryDTO({ id: 1, name: 'retail' })
      });
      port.findByID.mockResolvedValue(existing);
      port.saveActivity.mockImplementation(async (dto) => dto);
      const service = new ActivityService(port);

      // The patch only carries `name`. The service applies it without
      // raising a "Category must be set" error (which the insert
      // schema would otherwise produce).
      await expect(service.updateActivity({ name: 'renamed' }, 1))
        .resolves.toBeInstanceOf(ActivityDTO);
      expect(port.saveActivity).toHaveBeenCalledTimes(1);
    });
  });

  it('delegates deleteActivity to the persistence port', async () => {
    const port = buildPortMock();
    port.deleteActivity.mockResolvedValue();
    const service = new ActivityService(port);
    await service.deleteActivity(1);
    expect(port.deleteActivity).toHaveBeenCalledWith(1);
  });
});
