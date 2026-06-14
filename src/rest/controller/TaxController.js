/***
 * @fileoverview Express router factory for the `/tax` resource.
 */

import { Router } from 'express';
import { buildPageable } from '../../domain/dto/Page.js';
import { InsertTaxRequest } from '../request/impl/InsertTaxRequest.js';
import { UpdateTaxRequest } from '../request/impl/UpdateTaxRequest.js';
import { requireRole } from '../middleware/requireRole.js';

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
   * with the given id. The employee is identified by `employeeUuid`,
   * which is validated locally against the activity's employee list.
   */
  router.post('/:activity', requireRole('ADMIN', 'GOVERNMENT', 'ACTIVITY_MANAGER'), async (req, res, next) => {
    try {
      const body = req.body || {};
      const insertReq = new InsertTaxRequest({
        earnings: body.earnings,
        expenses: body.expenses,
        employeeUuid: body.employeeUuid
      });
      const dto = factory.getDTO(insertReq);
      const roles = /** @type {string[]} */ (req.user.roles || []);
      const checkEmployee = roles.includes('ACTIVITY_MANAGER') && !roles.includes('ADMIN') && !roles.includes('GOVERNMENT');
      const result = await handler.handleInsert(
        dto,
        Number(req.params.activity),
        insertReq.employeeUuid,
        { checkEmployee, userId: /** @type {number} */ (req.user.userId) }
      );
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  });

  /**
   * `GET /tax/:activity` — list a page of declarations for the
   * activity with the given name.
   * ACTIVITY_MANAGER must be an employee of the activity.
   */
  router.get('/:activity', requireRole('ADMIN', 'GOVERNMENT', 'ACTIVITY_MANAGER'), async (req, res, next) => {
    try {
      const pageable = buildPageable(req.query);
      const roles = /** @type {string[]} */ (req.user.roles || []);
      const checkEmployee = roles.includes('ACTIVITY_MANAGER') && !roles.includes('ADMIN') && !roles.includes('GOVERNMENT');
      const page = await handler.handleFindByActivity(req.params.activity, pageable, {
        checkEmployee,
        userId: /** @type {number} */ (req.user.userId)
      });
      res.status(200).json(page.toJSON());
    } catch (err) {
      next(err);
    }
  });

  /**
   * `PATCH /tax/:id` — update an existing declaration.
   */
  router.patch('/:id', requireRole('ADMIN', 'GOVERNMENT'), async (req, res, next) => {
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
  router.get('/', requireRole('ADMIN', 'GOVERNMENT'), async (req, res, next) => {
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
