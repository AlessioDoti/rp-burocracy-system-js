/***
 * @fileoverview Express router factory for the `/category` resource.
 */

import { Router } from 'express';
import { buildPageable } from '../../domain/dto/Page.js';
import { CategoryRequest } from '../request/impl/CategoryRequest.js';
import { CategoryTaxRequest } from '../request/impl/CategoryTaxRequest.js';
import { requireRole } from '../middleware/requireRole.js';

/**
 * Builds the `/category` router.
 *
 * @param {{
 *   factory: import('../factory/CategoryDTOFactory.js').CategoryDTOFactory,
 *   handler: import('../../domain/port/request/CategoryRequestHandler.js').CategoryRequestHandler
 * }} deps
 * @returns {Router}
 */
export function createCategoryRouter({ factory, handler }) {
  const router = Router();

  /**
   * Builds a `CategoryRequest` from the raw request body.
   * @param {{ name?: string, categoryTaxes?: Array<{ amount?: number, rate?: number }> }} [body]
   * @returns {CategoryRequest}
   */
  const hydrate = (body = {}) => new CategoryRequest({
    name: body.name,
    categoryTaxes: (body.categoryTaxes || []).map((t) => new CategoryTaxRequest({
      amount: t.amount,
      rate: t.rate
    }))
  });

  /**
   * `POST /category` — create a new category with its brackets.
   */
  router.post('/', requireRole('ADMIN'), async (req, res, next) => {
    try {
      const dto = factory.getDTO(hydrate(req.body));
      const result = await handler.handleInsert(dto);
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  });

  /**
   * `PUT /category/:id` — overwrite an existing category. The bracket
   * set is replaced wholesale.
   */
  router.put('/:id', requireRole('ADMIN'), async (req, res, next) => {
    try {
      const dto = factory.getDTO(hydrate(req.body));
      const result = await handler.handleUpdate(dto, Number(req.params.id));
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  });

  /**
   * `GET /category` — list a page of categories.
   */
  router.get('/', requireRole('ADMIN', 'GOVERNMENT'), async (req, res, next) => {
    try {
      const pageable = buildPageable(req.query);
      const page = await handler.handleFindAll(pageable);
      res.status(200).json(page.toJSON());
    } catch (err) {
      next(err);
    }
  });

  /**
   * `DELETE /category/:id` — delete a category.
   */
  router.delete('/:id', requireRole('ADMIN'), async (req, res, next) => {
    try {
      await handler.handleDelete(Number(req.params.id));
      res.status(200).send('');
    } catch (err) {
      next(err);
    }
  });

  return router;
}
