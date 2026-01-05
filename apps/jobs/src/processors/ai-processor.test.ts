import { Job } from 'bullmq';
import {
  processAiJob,
  processTicketIntakeClassification,
  processDraftMessage
} from './ai-processor';

// Mock the logger
jest.mock('../lib/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
    warn: jest.fn()
  }
}));

describe('AI Processor', () => {
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

  describe('processAiJob', () => {
    it('should process generic AI job and return success', async () => {
      const job = createMockJob({
        orgId: 'org-123',
        type: 'summarize',
        prompt: 'Summarize this text',
        context: 'Some context here'
      });

      const result = await processAiJob(job);

      expect(result).toEqual({
        processed: true,
        result: 'AI response placeholder'
      });
    }, 10000); // Increased timeout due to simulated delay

    it('should handle AI job with minimal data', async () => {
      const job = createMockJob({
        type: 'classify'
      });

      const result = await processAiJob(job);

      expect(result.processed).toBe(true);
    }, 10000);
  });

  describe('processTicketIntakeClassification', () => {
    it('should classify ticket and return suggestions', async () => {
      const job = createMockJob({
        ticketId: 'ticket-123',
        description: 'Water is leaking from the kitchen sink'
      });

      const result = await processTicketIntakeClassification(job);

      expect(result).toHaveProperty('suggestedCategory');
      expect(result).toHaveProperty('suggestedPriority');
      expect(result).toHaveProperty('confidence');
      expect(result).toHaveProperty('reasoning');
    });

    it('should return valid category enum value', async () => {
      const job = createMockJob({
        ticketId: 'ticket-456',
        description: 'Electrical outlet not working'
      });

      const result = await processTicketIntakeClassification(job);

      expect(result.suggestedCategory).toBe('PLUMBING'); // Mock always returns PLUMBING
      expect(typeof result.confidence).toBe('number');
      expect(result.confidence).toBeGreaterThan(0);
      expect(result.confidence).toBeLessThanOrEqual(1);
    });

    it('should return URGENT priority for leak-related issues', async () => {
      const job = createMockJob({
        ticketId: 'ticket-789',
        description: 'Major water leak in bathroom'
      });

      const result = await processTicketIntakeClassification(job);

      expect(result.suggestedPriority).toBe('URGENT');
    });
  });

  describe('processDraftMessage', () => {
    it('should generate message draft with subject and body', async () => {
      const job = createMockJob({
        ticketId: 'ticket-123',
        context: 'Plumbing repair completed',
        tone: 'professional'
      });

      const result = await processDraftMessage(job);

      expect(result).toHaveProperty('subject');
      expect(result).toHaveProperty('body');
      expect(typeof result.subject).toBe('string');
      expect(typeof result.body).toBe('string');
      expect(result.subject.length).toBeGreaterThan(0);
      expect(result.body.length).toBeGreaterThan(0);
    });

    it('should handle different tones', async () => {
      const job = createMockJob({
        ticketId: 'ticket-456',
        context: 'Scheduling inspection',
        tone: 'friendly'
      });

      const result = await processDraftMessage(job);

      expect(result.subject).toBeDefined();
      expect(result.body).toBeDefined();
    });
  });
});
