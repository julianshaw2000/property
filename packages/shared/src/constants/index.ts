// Shared constants

export const API_VERSION = 'v1';

export const SLA_TARGETS = {
  EMERGENCY: {
    responseHours: 2,
    resolutionHours: 24,
  },
  URGENT: {
    responseHours: 24,
    resolutionHours: 168, // 7 days
  },
  ROUTINE: {
    responseHours: 120, // 5 days
    resolutionHours: 720, // 30 days
  },
  PLANNED: {
    responseHours: null,
    resolutionHours: null,
  },
};

export const COMPLIANCE_REMINDER_DAYS = [30, 14, 7];

export const VAT_RATE_GB = 0.20;

export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 100;

export const FILE_UPLOAD_MAX_SIZE_MB = 50;
export const SUPPORTED_FILE_TYPES = [
  'application/pdf',
  'image/png',
  'image/jpeg',
  'image/heic',
  'video/mp4',
];

