You are a senior full-stack engineer working in my repo. Build the FULL (not MVP-only) UK-focused PROPERTY MAINTENANCE SaaS “MaintainUK” as a production-grade multi-tenant system.

FOCUS KEYWORD: property maintenance

I am using:
- Backend: .NET 8 Web API + EF Core + PostgreSQL
- Frontend: Angular latest (standalone, signals-first) + Angular Material + Tailwind
- Queue: BullMQ + Redis (mandatory)
- Storage: S3-compatible (MinIO local, S3 prod)
- Email: Resend or SendGrid
- SMS/WhatsApp: Twilio (feature-flagged)
- AI: provider abstraction (OpenAI-style + local mock)
- Cursor IDE

Key constraint:
BullMQ is Node-based. Implement a small Node “jobs service” that runs BullMQ workers.
The .NET API MUST NOT run cron for core workflows. The .NET API publishes jobs via an Outbox table + Redis enqueue gateway.
BullMQ is the single scheduler/worker runtime for alerts, reminders, AI, invoice extraction, retries.

Hard safety rules (non-negotiable):
- AI MUST NOT send email/SMS/WhatsApp or post portal messages without explicit human click (“Send”) per message/thread.
- AI MUST NOT approve quotes, pay invoices, or commit spend.
- All AI outputs validate strict JSON schemas (fail closed).
- Redact sensitive data before sending to AI (keysafe/access codes, bank refs, ID docs).
- Audit every AI request/response and every outbound message attempt.
- Enforce SMS/WhatsApp consent and opt-out.

========================================================
0) DELIVERABLES (create and keep updated continuously)
========================================================
/docs/README.md
/docs/ASSUMPTIONS.md
/docs/ARCHITECTURE.md
/docs/SECURITY.md
/docs/API.md
/docs/AI.md
/docs/DB.md
/docs/UK_COMPLIANCE.md
/docs/RUNBOOK.md
/docs/ROADMAP.md
/docs/TESTING.md

========================================================
1) REPO STRUCTURE (IMPLEMENT THIS)
========================================================
/apps/web                 Angular app
/apps/api                 .NET 8 Web API
/apps/jobs                Node worker service (BullMQ processors + repeatable schedules)
/packages/shared           Shared contracts + JSON schemas + client types

========================================================
2) FULL SYSTEM MODULES (IMPLEMENT ALL)
========================================================
A) Auth + Orgs + RBAC (multi-tenant, least privilege)
B) Properties + Units + Tenancies + Owners
C) Tickets + Work Orders + Quotes + Invoices + Payment status tracking
D) Messaging + Timeline + Notifications
E) Contractor portal (web)
F) Tenant portal (web)
G) Compliance tracker + reminders
H) Reporting
I) AI orchestration (work-assist + portal intake + comms drafts)
J) Integrations: Email + Twilio SMS/WhatsApp (feature-flagged)
K) Background jobs platform: BullMQ for ALL reminders/alerts/AI/invoice extraction/retries

========================================================
3) AI TASKS TO IMPLEMENT (STAFF + PORTALS)
========================================================
Implement these AI assistants as separate “capabilities” with:
- a dedicated endpoint in .NET that creates an AiJob + OutboxMessage
- a BullMQ processor in /apps/jobs that performs the AI call, validates schema, writes back results
- a strict JSON schema in /packages/shared/schemas
- audit logging for request/response + schema version
- UI integration in Angular
- feature flag per capability

-----------------------------
3.1 STAFF AI (BACK OFFICE)
-----------------------------
A) Ticket intake & triage
- classify category (plumbing/electrical/heating/…)
- set priority (EMERGENCY/URGENT/ROUTINE)
- detect missing info + request list (photos/access/timing)
- flag safety risks (gas/electrics/flooding)
- create structured summary for coordinators

B) Ticket timeline summarisation
- “what happened / last update / who owes what / next action / risks”
- create a summary card on ticket detail page

