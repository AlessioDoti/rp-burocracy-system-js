/**
 * @fileoverview MySQL connection pool (singleton) and lifecycle helpers.
 *
 * The pool is created lazily on the first call to {@link getPool}, so
 * importing this module does not open any connection. The same pool is
 * reused for every repository.
 */

import mysql from 'mysql2/promise';
import { env } from '../config/env.js';
import { logger } from '../config/logger.js';

/** @type {import('mysql2/promise').Pool|null} */
let pool = null;

/**
 * Returns the process-wide MySQL connection pool, creating it on the
 * first call.
 *
 * @returns {import('mysql2/promise').Pool}
 */
export function getPool() {
  if (pool) return pool;

  pool = mysql.createPool({
    host: env.DB_HOST,
    port: env.DB_PORT,
    user: env.DB_USER,
    password: env.DB_PASSWORD,
    database: env.DB_NAME,
    waitForConnections: true,
    connectionLimit: env.DB_CONNECTION_LIMIT,
    queueLimit: 0,
    decimalNumbers: true,
    dateStrings: false
  });

  logger.info({ host: env.DB_HOST, db: env.DB_NAME }, 'MySQL pool created');
  return pool;
}

/**
 * Closes the pool, releasing every connection. Idempotent: safe to call
 * from the SIGTERM/SIGINT handler and from tests alike.
 *
 * @returns {Promise<void>}
 */
export async function closePool() {
  if (pool) {
    await pool.end();
    pool = null;
    logger.info('MySQL pool closed');
  }
}

/**
 * Pings the database by acquiring a connection and running `SELECT 1`.
 * Used by the `/health` endpoint.
 *
 * @returns {Promise<true>} Resolves when the DB is reachable.
 * @throws {Error} When the connection or ping fails.
 */
export async function ping() {
  const conn = await getPool().getConnection();
  try {
    await conn.ping();
    return true;
  } finally {
    conn.release();
  }
}
