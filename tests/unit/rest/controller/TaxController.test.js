import { describe, it, expect, jest } from '@jest/globals';
import { createTaxRouter } from '../../../../src/rest/controller/TaxController.js';
import { TaxDTO } from '../../../../src/domain/dto/TaxDTO.js';
import { Page } from '../../../../src/domain/dto/Page.js';

describe('TaxController', () => {
  const buildMocks = () => {
    const factory = { getDTO: jest.fn() };
    const handler = {
      handleInsert: jest.fn(),
      handleUpdate: jest.fn(),
      handleFindByActivity: jest.fn(),
      handleFindAll: jest.fn()
    };
    const router = createTaxRouter({ factory, handler });
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

  it('POST /:activity builds insert DTO and delegates to handleInsert', async () => {
    const { factory, handler, router } = buildMocks();
    const dto = new TaxDTO({ earnings: 1000, expenses: 200 });
    factory.getDTO.mockReturnValue(dto);
    handler.handleInsert.mockResolvedValue({ taxId: 1 });

    const req = {
      body: { earnings: 1000, expenses: 200, employeeUuid: 'uuid-abc' },
      params: { activity: '5' },
      user: { roles: ['ADMIN'], userId: 1 }
    };
    const res = { status: jest.fn(() => res), json: jest.fn() };
    const next = jest.fn();

    const route = findRoute(router, 'post', '/:activity');
    await route.stack[route.stack.length - 1].handle(req, res, next);

    expect(handler.handleInsert).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it('GET /:activity returns paginated taxes for the activity', async () => {
    const { factory, handler, router } = buildMocks();
    const page = new Page([], 0, 20, 0);
    handler.handleFindByActivity.mockResolvedValue(page);

    const req = {
      params: { activity: 'shop' },
      query: { page: '0', size: '10' },
      user: { roles: ['ADMIN'], userId: 1 }
    };
    const res = { status: jest.fn(() => res), json: jest.fn() };
    const next = jest.fn();

    const route = findRoute(router, 'get', '/:activity');
    await route.stack[route.stack.length - 1].handle(req, res, next);

    expect(handler.handleFindByActivity).toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith(page.toJSON());
  });

  it('PATCH /:id builds update request and delegates to handleUpdate', async () => {
    const { factory, handler, router } = buildMocks();
    const patch = { payed: true };
    factory.getDTO.mockReturnValue(patch);
    handler.handleUpdate.mockResolvedValue({ taxId: 1 });

    const req = {
      body: { payed: true },
      params: { id: '42' },
      user: { roles: ['ADMIN'] }
    };
    const res = { status: jest.fn(() => res), json: jest.fn() };
    const next = jest.fn();

    const route = findRoute(router, 'patch', '/:id');
    await route.stack[route.stack.length - 1].handle(req, res, next);

    expect(handler.handleUpdate).toHaveBeenCalledWith(patch, 42);
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it('GET / returns all taxes paginated', async () => {
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
