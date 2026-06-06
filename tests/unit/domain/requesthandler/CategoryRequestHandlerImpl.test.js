import { describe, it, expect, jest } from '@jest/globals';
import { CategoryRequestHandlerImpl } from '../../../../src/domain/requesthandler/CategoryRequestHandlerImpl.js';

const buildMock = () => ({
  findAll: jest.fn(),
  findByID: jest.fn(),
  insertCategory: jest.fn(),
  deleteCategory: jest.fn(),
  updateCategory: jest.fn()
});

describe('CategoryRequestHandlerImpl', () => {
  it('handleFindAll delegates to the category service', async () => {
    const svc = buildMock();
    svc.findAll.mockResolvedValue('PAGE');
    const handler = new CategoryRequestHandlerImpl(svc);
    await expect(handler.handleFindAll({ page: 0, size: 10 })).resolves.toBe('PAGE');
  });

  it('handleInsert delegates to insertCategory', async () => {
    const svc = buildMock();
    svc.insertCategory.mockResolvedValue('OK');
    const handler = new CategoryRequestHandlerImpl(svc);
    await expect(handler.handleInsert({})).resolves.toBe('OK');
  });

  it('handleUpdate delegates to updateCategory with the id', async () => {
    const svc = buildMock();
    svc.updateCategory.mockResolvedValue('OK');
    const handler = new CategoryRequestHandlerImpl(svc);
    await expect(handler.handleUpdate({}, 1)).resolves.toBe('OK');
    expect(svc.updateCategory).toHaveBeenCalledWith({}, 1);
  });

  it('handleDelete delegates to deleteCategory', async () => {
    const svc = buildMock();
    svc.deleteCategory.mockResolvedValue();
    const handler = new CategoryRequestHandlerImpl(svc);
    await handler.handleDelete(1);
    expect(svc.deleteCategory).toHaveBeenCalledWith(1);
  });
});
