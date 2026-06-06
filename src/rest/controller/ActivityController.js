/**
 * @fileoverview Express router factory for the `/activity` resource.
 *
 * Each handler follows the same pattern: parse the request body into
 * a typed Request, dispatch it to the DTO factory, hand the DTO to the
 * request handler, and serialise the result. Errors are forwarded to
 * `next()` so the global error middleware can map them to HTTP
 * responses.
 */

import { Router } from 'express';
import { buildPageable } from '../../domain/dto/Page.js';
import { InsertActivityRequest } from '../request/impl/InsertActivityRequest.js';
import { UpdateActivityRequest } from '../request/impl/UpdateActivityRequest.js';

/**
 * Builds the `/activity` router.
 *
 * @param {{
 *   factory: import('../factory/ActivityDTOFactory.js').ActivityDTOFactory,
 *   handler: import('../../domain/port/request/ActivityRequestHandler.js').ActivityRequestHandler
 * }} deps
 * @returns {Router}
 */
export function createActivityRouter({ factory, handler }) {
  const router = Router();

  /**
   * `POST /activity/:categoryId` — create a new activity under the
   * given category.
   */
  router.post('/:categoryId', async (req, res, next) => {
    try {
      const body = req.body || {};
      const insertReq = new InsertActivityRequest({
        name: body.name,
        address: body.address,
        managementIds: body.managementIds || []
      });
      const dto = factory.getDTO(insertReq);
      const result = await handler.handleInsert(dto, Number(req.params.categoryId), insertReq.managementIds);
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  });

  /**
   * `PATCH /activity/:id` — partial update of the mutable fields.
   * The body uses the same key for the category as the rest of the
   * API (`category`, the primary key); the handler resolves it.
   * Every field is optional, but at least one must be present.
   */
  router.patch('/:id', async (req, res, next) => {
    try {
      const body = req.body || {};
      const updateReq = new UpdateActivityRequest({
        name: body.name,
        address: body.address,
        category: body.category,
        managementIds: body.managementIds || []
      });
      const patch = factory.getDTO(updateReq);
      const result = await handler.handleUpdate(
        patch,
        Number(req.params.id),
        updateReq.managementIds
      );
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  });

  /**
   * `GET /activity` — list a page of activities. Query parameters
   * `page`, `size`, and `sort` (e.g. `sort=name,asc`) are honoured.
   */
  router.get('/', async (req, res, next) => {
    try {
      const pageable = buildPageable(req.query);
      const page = await handler.handleFindAll(pageable);
      res.status(200).json(page.toJSON());
    } catch (err) {
      next(err);
    }
  });

  /**
   * `DELETE /activity/:id` — delete an activity.
   */
  router.delete('/:id', async (req, res, next) => {
    try {
      await handler.handleDelete(Number(req.params.id));
      res.status(200).send('');
    } catch (err) {
      next(err);
    }
  });

  return router;
}