C) Message drafting (DRAFT ONLY)
- drafts to tenant / contractor / owner
- channel-aware drafts (portal vs SMS vs WhatsApp)
- must include “requiresHumanSend: true” in schema
- UI must force edit/confirm then explicit Send

D) Contractor assignment suggestions
- suggest top 3 contractors with reasons and constraints
- never auto-assign; coordinator confirms

E) Duplicate issue detection
- cluster similar tickets across units/properties
- suggest linking tickets

F) SLA & risk prediction
- predict likely SLA breach using heuristics + AI explanation
- produce “risk flags” visible to staff

G) Invoice & cost review support
- invoice extraction (OCR + AI) into draft invoice
- anomaly flags:
  - total > approved quote
  - VAT mismatch
  - duplicate invoice number
- requires human review to approve

H) Compliance support
- explain compliance items in plain English (portal + staff)
- draft reminder messages (DRAFT ONLY)
- flag missing docs + expiring items

I) Reporting & insights
- weekly ops summary per org
- spend highlights
- contractor performance insights
- translate metrics into plain language paragraphs

-----------------------------
3.2 TENANT PORTAL AI
-----------------------------
A) Guided issue reporting (intake wizard)
- ask 3–8 targeted questions based on issue type
- request specific photos/videos
- produce strict JSON triage output
- deterministic emergency overrides:
  - gas smell
  - flooding near electrics
  - active fire/smoke
  - etc (define in /docs/AI.md)
- show safe steps (no risky advice)

B) Smart attachment prompts
- boiler display photo
- leak source photo/video
- fuse board label photo
- etc based on category

C) Status explanations
- explain ticket status in plain language, no legal advice

D) Assisted message composition (tenant)
- suggest what details to include
- tenant confirms before sending (still just portal message)

-----------------------------
3.3 CONTRACTOR PORTAL AI
-----------------------------
A) Job understanding summary
- scope, access constraints, required evidence

B) Quote structure assistance (NOT pricing)
- suggest line-items and completeness checks

C) Completion checklist prompts
- remind contractor what to upload for completion evidence

-----------------------------
3.4 COMMS AI (PORTAL / SMS / WHATSAPP)
-----------------------------
A) Channel-aware drafts
- Portal: detailed
- SMS: short, no sensitive info
- WhatsApp: conversational, photo-friendly
All drafts are DRAFT ONLY, human sends.

B) Inbound message summarisation (SMS/WhatsApp)
- summarise inbound messages into timeline events
- extract availability + urgency signals

C) “Next message” suggestions
- generate suggested quick actions (chips/buttons) for staff UI:
  - request photos
  - propose appointment
  - chase contractor
  - escalate to manager

========================================================
4) BACKGROUND JOBS DESIGN (BULLMQ REQUIRED)
========================================================
4.1 Outbox pattern (source of truth)
- Postgres table OutboxMessage:
  - Id (uuid)
  - OrgId (uuid)
  - Type (string)
  - PayloadJson (jsonb)
  - Status (Pending|Dispatched|Completed|Failed|Dead)
  - AvailableAt (timestamp)
  - Attempts (int)
  - LastError (text)
  - CorrelationId (string)
  - CreatedAt, UpdatedAt

4.2 .NET API publishes Outbox ONLY
- write domain changes + outbox in the same DB transaction

4.3 Node jobs service pulls Outbox and enqueues BullMQ jobs
- dispatcher: reads Pending with FOR UPDATE SKIP LOCKED
- enqueues to BullMQ with jobId = OutboxMessage.Id
- processor updates outbox status + writes AuditLog + Timeline as needed

4.4 Scheduling (repeatable BullMQ jobs)
- Compliance reminder sweep: daily
- SLA escalation sweep: every 5 min
- Digest generation: daily/weekly
- Dead-letter reprocessor: hourly
NO cron in .NET for core workflows.

========================================================
5) DATA MODEL (EF CORE) — MINIMUM ENTITIES
========================================================
Implement EF Core entities + migrations:

