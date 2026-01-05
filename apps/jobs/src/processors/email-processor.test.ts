import { Job } from 'bullmq';
import {
  processEmail,
  processTicketCreatedEmail,
  processQuoteSubmittedEmail
} from './email-processor';

// Mock the logger
jest.mock('../lib/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
    warn: jest.fn()
  }
}));

describe('Email Processor', () => {
  const createMockJob = (data: Record<string, unknown>): Job => ({
    id: 'test-job-123',
    name: 'test-job',
    data,
    opts: {},
    timestamp: Date.now(),
    attemptsMade: 0,
    stacktrace: [],
    returnvalue: null,
    progress: 0,
    delay: 0,
    priority: 0
  } as unknown as Job);

  describe('processEmail', () => {
    it('should process email job and return success', async () => {
      const job = createMockJob({
        orgId: 'org-123',
        type: 'notification',
        to: 'user@example.com',
        subject: 'Test Subject',
        body: 'Test Body'
      });

      const result = await processEmail(job);

      expect(result).toEqual({
        sent: true,
        to: 'user@example.com',
        subject: 'Test Subject'
      });
    });

    it('should handle email with minimal data', async () => {
      const job = createMockJob({
        to: 'minimal@example.com',
        subject: 'Minimal',
        body: ''
      });

      const result = await processEmail(job);

      expect(result.sent).toBe(true);
      expect(result.to).toBe('minimal@example.com');
    });
  });

  describe('processTicketCreatedEmail', () => {
    it('should process ticket created notification', async () => {
      const job = createMockJob({
        ticketNumber: 'TKT-2024-00001',
        ticketTitle: 'Leaking tap in kitchen',
        reportedByEmail: 'tenant@example.com'
      });

      const result = await processTicketCreatedEmail(job);

      expect(result).toEqual({ sent: true });
    });

    it('should handle ticket with all fields', async () => {
      const job = createMockJob({
        ticketNumber: 'TKT-2024-00002',
        ticketTitle: 'Broken window',
        reportedByEmail: 'another@example.com',
        orgId: 'org-456',
        priority: 'HIGH'
      });

      const result = await processTicketCreatedEmail(job);

      expect(result.sent).toBe(true);
    });
  });

  describe('processQuoteSubmittedEmail', () => {
    it('should process quote submitted notification', async () => {
      const job = createMockJob({
        quoteNumber: 'QTE-2024-00001',
        contractorEmail: 'contractor@example.com',
        amount: 250.00
      });

      const result = await processQuoteSubmittedEmail(job);

      expect(result).toEqual({ sent: true });
    });

    it('should handle quote with decimal amount', async () => {
      const job = createMockJob({
        quoteNumber: 'QTE-2024-00002',
        contractorEmail: 'plumber@example.com',
        amount: 1234.56
      });

      const result = await processQuoteSubmittedEmail(job);

      expect(result.sent).toBe(true);
    });
  });
});
