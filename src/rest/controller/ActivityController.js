/**
 * @fileoverview Express router factory for the `/activity` resource.
 */

import { Router } from 'express';
import { buildPageable } from '../../domain/dto/Page.js';
import { InsertActivityRequest as CreateActivityRequest } from '../request/impl/InsertActivityRequest.js';
import { UpdateActivityRequest } from '../request/impl/UpdateActivityRequest.js';
import { requireRole } from '../middleware/requireRole.js';

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
   * given category, optionally with employees.
   */
  router.post('/:categoryId', requireRole('ADMIN'), async (req, res, next) => {
    try {
      const body = req.body || {};
      const insertReq = new CreateActivityRequest({
        name: body.name,
        address: body.address,
        employees: body.employees || []
      });
      const dto = factory.getDTO(insertReq);
      const result = await handler.handleInsert(dto, Number(req.params.categoryId));
      res.status(201).json(result);
    } catch (err) {
      next(err);
    }
  });

  /**
   * `PATCH /activity/:id` — partial update of the mutable fields and
   * employee add/remove. At least one field must be present.
   * ACTIVITY_MANAGER must be an employee of the activity.
   */
  router.patch('/:id', requireRole('ADMIN', 'ACTIVITY_MANAGER'), async (req, res, next) => {
    try {
      const body = req.body || {};
      const updateReq = new UpdateActivityRequest({
        name: body.name,
        address: body.address,
        category: body.category,
        employees: body.employees
      });
      const patch = factory.getDTO(updateReq);
      const roles = /** @type {string[]} */ (req.user.roles || []);
      const checkEmployee = roles.includes('ACTIVITY_MANAGER') && !roles.includes('ADMIN') && !roles.includes('GOVERNMENT');
      const result = await handler.handleUpdate(patch, Number(req.params.id), {
        checkEmployee,
        userId: /** @type {number} */ (req.user.userId)
      });
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  });

  /**
   * `GET /activity` — list a page of activities.
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
   * `GET /activity/employee/:uuid` — activities linked to an employee.
   * ACTIVITY_MANAGER can only see their own employee record.
   * Must be defined BEFORE the `/:id` catch-all.
   */
  router.get('/employee/:uuid', requireRole('ADMIN', 'GOVERNMENT', 'ACTIVITY_MANAGER'), async (req, res, next) => {
    try {
      const roles = /** @type {string[]} */ (req.user.roles || []);
      const checkEmployee = roles.includes('ACTIVITY_MANAGER') && !roles.includes('ADMIN') && !roles.includes('GOVERNMENT');
      const dtos = await handler.handleFindByEmployeeUuid(req.params.uuid, {
        checkEmployee,
        userId: /** @type {number} */ (req.user.userId)
      });
      res.status(200).json(dtos);
    } catch (err) {
      next(err);
    }
  });

  /**
   * `GET /activity/:id` — single activity by id.
   * ACTIVITY_MANAGER must be an employee of the activity.
   */
  router.get('/:id', requireRole('ADMIN', 'GOVERNMENT', 'ACTIVITY_MANAGER'), async (req, res, next) => {
    try {
      const roles = /** @type {string[]} */ (req.user.roles || []);
      const checkEmployee = roles.includes('ACTIVITY_MANAGER') && !roles.includes('ADMIN') && !roles.includes('GOVERNMENT');
      const dto = await handler.handleFindByID(Number(req.params.id), {
        checkEmployee,
        userId: /** @type {number} */ (req.user.userId)
      });
      if (!dto) {
        return res.status(404).json({ error: 'Activity not found' });
      }
      res.status(200).json(dto);
    } catch (err) {
      next(err);
    }
  });

  /**
   * `DELETE /activity/:id` — delete an activity.
   */
  router.delete('/:id', requireRole('ADMIN'), async (req, res, next) => {
    try {
      await handler.handleDelete(Number(req.params.id));
      res.status(204).end();
    } catch (err) {
      next(err);
    }
  });

  return router;
}
