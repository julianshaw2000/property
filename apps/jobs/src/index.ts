import { Worker } from 'bullmq';
import { logger } from './lib/logger.js';
import { redisConnection } from './lib/redis.js';
import { dbPool } from './lib/db.js';
import { OutboxDispatcher } from './services/outbox-dispatcher.js';
import { processEmail, processTicketCreatedEmail, processQuoteSubmittedEmail } from './processors/email-processor.js';
import { processAiJob, processTicketIntakeClassification, processDraftMessage } from './processors/ai-processor.js';

async function main() {
  logger.info('MaintainUK Jobs Service starting...');
  logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);

  // Initialize Outbox Dispatcher
  const dispatcher = new OutboxDispatcher(dbPool);
  await dispatcher.start();
  logger.info('✅ Outbox Dispatcher started');

  // Email Worker
  const emailWorker = new Worker('email', async (job) => {
    switch (job.name) {
      case 'ticket.created':
        return await processTicketCreatedEmail(job);
      case 'quote.submitted':
        return await processQuoteSubmittedEmail(job);
      default:
        return await processEmail(job);
    }
  }, { connection: redisConnection });

  emailWorker.on('completed', (job) => {
    logger.info(`Email job ${job.id} completed`);
  });

  emailWorker.on('failed', (job, err) => {
    logger.error(`Email job ${job?.id} failed:`, err);
  });

  logger.info('✅ Email worker started');

  // AI Worker
  const aiWorker = new Worker('ai', async (job) => {
    switch (job.name) {
      case 'ticket.classify':
        return await processTicketIntakeClassification(job);
      case 'message.draft':
        return await processDraftMessage(job);
      default:
        return await processAiJob(job);
    }
  }, {
    connection: redisConnection,
    concurrency: 5 // Process up to 5 AI jobs concurrently
  });

  aiWorker.on('completed', (job) => {
    logger.info(`AI job ${job.id} completed`);
  });

  aiWorker.on('failed', (job, err) => {
    logger.error(`AI job ${job?.id} failed:`, err);
  });

  logger.info('✅ AI worker started');

  // Graceful shutdown
  process.on('SIGTERM', async () => {
    logger.info('SIGTERM received, shutting down gracefully...');
    await dispatcher.stop();
    await emailWorker.close();
    await aiWorker.close();
    await dbPool.end();
    process.exit(0);
  });

  logger.info('✅ Jobs service ready');
}

main().catch(error => {
  logger.error('Fatal error:', error);
  process.exit(1);
});
