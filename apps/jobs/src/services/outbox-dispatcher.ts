import { Pool } from 'pg';
import { Queue } from 'bullmq';
import { logger } from '../lib/logger.js';
import { redisConnection } from '../lib/redis.js';

export class OutboxDispatcher {
  private pool: Pool;
  private emailQueue: Queue;
  private smsQueue: Queue;
  private aiQueue: Queue;
  private pollInterval: NodeJS.Timeout | null = null;

  constructor(pool: Pool) {
    this.pool = pool;
    this.emailQueue = new Queue('email', { connection: redisConnection });
    this.smsQueue = new Queue('sms', { connection: redisConnection });
    this.aiQueue = new Queue('ai', { connection: redisConnection });
  }

  async start() {
    logger.info('Starting Outbox Dispatcher');
    this.pollInterval = setInterval(() => this.poll(), 5000); // Poll every 5 seconds
    await this.poll(); // Initial poll
  }

  async stop() {
    logger.info('Stopping Outbox Dispatcher');
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
    }
    await this.emailQueue.close();
    await this.smsQueue.close();
    await this.aiQueue.close();
  }

  private async poll() {
    const client = await this.pool.connect();

    try {
      // SELECT FOR UPDATE SKIP LOCKED ensures only one dispatcher instance processes each message
      const result = await client.query(`
        SELECT "Id", "OrgId", "Type", "Payload", "AvailableAt", "RetryCount"
        FROM "OutboxMessages"
        WHERE "Status" = 'Pending' AND "AvailableAt" <= NOW()
        ORDER BY "AvailableAt" ASC
        LIMIT 100
        FOR UPDATE SKIP LOCKED
      `);

      for (const row of result.rows) {
        try {
          await this.dispatchMessage(row);

          // Mark as dispatched
          await client.query(`
            UPDATE "OutboxMessages"
            SET "Status" = 'Dispatched', "UpdatedAt" = NOW()
            WHERE "Id" = $1
          `, [row.Id]);

          logger.info(`Dispatched outbox message ${row.Id} (type: ${row.Type})`);
        } catch (error) {
          logger.error(`Failed to dispatch outbox message ${row.Id}:`, error);

          // Update retry count
          await client.query(`
            UPDATE "OutboxMessages"
            SET "RetryCount" = "RetryCount" + 1,
                "Status" = CASE WHEN "RetryCount" >= 5 THEN 'Failed' ELSE 'Pending' END,
                "AvailableAt" = NOW() + INTERVAL '5 minutes',
                "UpdatedAt" = NOW()
            WHERE "Id" = $1
          `, [row.Id]);
        }
      }
    } finally {
      client.release();
    }
  }

  private async dispatchMessage(message: any) {
    const payload = JSON.parse(message.Payload);
    const [category, ...rest] = message.Type.split('.');
    const jobType = rest.join('.');

    const jobData = {
      outboxMessageId: message.Id,
      orgId: message.OrgId,
      type: jobType,
      ...payload
    };

    switch (category) {
      case 'email':
        await this.emailQueue.add(jobType, jobData, {
          jobId: message.Id,
          removeOnComplete: 1000,
          removeOnFail: 5000
        });
        break;

      case 'sms':
        await this.smsQueue.add(jobType, jobData, {
          jobId: message.Id,
          removeOnComplete: 1000,
          removeOnFail: 5000
        });
        break;

      case 'ai':
        await this.aiQueue.add(jobType, jobData, {
          jobId: message.Id,
          removeOnComplete: 1000,
          removeOnFail: 5000,
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 5000
          }
        });
        break;

      default:
        logger.warn(`Unknown message category: ${category}`);
    }
  }
}

