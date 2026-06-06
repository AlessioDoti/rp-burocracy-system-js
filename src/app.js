/**
 * @fileoverview Express application factory.
 *
 * Wires the security middleware (`helmet`, `cors`), JSON body
 * parsing, structured request logging, the three resource routers,
 * the `/health` probe, the 404 fallback, and the global error handler.
 * No `listen()` here — see `server.js` for the process bootstrap.
 */

import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import pinoHttp from 'pino-http';

import { env } from './config/env.js';
import { logger } from './config/logger.js';
import { buildContainer } from './config/container.js';
import { createActivityRouter } from './rest/controller/ActivityController.js';
import { createCategoryRouter } from './rest/controller/CategoryController.js';
import { createTaxRouter } from './rest/controller/TaxController.js';
import { globalErrorHandler } from './rest/controller/advice/GlobalResponseEntityExceptionHandler.js';
import { ping } from './persistence/db.js';

/**
 * Builds the Express application and its container.
 *
 * @param {object} [overrides] Container overrides (mostly for tests).
 * @returns {{
 *   app: import('express').Express,
 *   container: ReturnType<typeof buildContainer>
 * }}
 */
export function createApp(overrides = {}) {
  const app = express();
  const container = overrides.container ?? buildContainer();

  app.disable('x-powered-by');
  app.use(helmet());
  app.use(cors({ origin: true, credentials: false }));
  app.use(express.json({ limit: '100kb' }));
  app.use(pinoHttp({ logger, autoLogging: { ignore: (req) => req.url === '/health' } }));

  /**
   * Liveness + DB readiness probe. Returns 200 when the database
   * answers a `SELECT 1`; returns 503 with the error message otherwise
   * (so the orchestrator can mark the instance unhealthy).
   */
  app.get('/health', async (_req, res) => {
    try {
      await ping();
      res.status(200).json({ status: 'ok', db: 'up' });
    } catch (err) {
      res.status(503).json({ status: 'degraded', db: 'down', error: err.message });
    }
  });

  app.use('/activity', createActivityRouter({
    factory: container.factories.activityDTOFactory,
    handler: container.handlers.activityRequestHandler
  }));
  app.use('/category', createCategoryRouter({
    factory: container.factories.categoryDTOFactory,
    handler: container.handlers.categoryRequestHandler
  }));
  app.use('/tax', createTaxRouter({
    factory: container.factories.taxDTOFactory,
    handler: container.handlers.taxRequestHandler
  }));

  app.use((req, res) => {
    res.status(404).json({ error: { code: 'NOT_FOUND', message: `No route for ${req.method} ${req.path}` } });
  });

  app.use(globalErrorHandler);

  return { app, container };
}

export { env };
