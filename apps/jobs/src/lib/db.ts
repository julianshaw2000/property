import { Pool } from 'pg';
import { logger } from './logger';

const pool = new Pool({
  host: process.env.DATABASE_HOST || 'ep-square-king-abq0rqc5-pooler.eu-west-2.aws.neon.tech',
  port: parseInt(process.env.DATABASE_PORT || '5432', 10),
  database: process.env.DATABASE_NAME || 'neondb',
  user: process.env.DATABASE_USER || 'neondb_owner',
  password: process.env.DATABASE_PASSWORD || 'npg_Iz7SaylJ0rhA',
  ssl: process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: true } : false,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

pool.on('connect', () => {
  logger.info('Database pool connected to Neon');
});

pool.on('error', (error) => {
  logger.error({ error }, 'Database pool error');
});

export const db = pool;

