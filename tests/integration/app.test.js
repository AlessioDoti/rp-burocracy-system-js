import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import request from 'supertest';
import { createApp } from '../../src/app.js';
import { ActivityDTO } from '../../src/domain/dto/ActivityDTO.js';
import { CategoryDTO } from '../../src/domain/dto/CategoryDTO.js';
import { CategoryTaxDTO } from '../../src/domain/dto/CategoryTaxDTO.js';
import { TaxDTO } from '../../src/domain/dto/TaxDTO.js';
import { PersonDTO } from '../../src/domain/dto/PersonDTO.js';
import { Page } from '../../src/domain/dto/Page.js';
import { ActivityRequestHandlerImpl } from '../../src/domain/requesthandler/ActivityRequestHandlerImpl.js';
import { CategoryRequestHandlerImpl } from '../../src/domain/requesthandler/CategoryRequestHandlerImpl.js';
import { TaxRequestHandlerImpl } from '../../src/domain/requesthandler/TaxRequestHandlerImpl.js';
import { ActivityService } from '../../src/domain/service/ActivityService.js';
import { CategoryService } from '../../src/domain/service/CategoryService.js';
import { TaxService } from '../../src/domain/service/TaxService.js';
import { PersonServiceImpl } from '../../src/personmock/service/PersonServiceImpl.js';
import { ActivityDTOFactory } from '../../src/rest/factory/ActivityDTOFactory.js';
import { CategoryDTOFactory } from '../../src/rest/factory/CategoryDTOFactory.js';
import { TaxDTOFactory } from '../../src/rest/factory/TaxDTOFactory.js';

/**
 * Build a complete container whose persistence layer is fully in-memory.
 * Mirrors the same shape that buildContainer() would produce against MySQL,
 * but with jest.fn() implementations of the persistence services.
 */
function buildInMemoryContainer() {
  const activityStore = new Map();
  const categoryStore = new Map();
  const taxStore = new Map();
  let nextActivity = 1;
  let nextCategory = 1;
  let nextTax = 1;

  const activityPersistenceService = {
    findAll: jest.fn(async (pageable) => {
      const data = Array.from(activityStore.values())
        .slice(pageable.offset, pageable.offset + pageable.size);
      return new Page(data, pageable.page, pageable.size, activityStore.size);
    }),
    saveActivity: jest.fn(async (dto) => {
      if (!dto.id) dto.id = nextActivity++;
      activityStore.set(dto.id, dto);
      return dto;
    }),
    findByID: jest.fn(async (id) => activityStore.get(id) ?? null),
    deleteActivity: jest.fn(async (id) => {
      // Mirrors ActivityRepository.deleteCascadingById: wipe the
      // activity's taxes first, then the activity itself. No real
      // transaction here — the in-memory store has no atomicity
      // concerns.
      for (const [taxId, tax] of taxStore) {
        if (tax.activity?.id === Number(id)) taxStore.delete(taxId);
      }
      activityStore.delete(Number(id));
    })
  };

  const categoryPersistenceService = {
    saveCategory: jest.fn(async (dto) => {
      if (!dto.id) dto.id = nextCategory++;
      categoryStore.set(dto.id, dto);
      return dto;
    }),
    findByID: jest.fn(async (id) => categoryStore.get(id) ?? null),
    deleteCategory: jest.fn(async (id) => {
      // Simulate the MySQL ER_ROW_IS_REFERENCED_2 error: cannot delete a
      // category that is still referenced by an activity.
      const referenced = Array.from(activityStore.values())
        .some((a) => a.category?.id === id);
      if (referenced) {
        const err = new Error('FK constraint fails');
        err.code = 'ER_ROW_IS_REFERENCED_2';
        err.errno = 1451;
        err.sqlState = '23000';
        err.sqlMessage =
          "Cannot delete or update a parent row: a foreign key constraint fails " +
          "(`burocracy`.`FK_ACTIVITY_CATEGORY`, CONSTRAINT `FK_ACTIVITY_CATEGORY` " +
          "FOREIGN KEY (`CATEGORY_ID`) REFERENCES `CATEGORY` (`id`))";
        throw err;
      }
      categoryStore.delete(id);
    }),
    findAll: jest.fn(async (pageable) => {
      const data = Array.from(categoryStore.values())
        .slice(pageable.offset, pageable.offset + pageable.size);
      return new Page(data, pageable.page, pageable.size, categoryStore.size);
    })
  };

  const taxPersistenceService = {
    saveTax: jest.fn(async (dto) => {
      if (!dto.taxId) dto.taxId = nextTax++;
      taxStore.set(dto.taxId, dto);
      return dto;
    }),
    findTaxByID: jest.fn(async (id) => taxStore.get(id) ?? null),
    findActivityTaxes: jest.fn(async (activityId, pageable) => {
      const filtered = Array.from(taxStore.values())
        .filter((t) => t.activity?.id === Number(activityId));
      const data = filtered.slice(pageable.offset, pageable.offset + pageable.size);
      return new Page(data, pageable.page, pageable.size, filtered.length);
    }),
    findAllTaxes: jest.fn(async (pageable) => {
      const data = Array.from(taxStore.values())
        .slice(pageable.offset, pageable.offset + pageable.size);
      return new Page(data, pageable.page, pageable.size, taxStore.size);
    }),
    getElapsedDays: jest.fn(async () => 0)
  };

  const categoryService = new CategoryService(categoryPersistenceService);
  const activityService = new ActivityService(activityPersistenceService);
  const taxService = new TaxService(taxPersistenceService);
  const personService = new PersonServiceImpl();

  return {
    activityRequestHandler: new ActivityRequestHandlerImpl(activityService, categoryService),
    categoryRequestHandler: new CategoryRequestHandlerImpl(categoryService),
    taxRequestHandler: new TaxRequestHandlerImpl(activityService, personService, taxService),
    activityDTOFactory: new ActivityDTOFactory(),
    categoryDTOFactory: new CategoryDTOFactory(),
    taxDTOFactory: new TaxDTOFactory(),
    // expose for assertions
    activityPersistenceService,
    categoryPersistenceService,
    taxPersistenceService,
    stores: { activityStore, categoryStore, taxStore }
  };
}

