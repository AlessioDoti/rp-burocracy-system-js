import { describe, it, expect, jest } from '@jest/globals';
import { createCategoryRouter } from '../../../../src/rest/controller/CategoryController.js';
import { CategoryDTO } from '../../../../src/domain/dto/CategoryDTO.js';
import { Page } from '../../../../src/domain/dto/Page.js';

describe('CategoryController', () => {
  const buildMocks = () => {
    const factory = { getDTO: jest.fn() };
    const handler = {
      handleInsert: jest.fn(),
      handleUpdate: jest.fn(),
      handleFindAll: jest.fn(),
      handleDelete: jest.fn()
    };
    const router = createCategoryRouter({ factory, handler });
    return { factory, handler, router };
  };

  const findHandler = (router, method, path) => {
    for (const layer of router.stack) {
      if (layer.route && layer.route.path === path && layer.route.methods[method]) {
        return layer.route;
      }
    }
    return null;
  };

  it('POST / maps body to DTO and delegates to handleInsert', async () => {
    const { factory, handler, router } = buildMocks();
    const dto = new CategoryDTO({ name: 'food' });
    factory.getDTO.mockReturnValue(dto);
    handler.handleInsert.mockResolvedValue({ id: 1, name: 'food' });

    const req = { body: { name: 'food', categoryTaxes: [] }, user: { roles: ['ADMIN'] } };
    const res = { status: jest.fn(() => res), json: jest.fn() };
    const next = jest.fn();

    const route = findHandler(router, 'post', '/');
    await route.stack[route.stack.length - 1].handle(req, res, next);

    expect(factory.getDTO).toHaveBeenCalled();
    expect(handler.handleInsert).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it('POST / throws when handler throws, delegates to next(err)', async () => {
    const { factory, handler, router } = buildMocks();
    const error = new Error('insert failed');
    factory.getDTO.mockReturnValue({});
    handler.handleInsert.mockRejectedValue(error);

    const req = { body: {}, user: { roles: ['ADMIN'] } };
    const res = { status: jest.fn(() => res), json: jest.fn() };
    const next = jest.fn();

    const route = findHandler(router, 'post', '/');
    await route.stack[route.stack.length - 1].handle(req, res, next);

    expect(next).toHaveBeenCalledWith(error);
  });

  it('PUT /:id maps body and id, delegates to handleUpdate', async () => {
    const { factory, handler, router } = buildMocks();
    const dto = new CategoryDTO({ name: 'updated' });
    factory.getDTO.mockReturnValue(dto);
    handler.handleUpdate.mockResolvedValue({ id: 1, name: 'updated' });

    const req = { body: { name: 'updated' }, params: { id: '1' }, user: { roles: ['ADMIN'] } };
    const res = { status: jest.fn(() => res), json: jest.fn() };
    const next = jest.fn();

    const route = findHandler(router, 'put', '/:id');
    await route.stack[route.stack.length - 1].handle(req, res, next);

    expect(handler.handleUpdate).toHaveBeenCalledWith(dto, 1);
  });

  it('GET / builds pageable and delegates to handleFindAll', async () => {
    const { factory, handler, router } = buildMocks();
    const page = new Page([], 0, 20, 0);
    handler.handleFindAll.mockResolvedValue(page);

    const req = { query: { page: '0', size: '20' }, user: { roles: ['ADMIN'] } };
    const res = { status: jest.fn(() => res), json: jest.fn() };
    const next = jest.fn();

    const route = findHandler(router, 'get', '/');
    await route.stack[route.stack.length - 1].handle(req, res, next);

    expect(handler.handleFindAll).toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith(page.toJSON());
  });

  it('DELETE /:id delegates to handleDelete', async () => {
    const { factory, handler, router } = buildMocks();
    handler.handleDelete.mockResolvedValue();

    const req = { params: { id: '5' }, user: { roles: ['ADMIN'] } };
    const res = { status: jest.fn(() => res), json: jest.fn(), send: jest.fn() };
    const next = jest.fn();

    const route = findHandler(router, 'delete', '/:id');
    await route.stack[route.stack.length - 1].handle(req, res, next);

    expect(handler.handleDelete).toHaveBeenCalledWith(5);
  });
});
