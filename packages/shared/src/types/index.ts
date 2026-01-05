// TypeScript types shared across applications

export enum TicketStatus {
  NEW = 'NEW',
  ASSIGNED = 'ASSIGNED',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  CLOSED = 'CLOSED',
}

export enum TicketPriority {
  EMERGENCY = 'EMERGENCY',
  URGENT = 'URGENT',
  ROUTINE = 'ROUTINE',
  PLANNED = 'PLANNED',
}

export enum TicketCategory {
  PLUMBING = 'PLUMBING',
  ELECTRICAL = 'ELECTRICAL',
  HEATING = 'HEATING',
  GENERAL = 'GENERAL',
  STRUCTURAL = 'STRUCTURAL',
  PEST = 'PEST',
  APPLIANCE = 'APPLIANCE',
  SECURITY = 'SECURITY',
}

export enum MessageChannel {
  PORTAL = 'PORTAL',
  EMAIL = 'EMAIL',
  SMS = 'SMS',
  WHATSAPP = 'WHATSAPP',
}

export enum MessageStatus {
  DRAFT = 'DRAFT',
  QUEUED = 'QUEUED',
  SENT = 'SENT',
  DELIVERED = 'DELIVERED',
  FAILED = 'FAILED',
}

export enum UserRole {
  SUPER_ADMIN = 'SuperAdmin',
  ORG_ADMIN = 'OrgAdmin',
  COORDINATOR = 'Coordinator',
  VIEWER = 'Viewer',
  CONTRACTOR = 'Contractor',
  TENANT = 'Tenant',
}

export enum OutboxMessageStatus {
  PENDING = 'Pending',
  DISPATCHED = 'Dispatched',
  COMPLETED = 'Completed',
  FAILED = 'Failed',
  DEAD = 'Dead',
}

export enum ComplianceType {
  GAS_SAFETY = 'GAS_SAFETY',
  EPC = 'EPC',
  EICR = 'EICR',
  SMOKE_ALARM = 'SMOKE_ALARM',
  CO_ALARM = 'CO_ALARM',
  LEGIONELLA_RISK = 'LEGIONELLA_RISK',
}

export enum SubscriptionPlan {
  FREE = 'Free',
  STARTER = 'Starter',
  PROFESSIONAL = 'Professional',
  ENTERPRISE = 'Enterprise',
}