describe('HTTP integration (Supertest, in-memory container)', () => {
  let app;
  let container;

  beforeEach(() => {
    container = buildInMemoryContainer();
    ({ app } = createApp({
      container: {
        handlers: {
          activityRequestHandler: container.activityRequestHandler,
          categoryRequestHandler: container.categoryRequestHandler,
          taxRequestHandler: container.taxRequestHandler
        },
        factories: {
          activityDTOFactory: container.activityDTOFactory,
          categoryDTOFactory: container.categoryDTOFactory,
          taxDTOFactory: container.taxDTOFactory
        },
        services: {},
        persistence: {},
        repositories: {},
        mappers: {},
        pool: {}
      }
    }));
  });

  describe('Category', () => {
    it('POST /category creates a category with taxes', async () => {
      const res = await request(app)
        .post('/category')
        .send({
          name: 'food',
          categoryTaxes: [{ amount: 1000, rate: 10 }, { amount: 5000, rate: 20 }]
        });
      expect(res.status).toBe(200);
      expect(res.body.name).toBe('food');
      expect(res.body.id).toBeDefined();
      expect(res.body.categoryTaxes).toHaveLength(2);
    });

    it('POST /category rejects a category without a name with 400', async () => {
      const res = await request(app)
        .post('/category')
        .send({ categoryTaxes: [] });
      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('GET /category returns a Page envelope', async () => {
      await request(app).post('/category').send({ name: 'a', categoryTaxes: [] });
      const res = await request(app).get('/category');
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('data');
      expect(res.body).toHaveProperty('total');
      expect(res.body).toHaveProperty('page');
      expect(res.body).toHaveProperty('size');
    });

    it('PUT /category/:id updates an existing category', async () => {
      const created = await request(app).post('/category').send({ name: 'a', categoryTaxes: [] });
      const id = created.body.id;
      const res = await request(app)
        .put(`/category/${id}`)
        .send({ name: 'a-renamed', categoryTaxes: [{ amount: 1, rate: 1 }] });
      expect(res.status).toBe(200);
      expect(res.body.name).toBe('a-renamed');
    });

    it('PUT /category/:id returns 404 for an unknown id', async () => {
      const res = await request(app)
        .put('/category/9999')
        .send({ name: 'x', categoryTaxes: [] });
      expect(res.status).toBe(404);
    });

    it('DELETE /category returns 200 and removes the row', async () => {
      const created = await request(app).post('/category').send({ name: 'a', categoryTaxes: [] });
      const id = created.body.id;
      const del = await request(app).delete(`/category/${id}`);
      expect(del.status).toBe(200);
      const list = await request(app).get('/category');
      expect(list.body.total).toBe(0);
    });

    it('DELETE /category returns 409 FOREIGN_KEY_VIOLATION when activities still reference it', async () => {
      const created = await request(app)
        .post('/category')
        .send({ name: 'parent', categoryTaxes: [{ amount: 1, rate: 1 }] });
      const id = created.body.id;
      await request(app)
        .post(`/activity/${id}`)
        .send({ name: 'child', address: 1 });

      const del = await request(app).delete(`/category/${id}`);
      expect(del.status).toBe(409);
      expect(del.body.error.code).toBe('FOREIGN_KEY_VIOLATION');
      expect(del.body.error.message).toMatch(/FK_ACTIVITY_CATEGORY/);
      expect(del.body.error.details).toEqual({
        constraint: 'FK_ACTIVITY_CATEGORY',
        foreignKeyColumn: 'CATEGORY_ID',
        referencedTable: 'CATEGORY',
        referencedColumn: 'id'
      });
    });
  });

  describe('Activity', () => {
    let categoryId;

    beforeEach(async () => {
      const created = await request(app).post('/category').send({
        name: 'retail',
        categoryTaxes: [{ amount: 1000, rate: 10 }, { amount: 5000, rate: 20 }]
      });
      categoryId = created.body.id;
    });

    it('POST /activity/:categoryId creates an activity', async () => {
      const res = await request(app)
        .post(`/activity/${categoryId}`)
        .send({ name: 'shop-1', address: 42 });
      expect(res.status).toBe(200);
      expect(res.body.name).toBe('shop-1');
      expect(res.body.address).toBe(42);
      expect(res.body.category.id).toBe(categoryId);
    });

    it('POST /activity rejects an activity with no name (Zod validation)', async () => {
      const res = await request(app)
        .post(`/activity/${categoryId}`)
        .send({ address: 1 });
      expect(res.status).toBe(400);
    });

    it('PATCH /activity/:id updates all three fields when the body carries them', async () => {
      const otherCategory = await request(app)
        .post('/category')
        .send({ name: 'food', categoryTaxes: [{ amount: 1, rate: 1 }] });

      const created = await request(app)
        .post(`/activity/${categoryId}`)
        .send({ name: 'shop-1', address: 42 });
      const id = created.body.id;

      const res = await request(app)
        .patch(`/activity/${id}`)
        .send({
          name: 'shop-1-renamed',
          address: 7,
          category: otherCategory.body.id
        });

      expect(res.status).toBe(200);
      expect(res.body.name).toBe('shop-1-renamed');
      expect(res.body.address).toBe(7);
      expect(res.body.category.id).toBe(otherCategory.body.id);
    });

    it('PATCH /activity/:id updates only the name when the body carries only the name', async () => {
      const created = await request(app)
        .post(`/activity/${categoryId}`)
        .send({ name: 'shop-1', address: 42 });
      const id = created.body.id;

      const res = await request(app).patch(`/activity/${id}`).send({ name: 'renamed-only' });

      expect(res.status).toBe(200);
      expect(res.body.name).toBe('renamed-only');
      expect(res.body.address).toBe(42); // preserved
      expect(res.body.category.id).toBe(categoryId); // preserved
    });

    it('PATCH /activity/:id updates only the address when the body carries only the address', async () => {
      const created = await request(app)
        .post(`/activity/${categoryId}`)
        .send({ name: 'shop-1', address: 42 });
      const id = created.body.id;

      const res = await request(app).patch(`/activity/${id}`).send({ address: 0 });

      expect(res.status).toBe(200);
      expect(res.body.address).toBe(0);
      expect(res.body.name).toBe('shop-1'); // preserved
    });

    it('PATCH /activity/:id updates only the category when the body carries only the category', async () => {
      const otherCategory = await request(app)
        .post('/category')
        .send({ name: 'food', categoryTaxes: [{ amount: 1, rate: 1 }] });
      const created = await request(app)
        .post(`/activity/${categoryId}`)
        .send({ name: 'shop-1', address: 42 });
      const id = created.body.id;

      const res = await request(app)
        .patch(`/activity/${id}`)
        .send({ category: otherCategory.body.id });

      expect(res.status).toBe(200);
      expect(res.body.category.id).toBe(otherCategory.body.id);
      expect(res.body.name).toBe('shop-1'); // preserved
      expect(res.body.address).toBe(42); // preserved
    });

    it('PATCH /activity/:id returns 404 when the category does not exist', async () => {
      const created = await request(app)
        .post(`/activity/${categoryId}`)
        .send({ name: 'shop-1', address: 42 });
      const id = created.body.id;

      const res = await request(app)
        .patch(`/activity/${id}`)
        .send({ name: 'shop-1', address: 42, category: 9999 });

      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('NOT_FOUND');
    });

    it('PATCH /activity/:id returns 400 when the body is empty', async () => {
      const created = await request(app)
        .post(`/activity/${categoryId}`)
        .send({ name: 'shop-1', address: 42 });
      const id = created.body.id;

      const res = await request(app).patch(`/activity/${id}`).send({});
      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('PATCH /activity/:id returns 400 when address is the wrong type', async () => {
      const created = await request(app)
        .post(`/activity/${categoryId}`)
        .send({ name: 'shop-1', address: 42 });
      const id = created.body.id;

      const res = await request(app).patch(`/activity/${id}`).send({ address: 'not-a-number' });
      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('PATCH /activity/:id returns 404 for an unknown id', async () => {
      const res = await request(app)
        .patch('/activity/9999')
        .send({ name: 'x', address: 1, category: categoryId });
      expect(res.status).toBe(404);
    });

    it('GET /activity returns a paginated list', async () => {
      await request(app).post(`/activity/${categoryId}`).send({ name: 's1', address: 1 });
      await request(app).post(`/activity/${categoryId}`).send({ name: 's2', address: 2 });
      const res = await request(app).get('/activity?size=1');
      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.total).toBe(2);
      expect(res.body.totalPages).toBe(2);
    });
  });

  describe('Tax', () => {
    let categoryId;
    let activityId;

    beforeEach(async () => {
      const cat = await request(app).post('/category').send({
        name: 'food',
        categoryTaxes: [{ amount: 1000, rate: 10 }, { amount: 5000, rate: 20 }]
      });
      categoryId = cat.body.id;
      const act = await request(app)
        .post(`/activity/${categoryId}`)
        .send({ name: 'shop-1', address: 42 });
      activityId = act.body.id;
    });

    it('POST /tax/:activity creates a tax with computed fields', async () => {
      const res = await request(app)
        .post(`/tax/${activityId}`)
        .send({ earnings: 3000, expenses: 500, managerName: 'Mario', managerSurname: 'Rossi' });
      expect(res.status).toBe(200);
      expect(res.body.revenue).toBe(2500);
      // taxRate is derived from the activity's category brackets on every
      // request — it is NOT a field of the tax declaration.
      expect(res.body).not.toHaveProperty('taxRate');
      // taxableIncome = revenue × bracketRate / 100 = 2500 × 10 / 100 = 250
      expect(res.body.taxableIncome).toBe(250);
      // taxAmount = taxableIncome + elapsedBillAmount = 250 + 0 = 250
      expect(res.body.taxAmount).toBe(250);
      expect(res.body.manager.name).toBe('Mario');
      expect(res.body.manager.role).toBe('MANAGER');
    });

    it('POST /tax/:activity succeeds even without manager fields (mock person always returns MANAGER)', async () => {
      // Mirrors the Java behaviour: the PersonService mock always returns a
      // placeholder PersonDTO with role MANAGER, so the service never sees a
      // missing manager. Validation happens AFTER the handler sets it.
      const res = await request(app)
        .post(`/tax/${activityId}`)
        .send({ earnings: 100, expenses: 0 });
      expect(res.status).toBe(200);
      expect(res.body.manager.role).toBe('MANAGER');
    });

    it('PATCH /tax/:id updates only the fields the body carries (true PATCH semantics)', async () => {
      const created = await request(app)
        .post(`/tax/${activityId}`)
        .send({ earnings: 3000, expenses: 500, managerName: 'a', managerSurname: 'b' });
      const id = created.body.taxId;
      const res = await request(app)
        .patch(`/tax/${id}`)
        .send({ payed: true, elapsedDays: 10 });
      expect(res.status).toBe(200);
      expect(res.body.payed).toBe(true);
      // earnings/expenses were not in the body → kept.
      expect(res.body.earnings).toBe(3000);
      expect(res.body.expenses).toBe(500);
      // elapsedDays patched → recompute kicks in.
      expect(res.body.elapsedDays).toBe(10);
      expect(res.body.elapsedBillAmount).toBe(10 * 15000);
    });

    it('PATCH /tax/:id with literal 0 applies the value (does not silently keep the old one)', async () => {
      const created = await request(app)
        .post(`/tax/${activityId}`)
        .send({ earnings: 3000, expenses: 500, managerName: 'a', managerSurname: 'b' });
      const id = created.body.taxId;
      const res = await request(app)
        .patch(`/tax/${id}`)
        .send({ earnings: 0 });
      expect(res.status).toBe(200);
      // 0 is a real patch value now, not a "no change" sentinel.
      expect(res.body.earnings).toBe(0);
      expect(res.body.expenses).toBe(500);
    });

    it('PATCH /tax/:id with an empty body returns 400', async () => {
      const created = await request(app)
        .post(`/tax/${activityId}`)
        .send({ earnings: 100, expenses: 0, managerName: 'a', managerSurname: 'b' });
      const id = created.body.taxId;
      const res = await request(app).patch(`/tax/${id}`).send({});
      expect(res.status).toBe(400);
    });

    it('PATCH /tax/:id with a wrong type returns 400', async () => {
      const created = await request(app)
        .post(`/tax/${activityId}`)
        .send({ earnings: 100, expenses: 0, managerName: 'a', managerSurname: 'b' });
      const id = created.body.taxId;
      const res = await request(app).patch(`/tax/${id}`).send({ payed: 'yes' });
      expect(res.status).toBe(400);
    });

    it('GET /tax and GET /tax/:activity both return Page envelopes', async () => {
      await request(app)
        .post(`/tax/${activityId}`)
        .send({ earnings: 100, expenses: 10, managerName: 'a', managerSurname: 'b' });

      const all = await request(app).get('/tax');
      expect(all.status).toBe(200);
      expect(all.body.total).toBe(1);

      // GET /tax/:activityId filters by activity id (same contract as POST /tax/:activityId).
      const byActivity = await request(app).get(`/tax/${activityId}`);
      expect(byActivity.status).toBe(200);
      expect(byActivity.body.total).toBe(1);
      expect(byActivity.body.data[0].activity.id).toBe(activityId);

      // A different activity id should not return the previous declarations.
      const otherActivity = categoryId + 1; // any id different from `activityId`
      const empty = await request(app).get(`/tax/${otherActivity}`);
      expect(empty.status).toBe(200);
      expect(empty.body.total).toBe(0);
    });

    it('DELETE /activity/:id cascades to its tax declarations', async () => {
      // File two taxes against the same activity.
      await request(app)
        .post(`/tax/${activityId}`)
        .send({ earnings: 100, expenses: 0, managerName: 'a', managerSurname: 'b' });
      await request(app)
        .post(`/tax/${activityId}`)
        .send({ earnings: 200, expenses: 0, managerName: 'c', managerSurname: 'd' });

      // Sanity: both taxes are on file.
      const before = await request(app).get(`/tax/${activityId}`);
      expect(before.body.total).toBe(2);

      // Delete the activity.
      const del = await request(app).delete(`/activity/${activityId}`);
      expect(del.status).toBe(200);

      // The activity is gone.
      const activityGone = await request(app).get('/activity');
      expect(activityGone.body.total).toBe(0);

      // The taxes filed against it are gone too — cascade worked.
      const taxesAfter = await request(app).get(`/tax/${activityId}`);
      expect(taxesAfter.body.total).toBe(0);
      const allTaxes = await request(app).get('/tax');
      expect(allTaxes.body.total).toBe(0);
    });

    it('DELETE /activity/:id with no taxes still returns 200', async () => {
      // No taxes filed; just delete the activity directly.
      const del = await request(app).delete(`/activity/${activityId}`);
      expect(del.status).toBe(200);
    });
  });

  describe('Global error handler', () => {
    it('returns 404 for an unknown route', async () => {
      const res = await request(app).get('/unknown');
      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('NOT_FOUND');
    });

    it('returns 400 for malformed JSON', async () => {
      const res = await request(app)
        .post('/category')
        .set('Content-Type', 'application/json')
        .send('{not json');
      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('INVALID_JSON');
    });
  });
});
