/**
 * @fileoverview Lazily-validated environment configuration.
 *
 * `process.env` is parsed and validated on first read (via the
 * `env` Proxy) so that importing this module from a test runner (which
 * sets its own env via `tests/jest.setup.js`) does not cause a hard
 * `process.exit(1)` at import time.
 */

import { z } from 'zod';

/**
 * @typedef {Object} Env
 * @property {'development'|'test'|'production'} NODE_ENV
 * @property {number} PORT
 * @property {string} DB_HOST
 * @property {number} DB_PORT
 * @property {string} DB_USER
 * @property {string} DB_PASSWORD
 * @property {string} DB_NAME
 * @property {number} DB_CONNECTION_LIMIT
 * @property {'fatal'|'error'|'warn'|'info'|'debug'|'trace'} LOG_LEVEL
 */

/**
 * The shape every env variable must conform to.
 * @type {import('zod').ZodType<Env>}
 */
const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(3000),

  DB_HOST: z.string().min(1),
  DB_PORT: z.coerce.number().int().positive().default(3306),
  DB_USER: z.string().min(1),
  DB_PASSWORD: z.string().min(1),
  DB_NAME: z.string().min(1),
  DB_CONNECTION_LIMIT: z.coerce.number().int().positive().default(10),

  PERSON_SERVICE_URL: z.string().url().default('http://localhost:8082'),

  JWT_SECRET: z.string().min(16, 'JWT_SECRET must be at least 16 characters'),

  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info')
});

/** @type {Env|null} */
let cached = null;

/**
 * Validates `process.env` against the schema the first time it is
 * called; subsequent calls return the cached result.
 *
 * @returns {Env}
 * @throws {Error} If the env is missing required variables or has
 *   malformed values.
 */
function load() {
  if (cached) return cached;
  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    const message = 'Invalid environment configuration: ' + JSON.stringify(parsed.error.format());
    throw new Error(message);
  }
  cached = parsed.data;
  return cached;
}

/**
 * Lazy, throw-on-first-use accessor for the validated env. Reading any
 * property triggers `load()`.
 */
export const env = new Proxy({}, {
  /**
   * @param {object} _t Ignored.
   * @param {string|symbol} prop
   * @returns {*}
   */
  get(_t, prop) { return load()[prop]; }
});
