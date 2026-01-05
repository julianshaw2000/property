import Redis from 'ioredis';
import { logger } from './logger';

const redisHost = process.env.REDIS_HOST || 'localhost';
const redisPort = parseInt(process.env.REDIS_PORT || '6379', 10);
const redisPassword = process.env.REDIS_PASSWORD;

export const redis = new Redis({
  host: redisHost,
  port: redisPort,
  password: redisPassword,
  maxRetriesPerRequest: null, // Required for BullMQ
});

redis.on('connect', () => {
  logger.info({ host: redisHost, port: redisPort }, 'Redis connected');
});

redis.on('error', (error) => {
  logger.error({ error }, 'Redis error');
});

export function createRedisConnection() {
  return new Redis({
    host: redisHost,
    port: redisPort,
    password: redisPassword,
    maxRetriesPerRequest: null,
  });
}

