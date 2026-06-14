import { describe, it, expect, jest } from '@jest/globals';
import { createActivityRouter } from '../../../../src/rest/controller/ActivityController.js';
import { ActivityDTO } from '../../../../src/domain/dto/ActivityDTO.js';
import { Page } from '../../../../src/domain/dto/Page.js';

describe('ActivityController', () => {
  const buildMocks = () => {
    const factory = { getDTO: jest.fn() };
    const handler = {
      handleInsert: jest.fn(),
      handleUpdate: jest.fn(),
      handleFindAll: jest.fn(),
      handleFindByID: jest.fn(),
      handleFindByEmployeeUuid: jest.fn(),
      handleDelete: jest.fn()
    };
    const router = createActivityRouter({ factory, handler });
    return { factory, handler, router };
  };

  const findRoute = (router, method, path) => {
    for (const layer of router.stack) {
      if (layer.route && layer.route.path === path && layer.route.methods[method]) {
        return layer.route;
      }
    }
    return null;
  };

  it('POST /:categoryId builds DTO and delegates to handleInsert', async () => {
    const { factory, handler, router } = buildMocks();
    const dto = new ActivityDTO({ name: 'shop', address: 42 });
    factory.getDTO.mockReturnValue(dto);
    handler.handleInsert.mockResolvedValue({ id: 1 });

    const req = {
      body: { name: 'shop', address: 42 },
      params: { categoryId: '7' },
      user: { roles: ['ADMIN'] }
    };
    const res = { status: jest.fn(() => res), json: jest.fn() };
    const next = jest.fn();

    const route = findRoute(router, 'post', '/:categoryId');
    await route.stack[route.stack.length - 1].handle(req, res, next);

    expect(handler.handleInsert).toHaveBeenCalledWith(dto, 7);
    expect(res.status).toHaveBeenCalledWith(201);
  });

  it('PATCH /:id builds patch and delegates to handleUpdate', async () => {
    const { factory, handler, router } = buildMocks();
    const patch = { name: 'renamed' };
    factory.getDTO.mockReturnValue(patch);
    handler.handleUpdate.mockResolvedValue({ id: 1 });

    const req = {
      body: { name: 'renamed' },
      params: { id: '1' },
      user: { roles: ['ADMIN'], userId: 1 }
    };
    const res = { status: jest.fn(() => res), json: jest.fn() };
    const next = jest.fn();

    const route = findRoute(router, 'patch', '/:id');
    await route.stack[route.stack.length - 1].handle(req, res, next);

    expect(handler.handleUpdate).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it('GET / returns paginated results', async () => {
    const { factory, handler, router } = buildMocks();
    const page = new Page([], 0, 20, 0);
    handler.handleFindAll.mockResolvedValue(page);

    const req = { query: {}, user: { roles: ['ADMIN'] } };
    const res = { status: jest.fn(() => res), json: jest.fn() };
    const next = jest.fn();

    const route = findRoute(router, 'get', '/');
    await route.stack[route.stack.length - 1].handle(req, res, next);

    expect(res.json).toHaveBeenCalledWith(page.toJSON());
  });

  it('GET /employee/:uuid delegates to handleFindByEmployeeUuid', async () => {
    const { factory, handler, router } = buildMocks();
    handler.handleFindByEmployeeUuid.mockResolvedValue([]);

    const req = { params: { uuid: 'abc-123' }, user: { roles: ['ADMIN'], userId: 1 } };
    const res = { status: jest.fn(() => res), json: jest.fn() };
    const next = jest.fn();

    const route = findRoute(router, 'get', '/employee/:uuid');
    await route.stack[route.stack.length - 1].handle(req, res, next);

    expect(handler.handleFindByEmployeeUuid).toHaveBeenCalled();
  });

  it('GET /:id returns 404 when activity not found', async () => {
    const { factory, handler, router } = buildMocks();
    handler.handleFindByID.mockResolvedValue(null);

    const req = { params: { id: '999' }, user: { roles: ['ADMIN'], userId: 1 } };
    const res = { status: jest.fn(() => res), json: jest.fn() };
    const next = jest.fn();

    const routes = router.stack.filter((l) => l.route && l.route.path === '/:id' && l.route.methods.get);
    const route = routes[routes.length - 1].route;
    await route.stack[route.stack.length - 1].handle(req, res, next);

    expect(res.status).toHaveBeenCalledWith(404);
  });

  it('DELETE /:id delegates to handleDelete and returns 204', async () => {
    const { factory, handler, router } = buildMocks();
    handler.handleDelete.mockResolvedValue();

    const req = { params: { id: '5' }, user: { roles: ['ADMIN'] } };
    const res = { status: jest.fn(() => res), json: jest.fn(), end: jest.fn() };
    const next = jest.fn();

    const route = findRoute(router, 'delete', '/:id');
    await route.stack[route.stack.length - 1].handle(req, res, next);

    expect(handler.handleDelete).toHaveBeenCalledWith(5);
    expect(res.status).toHaveBeenCalledWith(204);
  });

  it('passes errors to next() when handlers throw', async () => {
    const { factory, handler, router } = buildMocks();
    const error = new Error('fail');
    handler.handleFindAll.mockRejectedValue(error);

    const req = { query: {}, user: { roles: ['ADMIN'] } };
    const res = { status: jest.fn(() => res), json: jest.fn() };
    const next = jest.fn();

    const route = findRoute(router, 'get', '/');
    await route.stack[route.stack.length - 1].handle(req, res, next);

    expect(next).toHaveBeenCalledWith(error);
  });
});
