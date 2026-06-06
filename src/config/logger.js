/**
 * @fileoverview Application-wide structured logger (Pino).
 *
 * In `production` the logger writes single-line JSON to stdout — the
 * format every log shipper (Loki, ELK, Datadog, etc.) can ingest
 * without extra configuration.
 *
 * In every other environment (`development`, `test`) the output is
 * piped through `pino-pretty` for a human-readable, colourised format
 * that shows the message, the timestamp, the level, and a compact
 * view of the structured fields.
 *
 * One logger instance is exported; downstream code should import it
 * rather than instantiating its own so that log level, formatting, and
 * metadata stay consistent.
 */

import pino from 'pino';
import { env } from './env.js';

const isProd = env.NODE_ENV === 'production';

/**
 * @type {import('pino').LoggerOptions}
 */
const options = {
  level: env.LOG_LEVEL,
  base: { service: 'burocracy-system' },
  timestamp: pino.stdTimeFunctions.isoTime
};

if (!isProd) {
  // Pretty transport: runs in a worker thread; falls back to JSON if
  // the optional `pino-pretty` package is not installed.
  options.transport = {
    target: 'pino-pretty',
    options: {
      colorize: true,
      translateTime: 'HH:MM:ss.l',
      ignore: 'pid,hostname,service',
      singleLine: false,
      errorLikeObjectKeys: ['err', 'error'],
      errorProps: 'code,message,stack,details,statusCode'
    }
  };
}

/**
 * Shared logger instance.
 *
 * - `base.service` is attached to every line so logs from this service
 *   can be filtered in a multi-service deployment.
 * - Timestamps are ISO 8601 (`pino.stdTimeFunctions.isoTime`).
 *
 * @type {import('pino').Logger}
 */
export const logger = pino(options);
