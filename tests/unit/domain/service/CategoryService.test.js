import { describe, it, expect, jest } from '@jest/globals';
import { CategoryService } from '../../../../src/domain/service/CategoryService.js';
import { CategoryDTO } from '../../../../src/domain/dto/CategoryDTO.js';
import { CategoryTaxDTO } from '../../../../src/domain/dto/CategoryTaxDTO.js';
import { NotFoundError, ValidationError } from '../../../../src/domain/error/AppError.js';

const buildPortMock = () => ({
  saveCategory: jest.fn(),
  findByID: jest.fn(),
  deleteCategory: jest.fn(),
  findAll: jest.fn()
});

describe('CategoryService', () => {
  it('rejects inserts whose name is missing', async () => {
    const port = buildPortMock();
    const service = new CategoryService(port);
    await expect(service.insertCategory(new CategoryDTO())).rejects.toBeInstanceOf(ValidationError);
  });

  it('persists the DTO after validation', async () => {
    const port = buildPortMock();
    port.saveCategory.mockResolvedValue('SAVED');
    const service = new CategoryService(port);
    const result = await service.insertCategory(new CategoryDTO({ name: 'food' }));
    expect(result).toBe('SAVED');
  });

  it('throws NotFoundError when updating a missing category', async () => {
    const port = buildPortMock();
    port.findByID.mockResolvedValue(null);
    const service = new CategoryService(port);
    await expect(service.updateCategory(new CategoryDTO({ name: 'x' }), 1))
      .rejects.toBeInstanceOf(NotFoundError);
  });

  it('overwrites name and categoryTaxes on the existing DTO before saving', async () => {
    const port = buildPortMock();
    const existing = new CategoryDTO({
      id: 1,
      name: 'old',
      categoryTaxes: [new CategoryTaxDTO({ id: 1, amount: 100, rate: 5 })]
    });
    port.findByID.mockResolvedValue(existing);
    port.saveCategory.mockImplementation(async (dto) => dto);
    const service = new CategoryService(port);

    const updated = await service.updateCategory(
      new CategoryDTO({
        name: 'new',
        categoryTaxes: [new CategoryTaxDTO({ id: 2, amount: 200, rate: 10 })]
      }),
      1
    );

    expect(updated.name).toBe('new');
    expect(updated.categoryTaxes).toHaveLength(1);
    expect(updated.categoryTaxes[0].amount).toBe(200);
  });
});
