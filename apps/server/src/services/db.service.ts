import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';
import { Service } from 'typedi';
import * as schema from '../db/schema.js';
import { logger } from '@zen-send/logger';

@Service()
export class DbService {
  private pool: mysql.Pool | null = null;
  private db: ReturnType<typeof drizzle> | null = null;

  async init(): Promise<void> {
    if (this.pool) {
      logger.warn('Database already initialized');
      return;
    }

    this.pool = mysql.createPool({
      host: process.env.DB_HOST || 'localhost',
      port: Number(process.env.DB_PORT) || 3306,
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'zen_send',
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
    });

    this.db = drizzle(this.pool, { schema, mode: 'default' });
    logger.info('Database initialized');
  }

  getDb(): ReturnType<typeof drizzle> {
    if (!this.db) {
      throw new Error('Database not initialized. Call init() first.');
    }
    return this.db;
  }

  async close(): Promise<void> {
    if (this.pool) {
      await this.pool.end();
      this.pool = null;
      this.db = null;
      logger.info('Database connection closed');
    }
  }
}
