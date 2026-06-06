/**
 * @fileoverview Express router factory for the `/tax` resource.
 */

import { Router } from 'express';
import { buildPageable } from '../../domain/dto/Page.js';
import { InsertTaxRequest } from '../request/impl/InsertTaxRequest.js';
import { UpdateTaxRequest } from '../request/impl/UpdateTaxRequest.js';

/**
 * Builds the `/tax` router.
 *
 * @param {{
 *   factory: import('../factory/TaxDTOFactory.js').TaxDTOFactory,
 *   handler: import('../../domain/port/request/TaxRequestHandler.js').TaxRequestHandler
 * }} deps
 * @returns {Router}
 */
export function createTaxRouter({ factory, handler }) {
  const router = Router();

  /**
   * `POST /tax/:activity` — file a new declaration for the activity
   * with the given id. The manager is resolved by `managerName` and
   * `managerSurname`.
   */
  router.post('/:activity', async (req, res, next) => {
    try {
      const body = req.body || {};
      const insertReq = new InsertTaxRequest({
        earnings: body.earnings,
        expenses: body.expenses,
        managerName: body.managerName,
        managerSurname: body.managerSurname
      });
      const dto = factory.getDTO(insertReq);
      const result = await handler.handleInsert(
        dto,
        Number(req.params.activity),
        insertReq.managerName,
        insertReq.managerSurname
      );
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  });

  /**
   * `GET /tax/:activity` — list a page of declarations for the
   * activity with the given name.
   */
  router.get('/:activity', async (req, res, next) => {
    try {
      const pageable = buildPageable(req.query);
      const page = await handler.handleFindByActivity(req.params.activity, pageable);
      res.status(200).json(page.toJSON());
    } catch (err) {
      next(err);
    }
  });

  /**
   * `PATCH /tax/:id` — update an existing declaration. `0` values for
   * `earnings`, `expenses`, and `elapsedDays` are treated as "no
   * change" by the service.
   */
  router.patch('/:id', async (req, res, next) => {
    try {
      const body = req.body || {};
      const updateReq = new UpdateTaxRequest({
        earnings: body.earnings,
        expenses: body.expenses,
        payed: body.payed,
        elapsedDays: body.elapsedDays
      });
      const dto = factory.getDTO(updateReq);
      const result = await handler.handleUpdate(dto, Number(req.params.id));
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  });

  /**
   * `GET /tax` — list a page of every declaration, newest first.
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

  return router;
}
