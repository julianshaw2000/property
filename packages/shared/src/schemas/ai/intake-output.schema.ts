import { z } from 'zod';

export const intakeOutputSchema = z.object({
  schemaVersion: z.literal('1.0'),
  category: z.enum([
    'PLUMBING',
    'ELECTRICAL',
    'HEATING',
    'GENERAL',
    'STRUCTURAL',
    'PEST',
    'APPLIANCE',
    'SECURITY',
  ]),
  priority: z.enum(['EMERGENCY', 'URGENT', 'ROUTINE', 'PLANNED']),
  safetyFlags: z.array(z.string()).optional(),
  missingInfo: z.array(z.string()).optional(),
  summary: z.string().max(500),
});

export type IntakeOutput = z.infer<typeof intakeOutputSchema>;

