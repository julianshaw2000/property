import { z } from 'zod';

export const messageDraftOutputSchema = z.object({
  schemaVersion: z.literal('1.0'),
  requiresHumanSend: z.boolean(),
  channel: z.enum(['PORTAL', 'EMAIL', 'SMS', 'WHATSAPP']),
  subject: z.string().max(200).optional(),
  body: z.string().max(5000),
  tone: z.string().optional(),
});

export type MessageDraftOutput = z.infer<typeof messageDraftOutputSchema>;

