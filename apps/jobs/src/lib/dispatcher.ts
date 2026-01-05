import { Queue } from 'bullmq';
import { createRedisConnection } from './redis';
import { db } from './db';
import { logger } from './logger';

const DISPATCHER_INTERVAL_MS = parseInt(process.env.DISPATCHER_INTERVAL_MS || '5000', 10);

const queues = new Map<string, Queue>();

function getQueue(type: string): Queue {
  if (!queues.has(type)) {
    const queue = new Queue(type, {
      connection: createRedisConnection(),
    });
    queues.set(type, queue);
  }
  return queues.get(type)!;
}

export async function startDispatcher() {
  logger.info({ intervalMs: DISPATCHER_INTERVAL_MS }, 'Outbox dispatcher started');

  setInterval(async () => {
    try {
      await dispatchPendingMessages();
    } catch (error) {
      logger.error({ error }, 'Dispatcher error');
    }
  }, DISPATCHER_INTERVAL_MS);
}

async function dispatchPendingMessages() {
  const client = await db.connect();

  try {
    // Poll pending outbox messages (with row locking to prevent concurrent processing)
    const result = await client.query(
      `
      SELECT "Id", "Type", "PayloadJson", "CorrelationId"
      FROM "OutboxMessages"
      WHERE "Status" = 'Pending' AND "AvailableAt" <= NOW()
      ORDER BY "CreatedAt" ASC
      LIMIT 100
      FOR UPDATE SKIP LOCKED
      `
    );

    if (result.rows.length === 0) {
      return;
    }

    logger.info({ count: result.rows.length }, 'Dispatching outbox messages');

    for (const row of result.rows) {
      const { Id, Type, PayloadJson, CorrelationId } = row;

      // Enqueue to BullMQ
      const queue = getQueue(Type);
      await queue.add(Type, PayloadJson, {
        jobId: Id,
        attempts: 5,
        backoff: {
          type: 'exponential',
          delay: 5000,
        },
      });

      // Update outbox status to Dispatched
      await client.query(
        `UPDATE "OutboxMessages" SET "Status" = 'Dispatched', "UpdatedAt" = NOW() WHERE "Id" = $1`,
        [Id]
      );

      logger.debug({ outboxId: Id, type: Type }, 'Message dispatched');
    }
  } finally {
    client.release();
  }
}

