import { z } from 'zod';

export const summaryOutputSchema = z.object({
  schemaVersion: z.literal('1.0'),
  whatHappened: z.string().max(500),
  lastUpdate: z.string().max(200),
  nextAction: z.string().max(200),
  risks: z.array(z.string()).optional(),
  blockers: z.array(z.string()).optional(),
});

export type SummaryOutput = z.infer<typeof summaryOutputSchema>;

