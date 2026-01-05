import { Job } from 'bullmq';
import { logger } from '../lib/logger.js';

export async function processEmail(job: Job) {
  logger.info(`Processing email job ${job.id}:`, job.name);

  const { orgId, type, to, subject, body } = job.data;

  // TODO: Integrate with Resend or SendGrid
  // For now, just log
  logger.info(`Would send email to ${to}: ${subject}`);

  // Simulate email sending
  await new Promise(resolve => setTimeout(resolve, 500));

  return { sent: true, to, subject };
}

export async function processTicketCreatedEmail(job: Job) {
  logger.info(`Processing ticket.created email for job ${job.id}`);

  const { ticketNumber, ticketTitle, reportedByEmail } = job.data;

  // TODO: Send email via Resend/SendGrid
  logger.info(`Would send ticket created notification to ${reportedByEmail}: Ticket ${ticketNumber} - ${ticketTitle}`);

  return { sent: true };
}

export async function processQuoteSubmittedEmail(job: Job) {
  logger.info(`Processing quote.submitted email for job ${job.id}`);

  const { quoteNumber, contractorEmail, amount } = job.data;

  logger.info(`Would notify staff: Quote ${quoteNumber} submitted by ${contractorEmail} for £${amount}`);

  return { sent: true };
}