Organisation, User, Property, Unit, Tenancy, OwnerLink,
ContractorProfile,
MaintenanceTicket, TicketTimelineEvent,
WorkOrder, Quote, Invoice, Payment,
ComplianceItem,
Conversation, Message, ContactPoint, ConsentRecord,
Notification,
AuditLog,
AiJob, AiPromptTemplate,
OutboxMessage,
UsageMeter (for billing/limits)

Security:
- Encrypt sensitive fields at rest.
- Store phone numbers E.164.
- Enforce OrgId scoping on every query.

========================================================
6) ALERTS / NOTIFICATIONS (FULL)
========================================================
Channels:
- INAPP (default)
- EMAIL (default external)
- SMS (opt-in, feature-flagged)
- WHATSAPP (opt-in, feature-flagged)

Rules:
- Staff config routing per org + per event type
- Consent required for SMS/WhatsApp
- Outbound messages are created as Message status DRAFT
- Only explicit “Send” transitions DRAFT -> QUEUED and creates OutboxMessage “SendMessage”

Events that trigger alerts:
- Ticket created
- Priority changed to URGENT/EMERGENCY
- Contractor assigned/unassigned
- Scheduling proposed/confirmed
- Quote submitted/approved/rejected
- Job completed/reopened
- Invoice uploaded/extracted/approved
- Compliance due 30/14/7 days
- SLA near breach/breached

========================================================
7) API REQUIREMENTS
========================================================
- REST endpoints, OpenAPI documented in /docs/API.md
- Consistent error format
- Versioning strategy (v1 stable)

Include endpoints for:
- AI capabilities: /ai/intake, /ai/summary, /ai/message-draft, /ai/assign, /ai/duplicate, /ai/invoice-extract, /ai/risk-flags, /ai/compliance-explain
- Messaging: conversations/messages, send draft, webhooks
- Consents: opt-in/out endpoints
- Jobs: admin endpoint to view job statuses (read-only)

========================================================
8) IMPLEMENTATION ORDER (BUILD FULL SYSTEM, END-TO-END)
========================================================
PHASE 1: Repo scaffolding
- /apps/web Angular
- /apps/api .NET Web API
- /apps/jobs Node BullMQ service
- /packages/shared schemas + types
- docker-compose: Postgres, Redis, MinIO
- baseline docs

PHASE 2: Full DB schema + migrations + seed
- EF Core migrations for all entities
- seed demo org/users/properties/tickets

PHASE 3: Auth + RBAC + tenant isolation
- login/magic link/password reset
- JWT + refresh
- policy-based auth per role

PHASE 4: Tickets + work orders + quotes + invoices + portal messaging
- full workflows implemented
- audit logs and timeline events

PHASE 5: BullMQ foundation + alerts/reminders/digests
- Outbox + dispatcher + processors
- in-app + email notifications
- compliance + SLA sweeps

PHASE 6: AI intake + AI work-assist + AI comms drafts (portal)
- implement ALL AI tasks listed in section 3
- strict schemas + guardrails + eval suite

PHASE 7: Twilio SMS + WhatsApp (feature-flagged)
- consent model + opt-out
- inbound webhooks -> messages -> timeline
- outbound drafts -> explicit send -> outbox -> worker send

PHASE 8: Stripe SaaS billing + plan limits + usage metering
- tiers and entitlements
- webhook sync
- metered add-ons: SMS/WhatsApp/AI jobs

PHASE 9: Hardening
- rate limiting
- security docs
- monitoring hooks
- retries + DLQ
- runbook

========================================================
9) OUTPUT FORMAT (CURSOR)
========================================================
For each phase:
1) Summary
2) File paths + full contents for new files
3) Diffs for edits
4) Commands to run locally
5) Quick test checklist

NOW START:
Step 1: Scaffold repo + docker-compose + baseline docs.
Step 2: EF Core schema/migrations for ALL entities above.
Step 3: Implement Outbox + Node jobs service with BullMQ dispatcher + processors:
  - send email (mock provider first)
  - AI job runner (mock provider first)
Then continue phase-by-phase until the full system is running end-to-end.
