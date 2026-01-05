# MaintainUK Implementation Plan

**FOCUS**: UK Property Maintenance SaaS - Full Production System

## Overview

This plan breaks down the full system delivery into 9 testable phases. Each phase has:
- Clear deliverables
- Acceptance criteria
- Test checklist
- Dependencies

**Tech Stack**:
- Backend: .NET 8 Web API + EF Core + PostgreSQL
- Frontend: Angular (latest, standalone, signals) + Material + Tailwind
- Queue: BullMQ + Redis (Node jobs service)
- Storage: S3-compatible (MinIO local, S3 prod)
- Email: Resend/SendGrid
- SMS/WhatsApp: Twilio (feature-flagged)
- AI: Provider abstraction (OpenAI + local mock)

---

## Phase 0: Documentation Baseline

**Duration**: 1-2 days

### Deliverables

Create these living documents (update continuously):

1. `/docs/README.md` - System overview and quick start
2. `/docs/ASSUMPTIONS.md` - Business and technical assumptions
3. `/docs/ARCHITECTURE.md` - System architecture and component interaction
4. `/docs/SECURITY.md` - Security model, auth, RBAC, data protection
5. `/docs/API.md` - API structure, versioning, error handling
6. `/docs/AI.md` - AI capabilities, schemas, safety guardrails
7. `/docs/DB.md` - Entity model, relationships, indexes, migrations
8. `/docs/UK_COMPLIANCE.md` - GDPR, accessibility, tenant rights
9. `/docs/RUNBOOK.md` - Local setup, deployment, troubleshooting
10. `/docs/ROADMAP.md` - Phase timeline and milestones
11. `/docs/TESTING.md` - Test strategy, coverage targets, e2e flows

### Acceptance Criteria

- [ ] All 11 documents created with initial structure
- [ ] README contains setup instructions
- [ ] ARCHITECTURE includes component diagram (ASCII or Mermaid)
- [ ] SECURITY documents hard safety rules for AI
- [ ] AI.md lists all AI capabilities with JSON schema references
- [ ] DB.md shows entity relationships and multi-tenancy strategy

### Test Checklist

- Documents are readable and well-structured
- No placeholders or TODOs without context
- Cross-references between docs work

---

## Phase 1: Repository Scaffolding

**Duration**: 2-3 days
**Dependencies**: Phase 0

### Deliverables

#### 1.1 Monorepo Structure

```
/apps/web                 Angular app
/apps/api                 .NET 8 Web API
/apps/jobs                Node BullMQ worker service
/packages/shared          Shared contracts, schemas, types
/docs                     Documentation
/docker-compose.yml       Local stack (Postgres, Redis, MinIO)
/.env.example             Template for secrets
/.gitignore               Ignore patterns
/README.md                Root readme
```

#### 1.2 Angular App (`/apps/web`)

- Standalone components architecture
- Feature-first structure:
  ```
  /apps/web/src/app/
    /core                 (auth, http, guards)
    /shared               (components, pipes, utils)
    /features             (each domain feature)
      /auth
      /properties
      /tickets
      /messaging
      /contractors
      /tenants
      /compliance
      /reporting
    /layouts              (shell, toolbar, sidebar)
  ```
- Material module setup
- Tailwind config
- Environment files (dev, prod)
- Angular signals store pattern scaffolded
- Reactive Forms setup
- HTTP interceptors (auth, errors, loading)

#### 1.3 .NET API (`/apps/api`)

Layered structure:
```
/apps/api/
  /Contracts             DTOs, requests, responses
  /Domain                Entities, value objects, enums
  /Application           Services, interfaces, use cases
  /Infrastructure        EF Core, repos, external integrations
  /Api                   Minimal API endpoints, middleware
  Program.cs             Entry point (no Startup.cs)
  appsettings.json       Config
```

- Consistent response envelope: `{ data, error, traceId }`
- Global error handling middleware
- JWT auth setup (no implementation yet)
- CORS policy
- OpenAPI/Swagger
- Health check endpoint

#### 1.4 Node Jobs Service (`/apps/jobs`)

```
/apps/jobs/
  /src/
    /processors          BullMQ job processors
    /schedulers          Repeatable job definitions
    /lib                 Shared utilities (DB, Redis, logger)
    index.ts             Service entry point
  package.json
  tsconfig.json
  .env.example
```

- BullMQ + Redis connection
- Logger (pino or winston)
- Postgres connection pool (pg library)
- Outbox dispatcher (poll and enqueue)
- Basic processor structure (no logic yet)

#### 1.5 Shared Package (`/packages/shared`)

```
/packages/shared/
  /schemas               JSON schemas (Zod or AJV)
  /types                 TypeScript types
  /contracts             .NET DTOs (C#)
  /constants             Enums, status codes
```

- Shared enums: TicketStatus, Priority, Role, MessageChannel
- JSON schema examples (to be expanded)

#### 1.6 Docker Compose

Services:
- PostgreSQL 16
- Redis 7
- MinIO (S3-compatible storage)
- (Optional) Adminer/pgAdmin for DB inspection

#### 1.7 Scripts

- `/scripts/setup.sh` (Linux/Mac)
- `/scripts/setup.ps1` (Windows)
- Installs dependencies, seeds DB, starts services

### Acceptance Criteria

- [ ] All folders and baseline files created
- [ ] Angular app runs on `http://localhost:4200`
- [ ] .NET API runs on `http://localhost:5000` with Swagger at `/swagger`
- [ ] Node jobs service starts without errors
- [ ] Docker Compose brings up Postgres, Redis, MinIO
- [ ] Health check endpoint returns 200
- [ ] `.env.example` documents all required secrets

### Test Checklist

```bash
# Start infrastructure
docker-compose up -d

# Verify Postgres
docker exec -it maintainuk-postgres psql -U postgres -c "SELECT 1"

# Verify Redis
docker exec -it maintainuk-redis redis-cli ping

# Verify MinIO
curl http://localhost:9000/minio/health/live

# Start .NET API
cd apps/api
dotnet run
# Visit http://localhost:5000/health → 200 OK
# Visit http://localhost:5000/swagger

# Start Angular
cd apps/web
npm install
npm start
# Visit http://localhost:4200 → Angular welcome

# Start Node jobs service
cd apps/jobs
npm install
npm run dev
# Logs show connection to Redis and Postgres
```

---

## Phase 2: Database Schema & Migrations

**Duration**: 3-4 days
**Dependencies**: Phase 1

### Deliverables

#### 2.1 Core Entities (EF Core)

**Auth & Org**:
- `Organisation` - OrgId, Name, Slug, Plan, Status, BillingEmail, CreatedAt
- `User` - UserId, Email, PasswordHash, Role, OrgId, IsActive, LastLoginAt
- `RefreshToken` - TokenId, UserId, Token, ExpiresAt

**Properties & Tenancies**:
- `Property` - PropertyId, OrgId, Address (value object), Type, Status, OwnerContact
- `Unit` - UnitId, PropertyId, OrgId, UnitNumber, Bedrooms, Status
- `Tenancy` - TenancyId, UnitId, OrgId, TenantContactId, StartDate, EndDate, RentAmount, DepositAmount, Status
- `OwnerLink` - OwnerId, PropertyId, OrgId, OwnerContactId, OwnershipPercentage

**Contacts**:
- `ContactPoint` - ContactId, OrgId, Type (Tenant/Owner/Contractor), Name, Email, PhoneE164, PreferredChannel
- `ConsentRecord` - ConsentId, ContactId, OrgId, Channel, ConsentedAt, OptedOutAt, IpAddress

**Tickets & Work**:
- `MaintenanceTicket` - TicketId, OrgId, UnitId, ReportedByContactId, Category, Priority, Status, Title, Description, CreatedAt, UpdatedAt, ClosedAt
- `TicketTimelineEvent` - EventId, TicketId, OrgId, EventType, ActorUserId, ActorContactId, DataJson, CreatedAt
- `WorkOrder` - WorkOrderId, TicketId, OrgId, AssignedContractorId, ScheduledStartAt, ScheduledEndAt, Status
- `Quote` - QuoteId, WorkOrderId, OrgId, ContractorId, LineItemsJson, TotalGBP, VatGBP, Status, ValidUntil
- `Invoice` - InvoiceId, WorkOrderId, OrgId, ContractorId, InvoiceNumber, LineItemsJson, TotalGBP, VatGBP, DueDate, Status, PaidAt
- `Payment` - PaymentId, InvoiceId, OrgId, AmountGBP, Method, TransactionRef, PaidAt

**Contractors**:
- `ContractorProfile` - ContractorId, OrgId, ContactId, TradeLicenses, ServiceCategories, Rating, Status

**Compliance**:
- `ComplianceItem` - ComplianceId, PropertyId, OrgId, Type (GasSafety/EPC/EICR/FireAlarm/…), DueDate, CompletedDate, CertificateStorageKey, Status

**Messaging**:
- `Conversation` - ConversationId, OrgId, TicketId, ParticipantContactIds (array), CreatedAt
- `Message` - MessageId, ConversationId, OrgId, FromUserId, FromContactId, ToContactId, Channel, Body, Status (DRAFT/QUEUED/SENT/FAILED), SentAt

**Notifications**:
- `Notification` - NotificationId, OrgId, UserId, ContactId, Type, Title, Body, Channel, Status, SentAt, ReadAt

**AI**:
- `AiJob` - AiJobId, OrgId, Capability, InputJson, OutputJson, SchemaVersion, Status, RequestedByUserId, CreatedAt, CompletedAt
- `AiPromptTemplate` - TemplateId, Capability, Version, PromptText, SchemaJson, IsActive

**Audit & Jobs**:
- `AuditLog` - AuditId, OrgId, UserId, Action, EntityType, EntityId, OldValueJson, NewValueJson, Timestamp, IpAddress, UserAgent
- `OutboxMessage` - Id (Guid), OrgId, Type, PayloadJson, Status (Pending/Dispatched/Completed/Failed/Dead), AvailableAt, Attempts, LastError, CorrelationId, CreatedAt, UpdatedAt

**Usage & Billing**:
- `UsageMeter` - MeterId, OrgId, ResourceType (SMS/WhatsApp/AiJob), Count, PeriodStart, PeriodEnd

#### 2.2 Multi-Tenancy Strategy

- Every entity has `OrgId` (except `Organisation` itself and `RefreshToken`)
- EF Core global query filter: `.HasQueryFilter(e => e.OrgId == _currentOrgId)`
- OrgId populated from JWT claims on save
- Indexes on `OrgId` for performance

#### 2.3 Migrations

- Initial migration: `dotnet ef migrations add InitialSchema`
- Seed migration: demo org, users, properties, tickets
- Encrypted fields: use AES-256 for sensitive data (access codes, bank details)

#### 2.4 Value Objects

- `Address` (Line1, Line2, City, Postcode, Country)
- `MoneyGBP` (Amount, Currency=GBP)
- `PhoneNumber` (E164 format validation)

### Acceptance Criteria

- [ ] All entities mapped in EF Core DbContext
- [ ] Initial migration generated and applied
- [ ] Seed data created: 1 org, 3 users (admin, coordinator, viewer), 2 properties, 5 tickets
- [ ] Global query filter enforces OrgId scoping
- [ ] Indexes on OrgId, TicketId, CreatedAt, Status columns
- [ ] Foreign keys and cascades defined
- [ ] Value objects serialize/deserialize correctly

### Test Checklist

```bash
# Apply migrations
cd apps/api
dotnet ef database update

# Verify schema
docker exec -it maintainuk-postgres psql -U postgres -d maintainuk_dev -c "\dt"
# Should list all tables

# Verify seed data
psql -U postgres -d maintainuk_dev -c "SELECT * FROM \"Organisations\""
psql -U postgres -d maintainuk_dev -c "SELECT * FROM \"Users\""
psql -U postgres -d maintainuk_dev -c "SELECT * FROM \"MaintenanceTickets\""

# Verify multi-tenancy filter (write simple test)
# Query tickets with different OrgId context → only scoped results returned
```

---

## Phase 3: Auth, RBAC, Tenant Isolation

**Duration**: 3-4 days
**Dependencies**: Phase 2

### Deliverables

#### 3.1 Roles & Permissions

Roles:
- `SuperAdmin` (cross-org, internal only)
- `OrgAdmin` (org owner, full access)
- `Coordinator` (manage tickets, work orders, messaging)
- `Viewer` (read-only)
- `Contractor` (portal access, assigned work only)
- `Tenant` (portal access, own tenancy only)

Permissions (examples):
- `tickets:read`, `tickets:create`, `tickets:update`, `tickets:delete`
- `workorders:assign`, `workorders:approve`
- `quotes:approve`, `invoices:approve`
- `messages:send`, `messages:read`
- `ai:use`, `ai:review`

#### 3.2 .NET API Auth

- JWT generation (access token 15 min, refresh token 7 days)
- Password hashing (BCrypt or Argon2)
- Magic link email auth (optional quick start)
- Password reset flow
- Refresh token rotation
- Policy-based authorization: `[Authorize(Policy = "tickets:create")]`
- Middleware to extract OrgId from JWT → set in DbContext

#### 3.3 Angular Auth

- Auth service with signals:
  ```typescript
  readonly user = signal<User | null>(null);
  readonly isAuthenticated = computed(() => !!this.user());
  readonly isAdmin = computed(() => this.user()?.role === 'OrgAdmin');
  ```
- Auth guard (canActivate)
- Role guard (check permissions)
- HTTP interceptor (attach JWT)
- Token refresh logic (401 → refresh → retry)
- Login/logout pages

#### 3.4 Tenant Isolation Tests

- Integration tests: user from OrgA cannot query OrgB data
- Ticket query returns only scoped tickets
- Unauthorized access returns 403

### Acceptance Criteria

- [ ] User can register (email + password)
- [ ] User can log in → receives JWT
- [ ] JWT contains: userId, email, orgId, role, permissions
- [ ] Refresh token works
- [ ] Password reset flow works (mock email for now)
- [ ] OrgId scoping enforced at DB query level
- [ ] Angular auth guard blocks unauthenticated routes
- [ ] Role guard blocks insufficient permissions
- [ ] 401 triggers token refresh
- [ ] Logout clears tokens

### Test Checklist

```bash
# Register
POST /api/v1/auth/register
{ "email": "user@example.com", "password": "SecurePass123!", "orgName": "Test Org" }
# → 201 Created, returns { userId, orgId, accessToken, refreshToken }

# Login
POST /api/v1/auth/login
{ "email": "user@example.com", "password": "SecurePass123!" }
# → 200 OK, returns tokens

# Access protected endpoint
GET /api/v1/tickets
Authorization: Bearer <accessToken>
# → 200 OK, returns tickets for user's org only

# Test cross-org isolation
# Create User1 in Org1, User2 in Org2
# User1 requests User2's ticket by ID → 404 or 403

# Refresh token
POST /api/v1/auth/refresh
{ "refreshToken": "..." }
# → 200 OK, new access token

# Password reset request
POST /api/v1/auth/password-reset-request
{ "email": "user@example.com" }
# → 200 OK, email sent (check logs)

# Password reset confirm
POST /api/v1/auth/password-reset-confirm
{ "token": "...", "newPassword": "NewPass123!" }
# → 200 OK

# Angular login flow
# Visit http://localhost:4200/login
# Enter credentials → redirected to /dashboard
# Check localStorage for tokens
# Refresh page → still logged in (token refresh works)
# Logout → tokens cleared, redirected to /login
```

---

## Phase 4: Core Workflows (Tickets, Work Orders, Messaging)

**Duration**: 5-7 days
**Dependencies**: Phase 3

### Deliverables

#### 4.1 Tickets Module

**Backend**:
- `POST /api/v1/tickets` - Create ticket
- `GET /api/v1/tickets` - List tickets (filter, sort, paginate)
- `GET /api/v1/tickets/:id` - Get ticket detail + timeline
- `PATCH /api/v1/tickets/:id` - Update ticket (status, priority, assignment)
- `DELETE /api/v1/tickets/:id` - Soft delete
- Timeline event creation on every mutation
- Audit log on every change

**Frontend**:
- Ticket list page (table/card view, filters, search)
- Ticket detail page (header, timeline, attachments, actions)
- Create ticket form (reactive forms, validation)
- Edit ticket modal
- Status workflow (New → Assigned → In Progress → Completed → Closed)
- Priority badges (Emergency=red, Urgent=orange, Routine=blue)

#### 4.2 Work Orders Module

**Backend**:
- `POST /api/v1/work-orders` - Create from ticket
- `GET /api/v1/work-orders/:id` - Get detail
- `PATCH /api/v1/work-orders/:id/assign` - Assign contractor
- `PATCH /api/v1/work-orders/:id/schedule` - Set dates
- `POST /api/v1/work-orders/:id/complete` - Mark complete

**Frontend**:
- Work order card on ticket detail
- Assign contractor dropdown (filtered by category)
- Schedule picker
- Work order status timeline

#### 4.3 Quotes Module

**Backend**:
- `POST /api/v1/quotes` - Contractor submits quote
- `GET /api/v1/quotes/:id` - Get quote
- `PATCH /api/v1/quotes/:id/approve` - Approve quote
- `PATCH /api/v1/quotes/:id/reject` - Reject quote

**Frontend**:
- Quote form (line items table, VAT calc)
- Quote approval workflow (coordinator review → approve/reject)
- Quote PDF preview (future: generate PDF)

#### 4.4 Invoices Module

**Backend**:
- `POST /api/v1/invoices` - Upload invoice
- `GET /api/v1/invoices/:id` - Get invoice
- `PATCH /api/v1/invoices/:id/approve` - Approve for payment
- `PATCH /api/v1/invoices/:id/mark-paid` - Mark paid

**Frontend**:
- Invoice upload (drag-drop, S3 upload)
- Invoice detail (line items, totals, status)
- Approval workflow
- Payment tracking

#### 4.5 Messaging Module (Portal Only, No SMS/WhatsApp Yet)

**Backend**:
- `POST /api/v1/conversations` - Create conversation (ticket-scoped)
- `GET /api/v1/conversations/:id/messages` - List messages
- `POST /api/v1/messages` - Create message (DRAFT status)
- `POST /api/v1/messages/:id/send` - Explicit send action (DRAFT → QUEUED, creates OutboxMessage)

**Frontend**:
- Conversation thread UI (chat-style)
- Message composer (rich text or plain)
- Draft badge
- Send button (explicit, prominent)
- Timeline integration (messages appear in ticket timeline)

#### 4.6 Audit & Timeline

- Every mutation logs to `AuditLog`
- Every ticket change creates `TicketTimelineEvent`
- Timeline rendered on ticket detail page (chronological, grouped by day)

### Acceptance Criteria

- [ ] Staff can create ticket with category, priority, description
- [ ] Staff can view ticket list with filters
- [ ] Staff can update ticket status and priority
- [ ] Timeline shows all events (created, assigned, status changed, message sent)
- [ ] Staff can create work order from ticket
- [ ] Staff can assign contractor to work order
- [ ] Contractor (portal user) can submit quote
- [ ] Staff can approve/reject quote
- [ ] Contractor can upload invoice
- [ ] Staff can approve invoice and mark paid
- [ ] Staff can send message in ticket conversation (DRAFT → Send flow)
- [ ] All changes audit-logged

### Test Checklist

```bash
# Create ticket
POST /api/v1/tickets
{ "unitId": "...", "category": "PLUMBING", "priority": "URGENT", "title": "Leak under sink", "description": "..." }
# → 201, returns ticketId

# List tickets
GET /api/v1/tickets?status=OPEN&priority=URGENT
# → 200, returns paginated list

# Get ticket detail
GET /api/v1/tickets/:ticketId
# → 200, returns ticket + timeline events

# Update priority
PATCH /api/v1/tickets/:ticketId
{ "priority": "EMERGENCY" }
# → 200, timeline event created

# Create work order
POST /api/v1/work-orders
{ "ticketId": "...", "description": "..." }
# → 201, returns workOrderId

# Assign contractor
PATCH /api/v1/work-orders/:workOrderId/assign
{ "contractorId": "..." }
# → 200, timeline event created, contractor notified (future)

# Submit quote (as contractor)
POST /api/v1/quotes
{ "workOrderId": "...", "lineItems": [...], "totalGBP": 250.00, "vatGBP": 50.00 }
# → 201, returns quoteId

# Approve quote (as coordinator)
PATCH /api/v1/quotes/:quoteId/approve
# → 200, timeline event created

# Upload invoice (as contractor)
POST /api/v1/invoices
{ "workOrderId": "...", "invoiceNumber": "INV-001", "fileKey": "...", "totalGBP": 300.00 }
# → 201, returns invoiceId

# Approve invoice
PATCH /api/v1/invoices/:invoiceId/approve
# → 200

# Mark paid
PATCH /api/v1/invoices/:invoiceId/mark-paid
{ "paidAt": "2025-01-15", "method": "BACS", "transactionRef": "..." }
# → 200

# Create message (DRAFT)
POST /api/v1/messages
{ "conversationId": "...", "body": "Please send photos", "toContactId": "..." }
# → 201, status=DRAFT

# Send message
POST /api/v1/messages/:messageId/send
# → 200, status=QUEUED, OutboxMessage created

# Angular E2E
# Login as coordinator
# Navigate to tickets
# Create new ticket → form validation works
# Submit → redirected to ticket detail
# Timeline shows "Ticket created" event
# Update priority → timeline updates
# Create work order → card appears
# Assign contractor → dropdown filtered by trade
# Submit (as contractor) → quote form works
# Approve quote (as coordinator) → status changes
```

---

## Phase 5: BullMQ Foundation (Outbox, Alerts, Reminders)

**Duration**: 4-5 days
**Dependencies**: Phase 4

### Deliverables

#### 5.1 Outbox Pattern

**Outbox Dispatcher (Node Jobs Service)**:
- Poll `OutboxMessage` table every 5 seconds
- `SELECT ... WHERE Status = 'Pending' AND AvailableAt <= NOW() FOR UPDATE SKIP LOCKED LIMIT 100`
- Enqueue to BullMQ with `jobId = OutboxMessage.Id`
- Update status to `Dispatched`

**Outbox Publisher (.NET API)**:
- `IOutboxPublisher` service
- Methods: `PublishEmailAsync`, `PublishAiJobAsync`, `PublishSmsAsync`, etc.
- Always writes to Outbox, never directly enqueues

#### 5.2 BullMQ Processors

**Email Processor**:
- Job type: `send-email`
- Reads payload: `{ to, subject, body, templateId }`
- Calls email provider (mock for now: logs email)
- On success: updates Outbox → `Completed`, logs to AuditLog
- On failure: updates Outbox → `Failed`, increments attempts, schedules retry

**AI Job Processor**:
- Job type: `ai-job`
- Reads payload: `{ aiJobId, capability, inputJson }`
- Calls AI provider (mock for now: returns fixed JSON)
- Validates output against JSON schema
- On success: writes result to `AiJob.OutputJson`, status=`Completed`
- On failure: marks `Failed`, logs error

**SMS Processor** (stub for now):
- Job type: `send-sms`
- Logs payload (no actual send until Phase 7)

#### 5.3 Repeatable Jobs (Schedulers)

**Compliance Reminder Sweep** (daily at 9am):
- Query `ComplianceItem WHERE DueDate IN (NOW() + 30 days, NOW() + 14 days, NOW() + 7 days)`
- Create notification for each
- Create OutboxMessage for email

**SLA Escalation Sweep** (every 5 min):
- Query tickets near SLA breach
- Calculate risk score
- Create notification if high risk
- Create timeline event

**Digest Generator** (daily/weekly):
- Generate ops summary per org
- Email to org admins

**Dead Letter Reprocessor** (hourly):
- Query `OutboxMessage WHERE Status = 'Dead' AND Attempts < 5`
- Reset to `Pending` for retry

#### 5.4 Notifications

**Backend**:
- `POST /api/v1/notifications` (internal, from jobs service)
- `GET /api/v1/notifications` (user's notifications)
- `PATCH /api/v1/notifications/:id/read` (mark as read)

**Frontend**:
- Notification bell icon (count badge)
- Notification panel (dropdown)
- Mark as read
- Click → navigate to ticket/entity

#### 5.5 Email Templates

- HTML email templates (Handlebars or Razor)
- Templates:
  - Ticket created
  - Priority changed to emergency
  - Contractor assigned
  - Quote submitted
  - Invoice uploaded
  - Compliance due soon
  - SLA near breach

### Acceptance Criteria

- [ ] Outbox dispatcher polls and enqueues messages
- [ ] Email processor sends emails (mock logs)
- [ ] AI job processor runs (mock returns fixed JSON)
- [ ] Repeatable jobs scheduled and run on time
- [ ] Compliance reminder sweep creates notifications
- [ ] SLA sweep flags at-risk tickets
- [ ] Notifications appear in API and Angular UI
- [ ] User can mark notifications as read
- [ ] Failed jobs retry with exponential backoff
- [ ] Dead letter queue accumulates max-retry failures

### Test Checklist

```bash
# Start jobs service
cd apps/jobs
npm run dev
# Logs show: "Dispatcher started", "Compliance sweep scheduled"

# Create OutboxMessage manually
INSERT INTO "OutboxMessages" (...)
VALUES ('send-email', '{"to":"test@example.com","subject":"Test","body":"..."}', 'Pending', NOW());

# Watch jobs service logs
# Should show: "Enqueued job send-email", "Processed job send-email", "Email sent (mock)"

# Check Outbox status updated
SELECT * FROM "OutboxMessages" WHERE Id = '...';
# Status = 'Completed'

# Check AuditLog
SELECT * FROM "AuditLogs" WHERE Action = 'email:sent';

# Trigger compliance sweep manually
# Set ComplianceItem.DueDate = NOW() + 7 days
# Wait for sweep (or trigger manually)
# Check notifications created
GET /api/v1/notifications
# → notification for compliance due soon

# Trigger SLA sweep
# Create ticket with SLA breach
# Wait for sweep
# Check ticket flagged

# Angular notifications
# Login
# Bell icon shows count
# Click → dropdown lists notifications
# Click notification → navigates to ticket
# Mark as read → count decreases

# Test retry logic
# Modify email processor to fail
# Create OutboxMessage
# Watch attempts increment, status → Failed → Dead after max retries
```

---

## Phase 6: AI Work Assist (All Capabilities)

**Duration**: 7-10 days
**Dependencies**: Phase 5

### Deliverables

Implement ALL AI capabilities listed in section 3 of prompt.md.

#### 6.1 AI Infrastructure

**JSON Schemas** (`/packages/shared/schemas/ai`):
- `intake-output.schema.json`
- `summary-output.schema.json`
- `message-draft-output.schema.json`
- `assign-suggestions-output.schema.json`
- `duplicate-detection-output.schema.json`
- `risk-flags-output.schema.json`
- `invoice-extract-output.schema.json`
- `compliance-explain-output.schema.json`
- `reporting-insights-output.schema.json`

All schemas must include:
- `schemaVersion`
- `requiresHumanApproval` (true for drafts, approvals, payments)
- `redactedFields` (list of redacted inputs)

**AI Provider Abstraction** (`/apps/api/Infrastructure/AI`):
- `IAiProvider` interface
- `OpenAiProvider` implementation
- `MockAiProvider` implementation (returns fixed valid JSON)
- Configuration: provider type, API key, model, temperature
- Audit: log every request and response

**Safety Guardrails**:
- Redact sensitive data before sending (keysafe codes, bank refs, ID numbers)
- Validate output against JSON schema (fail closed)
- Log redaction actions
- Enforce `requiresHumanApproval` flag in UI
- Never auto-execute AI output (approve, pay, send)

#### 6.2 Staff AI Capabilities

##### A) Ticket Intake & Triage

**Endpoint**: `POST /api/v1/ai/intake`

**Input**:
```json
{
  "ticketId": "...",
  "description": "...",
  "attachments": []
}
```

**Output** (schema):
```json
{
  "schemaVersion": "1.0",
  "category": "PLUMBING",
  "priority": "URGENT",
  "missingInfo": ["photos of leak source", "tenant availability"],
  "safetyFlags": ["water near electrical outlet"],
  "summary": "Leak under kitchen sink affecting electrical socket. Requires immediate attention."
}
```

**Frontend**:
- "AI Triage" button on ticket create/edit
- Shows loading spinner
- Displays output in card
- Pre-fills form fields (user can edit)

##### B) Timeline Summarisation

**Endpoint**: `POST /api/v1/ai/summarise`

**Output**:
```json
{
  "whatHappened": "...",
  "lastUpdate": "...",
  "nextAction": "...",
  "risks": ["..."]
}
```

**Frontend**:
- Summary card at top of ticket detail
- Refresh button

##### C) Message Drafting

**Endpoint**: `POST /api/v1/ai/draft-message`

**Input**:
```json
{
  "ticketId": "...",
  "recipient": "TENANT",
  "channel": "PORTAL",
  "intent": "request_photos"
}
```

**Output**:
```json
{
  "requiresHumanSend": true,
  "subject": "...",
  "body": "...",
  "tone": "polite"
}
```

**Frontend**:
- "Draft Message" button
- Intent picker (request photos, update status, propose appointment)
- Draft appears in textarea (editable)
- "Send" button (explicit, primary)

##### D) Contractor Assignment Suggestions

**Endpoint**: `POST /api/v1/ai/suggest-contractors`

**Output**:
```json
{
  "suggestions": [
    { "contractorId": "...", "reason": "...", "constraints": ["available Mon-Fri"] }
  ]
}
```

**Frontend**:
- Suggestions list on work order assign
- Click to select

##### E) Duplicate Issue Detection

**Endpoint**: `POST /api/v1/ai/detect-duplicates`

**Output**:
```json
{
  "duplicates": [
    { "ticketId": "...", "similarity": 0.85, "reason": "..." }
  ]
}
```

**Frontend**:
- Warning banner if duplicates found
- "Link Tickets" action

##### F) SLA & Risk Prediction

**Endpoint**: `POST /api/v1/ai/predict-risk`

**Output**:
```json
{
  "riskLevel": "HIGH",
  "breachProbability": 0.75,
  "explanation": "..."
}
```

**Frontend**:
- Risk badge on ticket list/detail

##### G) Invoice & Cost Review

**Endpoint**: `POST /api/v1/ai/extract-invoice`

**Input**:
```json
{
  "invoiceFileKey": "..."
}
```

**Output**:
```json
{
  "invoiceNumber": "...",
  "lineItems": [...],
  "totalGBP": 300.00,
  "vatGBP": 60.00,
  "anomalies": [
    { "type": "TOTAL_EXCEEDS_QUOTE", "severity": "HIGH", "description": "..." }
  ]
}
```

**Frontend**:
- "Extract Invoice" button on upload
- Pre-fills invoice form
- Anomalies highlighted in red

##### H) Compliance Support

**Endpoint**: `POST /api/v1/ai/explain-compliance`

**Input**:
```json
{
  "complianceType": "GAS_SAFETY"
}
```

**Output**:
```json
{
  "plainEnglishExplanation": "...",
  "requiredDocuments": [...],
  "consequences": "..."
}
```

**Frontend**:
- "Explain" button on compliance items
- Modal with explanation

##### I) Reporting & Insights

**Endpoint**: `POST /api/v1/ai/generate-insights`

**Output**:
```json
{
  "summary": "...",
  "spendHighlights": [...],
  "contractorPerformance": [...],
  "recommendations": [...]
}
```

**Frontend**:
- Weekly ops summary page
- AI-generated paragraphs

#### 6.3 Tenant Portal AI

##### A) Guided Issue Reporting

**Endpoint**: `POST /api/v1/ai/tenant/guided-intake`

**Frontend**:
- Multi-step wizard
- AI asks 3-8 questions based on category
- Smart attachment prompts
- Emergency override (gas smell → immediate alert)

##### B) Status Explanations

**Endpoint**: `POST /api/v1/ai/tenant/explain-status`

**Frontend**:
- "What does this mean?" button on ticket status

##### C) Assisted Message Composition

**Endpoint**: `POST /api/v1/ai/tenant/message-assist`

**Frontend**:
- Suggestions for what to include in message

#### 6.4 Contractor Portal AI

##### A) Job Understanding Summary

**Endpoint**: `POST /api/v1/ai/contractor/job-summary`

**Frontend**:
- Summary card on work order detail

##### B) Quote Structure Assistance

**Endpoint**: `POST /api/v1/ai/contractor/quote-assist`

**Frontend**:
- Suggests line items (not prices)

##### C) Completion Checklist

**Endpoint**: `POST /api/v1/ai/contractor/completion-checklist`

**Frontend**:
- Checklist on job completion

#### 6.5 Comms AI

##### A) Channel-Aware Drafts

- Portal: detailed
- SMS: short (160 chars), no sensitive data
- WhatsApp: conversational, photo-friendly

##### B) Inbound Message Summarisation

**Endpoint**: `POST /api/v1/ai/summarise-inbound`

**Frontend**:
- Timeline event from SMS/WhatsApp

##### C) Next Message Suggestions

**Frontend**:
- Quick action chips (request photos, propose appointment, chase contractor)

### Acceptance Criteria

- [ ] All AI endpoints implemented
- [ ] JSON schemas validated on every output
- [ ] Mock provider returns valid JSON
- [ ] OpenAI provider works (if key provided)
- [ ] Redaction logic redacts sensitive fields
- [ ] All AI outputs audit-logged
- [ ] UI enforces "requiresHumanSend" flag (no auto-send)
- [ ] Staff can use AI triage on ticket creation
- [ ] Staff can draft messages with AI (must explicitly send)
- [ ] Staff can extract invoices with AI
- [ ] Tenant can use guided intake wizard
- [ ] Contractor can use quote assist
- [ ] Emergency overrides work (gas smell → high priority)
- [ ] Anomaly flags visible on invoices

### Test Checklist

```bash
# AI triage
POST /api/v1/ai/intake
{ "ticketId": "...", "description": "Kitchen sink leaking near socket" }
# → 200, returns { category: "PLUMBING", priority: "URGENT", safetyFlags: [...] }

# Verify schema validation
# Modify mock provider to return invalid JSON (missing field)
# → 500, error logged, output rejected

# Verify redaction
POST /api/v1/ai/intake
{ "description": "Keysafe code is 1234, leak in bathroom" }
# Check AuditLog → redaction logged
# Check AI request → code replaced with "[REDACTED]"

# AI message draft
POST /api/v1/ai/draft-message
{ "ticketId": "...", "recipient": "TENANT", "intent": "request_photos" }
# → 200, returns { requiresHumanSend: true, body: "..." }

# Verify requiresHumanSend enforced
# Frontend: "Send" button must be clicked (not auto-sent)

# AI invoice extraction
POST /api/v1/ai/extract-invoice
{ "invoiceFileKey": "..." }
# → 200, returns { invoiceNumber: "...", lineItems: [...], anomalies: [...] }

# Verify anomaly detection
# Create invoice with total > approved quote
# → anomaly flag: "TOTAL_EXCEEDS_QUOTE"

# Emergency override (tenant portal)
POST /api/v1/ai/tenant/guided-intake
{ "description": "I smell gas" }
# → 200, returns { priority: "EMERGENCY", safetyFlags: ["gas_leak"] }

# Angular E2E
# Login as coordinator
# Create ticket
# Click "AI Triage" → loading → output appears
# Fields pre-filled (editable)
# Click "Draft Message" → draft appears in textarea
# Edit draft
# Click "Send" → message queued

# Test all AI endpoints with mock provider
# All should return valid JSON conforming to schema
```

---

## Phase 7: Twilio SMS & WhatsApp (Feature-Flagged)

**Duration**: 4-5 days
**Dependencies**: Phase 6

### Deliverables

#### 7.1 Feature Flags

**Backend**:
- `FeatureFlags` table (OrgId, FeatureKey, IsEnabled)
- Feature keys: `SMS_ENABLED`, `WHATSAPP_ENABLED`
- Middleware to check flags per request

**Frontend**:
- Feature flag service (checks API)
- Conditional rendering (SMS/WhatsApp options only if enabled)

#### 7.2 Consent Model

**Backend**:
- `ConsentRecord` entity (already in Phase 2)
- `POST /api/v1/consents/opt-in` (channel, contact)
- `POST /api/v1/consents/opt-out` (channel, contact)
- Webhook: Twilio opt-out keywords (STOP, UNSUBSCRIBE) → update consent

**Frontend**:
- Consent management page (per contact)
- Opt-in/out buttons

#### 7.3 Twilio Integration

**Backend**:
- `ITwilioService` interface
- `TwilioService` implementation (Twilio SDK)
- Send SMS: via Outbox → BullMQ processor
- Send WhatsApp: via Outbox → BullMQ processor
- Inbound webhook: `POST /api/v1/webhooks/twilio/inbound`
  - Parse message
  - Create `Message` entity
  - Create `TicketTimelineEvent`
  - Respond (if needed)

**Outbound SMS/WhatsApp Flow**:
1. User clicks "Send" on draft message (channel=SMS or WHATSAPP)
2. API validates consent (fail if opted out)
3. API creates OutboxMessage type=`send-sms` or `send-whatsapp`
4. BullMQ processor sends via Twilio
5. Processor updates Message status → `SENT`
6. Audit log

**Inbound Flow**:
1. Twilio webhook POSTs to `/api/v1/webhooks/twilio/inbound`
2. API parses: From, Body, MediaUrls
3. API creates Message (status=RECEIVED)
4. API creates TicketTimelineEvent (if linked to ticket/contact)
5. Optionally: AI summarisation → timeline event
6. Notification to staff

#### 7.4 SMS/WhatsApp Processors (Node Jobs Service)

**SMS Processor**:
- Job type: `send-sms`
- Payload: `{ messageId, to, body }`
- Call Twilio API
- Update Message status
- Log to AuditLog

**WhatsApp Processor**:
- Job type: `send-whatsapp`
- Similar to SMS
- Use Twilio WhatsApp sandbox for dev, approved number for prod

#### 7.5 Channel-Aware UI

**Frontend**:
- Message composer: channel selector (Portal / SMS / WhatsApp)
- SMS: char limit indicator (160/320/480)
- WhatsApp: media attachment support
- Sent messages show channel icon

### Acceptance Criteria

- [ ] Feature flags control SMS/WhatsApp availability
- [ ] Consent opt-in/opt-out works
- [ ] Outbound SMS sends via Twilio (if consent given)
- [ ] Outbound WhatsApp sends via Twilio (if consent given)
- [ ] Inbound SMS creates message and timeline event
- [ ] Inbound WhatsApp creates message and timeline event
- [ ] Opt-out keywords (STOP) respected
- [ ] Audit log records all outbound attempts
- [ ] SMS char limit enforced
- [ ] Media attachments work on WhatsApp

### Test Checklist

```bash
# Enable feature flag
POST /api/v1/feature-flags
{ "orgId": "...", "featureKey": "SMS_ENABLED", "isEnabled": true }

# Opt-in contact for SMS
POST /api/v1/consents/opt-in
{ "contactId": "...", "channel": "SMS" }
# → 200

# Send SMS (create draft)
POST /api/v1/messages
{ "conversationId": "...", "toContactId": "...", "channel": "SMS", "body": "Your appointment is confirmed" }
# → 201, status=DRAFT

# Send SMS (explicit)
POST /api/v1/messages/:messageId/send
# → 200, OutboxMessage created

# Wait for BullMQ processor
# Check logs: "Sending SMS via Twilio"
# Check Twilio console: message sent

# Inbound SMS (simulate webhook)
POST /api/v1/webhooks/twilio/inbound
{ "From": "+44...", "Body": "I'll be there at 2pm", "MessageSid": "..." }
# → 200, Message created, timeline event created

# Check timeline
GET /api/v1/tickets/:ticketId
# → timeline shows inbound SMS event

# Opt-out test
POST /api/v1/webhooks/twilio/inbound
{ "From": "+44...", "Body": "STOP" }
# → 200, ConsentRecord updated (OptedOutAt set)

# Try to send SMS to opted-out contact
POST /api/v1/messages/:messageId/send
# → 400, error: "Contact has opted out of SMS"

# WhatsApp (repeat similar flow)
# Send WhatsApp with image attachment
# Inbound WhatsApp with image
# Check timeline shows image

# Angular UI
# Enable feature flag
# Message composer shows SMS/WhatsApp options
# Select SMS → char counter appears
# Type 200 chars → warning
# Send → success
```

---

## Phase 8: SaaS Billing & Usage Metering

**Duration**: 5-6 days
**Dependencies**: Phase 7

### Deliverables

#### 8.1 Subscription Plans

**Plans**:
- `Free` (1 org, 5 properties, 50 tickets/month, no SMS/WhatsApp, no AI)
- `Starter` (£49/month, 1 org, 20 properties, 500 tickets/month, 100 SMS, 50 AI jobs)
- `Professional` (£199/month, 1 org, unlimited properties/tickets, 1000 SMS, 500 AI jobs, WhatsApp)
- `Enterprise` (custom pricing, multi-org, custom limits)

**Metered Add-ons**:
- SMS: £0.05/message
- WhatsApp: £0.08/message
- AI jobs: £0.10/job

#### 8.2 Stripe Integration

**Backend**:
- `IStripeService` interface
- Webhook: `POST /api/v1/webhooks/stripe`
  - `customer.subscription.created`
  - `customer.subscription.updated`
  - `customer.subscription.deleted`
  - `invoice.paid`
  - `invoice.payment_failed`
- Sync subscription status to `Organisation.SubscriptionStatus`
- Usage reporting: send usage to Stripe API monthly

**Frontend**:
- Billing page (current plan, usage, invoices)
- Upgrade/downgrade flow (redirect to Stripe Checkout)
- Usage meters (SMS, WhatsApp, AI jobs)

#### 8.3 Usage Tracking

**Backend**:
- Increment `UsageMeter` on:
  - SMS sent
  - WhatsApp sent
  - AI job completed
- Query current usage: `GET /api/v1/billing/usage`
- Enforce limits:
  - If over limit → block action, show upgrade prompt
  - Soft limits (warn at 80%) vs hard limits (block at 100%)

**Frontend**:
- Usage progress bars
- Upgrade CTA when near limit

#### 8.4 Invoicing

**Backend**:
- Stripe handles invoicing
- Webhook updates `Organisation.LastInvoicePaidAt`

**Frontend**:
- Invoice history page (fetched from Stripe)

### Acceptance Criteria

- [ ] Organisation has subscription plan
- [ ] Stripe webhooks sync subscription status
- [ ] Usage meters track SMS/WhatsApp/AI jobs
- [ ] Limits enforced (block if exceeded)
- [ ] Billing page shows current plan and usage
- [ ] Upgrade flow redirects to Stripe Checkout
- [ ] Downgrade flow updates subscription
- [ ] Invoices displayed on billing page
- [ ] Failed payment triggers notification

### Test Checklist

```bash
# Seed org with "Starter" plan
UPDATE "Organisations" SET Plan = 'Starter', SmsLimit = 100, AiJobLimit = 50 WHERE Id = '...';

# Send SMS (increment usage)
# Check UsageMeter
SELECT * FROM "UsageMeters" WHERE OrgId = '...' AND ResourceType = 'SMS';
# Count incremented

# Approach limit
# Send 99 SMS (usage = 99/100)
# Frontend shows warning: "80% of SMS limit used"

# Exceed limit
# Try to send 101st SMS
# → 403, error: "SMS limit exceeded, please upgrade"

# Upgrade flow
# Click "Upgrade" → redirected to Stripe Checkout
# Complete payment (use Stripe test card)
# Webhook fires → subscription updated
# Check Organisation.Plan = 'Professional', SmsLimit = 1000

# Stripe webhook (manual test via Stripe CLI)
stripe listen --forward-to localhost:5000/api/v1/webhooks/stripe
stripe trigger customer.subscription.created
# Check logs: webhook received and processed

# Billing page
# Visit http://localhost:4200/billing
# Shows: current plan, usage bars, invoice history
# Click "Upgrade" → Stripe Checkout
```

---

## Phase 9: Hardening & Production Readiness

**Duration**: 5-7 days
**Dependencies**: Phase 8

### Deliverables

#### 9.1 Rate Limiting

**Backend**:
- Rate limit middleware (AspNetCoreRateLimit or similar)
- Per endpoint: 100 req/min per IP
- Auth endpoints: 10 req/min per IP (login, password reset)
- AI endpoints: 20 req/min per org

**Frontend**:
- Handle 429 responses (show "Please slow down" message)

#### 9.2 Security Hardening

**Backend**:
- Helmet.js equivalent for .NET (security headers)
- Content Security Policy
- HTTPS only (enforce in prod)
- SQL injection protection (parameterized queries, already done)
- XSS protection (encode outputs, Angular does this)
- CSRF protection (SameSite cookies)
- Secrets in environment variables (never in code)
- Vulnerability scan (OWASP ZAP, Snyk)

**Frontend**:
- CSP compliance
- No inline scripts
- Sanitize user input (DOMPurify for rich text)

#### 9.3 Monitoring & Observability

**Backend**:
- Structured logging (Serilog or NLog)
- Log to console (Kubernetes-friendly)
- Metrics: request duration, error rate, queue depth
- Health checks: `/health`, `/health/ready`
- Prometheus endpoint (optional)

**Frontend**:
- Error tracking (Sentry or similar)
- Performance monitoring (Web Vitals)

**Jobs Service**:
- Log job processing times
- Alert on high failure rate

#### 9.4 Retries & Dead Letter Queue

**Retries**:
- BullMQ automatic retry (exponential backoff)
- Max 5 attempts
- After 5 failures → OutboxMessage status = `Dead`

**Dead Letter Queue**:
- Manual review endpoint: `GET /api/v1/admin/dead-letters`
- Reprocess: `POST /api/v1/admin/dead-letters/:id/reprocess`

#### 9.5 Documentation Updates

- `/docs/RUNBOOK.md` - production deployment, scaling, troubleshooting
- `/docs/SECURITY.md` - security model, incident response
- `/docs/API.md` - full API reference (OpenAPI export)

#### 9.6 CI/CD

**CI Pipeline** (GitHub Actions or similar):
- Lint (ESLint, dotnet format)
- Test (Jest, xUnit, integration tests)
- Build (Angular prod build, dotnet publish)
- Security scan
- Deploy to staging

**CD Pipeline**:
- Deploy to production (manual approval)
- Database migrations (automated, with rollback plan)
- Health check after deployment

#### 9.7 Backup & Disaster Recovery

**Postgres**:
- Daily automated backups
- Point-in-time recovery (PITR)
- Test restore process quarterly

**Redis**:
- RDB snapshots daily
- AOF enabled

**S3 (MinIO/AWS)**:
- Versioning enabled
- Lifecycle policies

### Acceptance Criteria

- [ ] Rate limiting enforced on all endpoints
- [ ] Security headers set
- [ ] HTTPS enforced in prod
- [ ] Structured logging in place
- [ ] Health checks return correct status
- [ ] Error tracking captures frontend errors
- [ ] Dead letter queue reviewable by admins
- [ ] CI pipeline runs on every PR
- [ ] CD pipeline deploys to staging automatically
- [ ] Production deployment requires approval
- [ ] Database backups automated
- [ ] Backup restore tested

### Test Checklist

```bash
# Rate limiting
# Send 150 requests in 1 minute
for i in {1..150}; do curl http://localhost:5000/api/v1/tickets; done
# Last ~50 requests should return 429

# Security headers
curl -I http://localhost:5000/api/v1/health
# Check headers: X-Content-Type-Options, X-Frame-Options, Strict-Transport-Security

# Health checks
curl http://localhost:5000/health
# → 200, { "status": "Healthy" }

curl http://localhost:5000/health/ready
# → 200 if DB and Redis reachable, 503 otherwise

# Logging
# Trigger error
POST /api/v1/tickets (with invalid data)
# Check logs: structured JSON with traceId, timestamp, error details

# Dead letter queue
# Manually set OutboxMessage status = 'Dead'
GET /api/v1/admin/dead-letters
# → lists dead messages

POST /api/v1/admin/dead-letters/:id/reprocess
# → 200, message reset to Pending

# CI/CD (mock)
# Push to feature branch
# GitHub Actions runs: lint, test, build
# PR approved → merge to main
# CD pipeline deploys to staging
# Manual approval → deploys to production

# Backup restore
# Stop Postgres
docker-compose down
# Restore from backup
docker exec -i maintainuk-postgres psql -U postgres < backup.sql
# Verify data intact
docker-compose up -d
SELECT * FROM "Organisations";
```

---

## Summary: Implementation Timeline

| Phase | Duration | Deliverables |
|-------|----------|-------------|
| 0 | 1-2 days | Documentation baseline |
| 1 | 2-3 days | Repo scaffolding, Docker Compose |
| 2 | 3-4 days | Database schema & migrations |
| 3 | 3-4 days | Auth, RBAC, tenant isolation |
| 4 | 5-7 days | Tickets, work orders, messaging |
| 5 | 4-5 days | BullMQ, Outbox, notifications |
| 6 | 7-10 days | AI capabilities (all) |
| 7 | 4-5 days | Twilio SMS & WhatsApp |
| 8 | 5-6 days | Stripe billing & usage |
| 9 | 5-7 days | Hardening, monitoring, CI/CD |
| **Total** | **40-57 days** | Full production system |

---

## Key Testing Milestones

**Milestone 1** (End of Phase 3):
- [ ] User can register, log in, and access protected routes
- [ ] Multi-tenancy enforced (cross-org queries fail)

**Milestone 2** (End of Phase 4):
- [ ] Staff can create and manage tickets end-to-end
- [ ] Timeline and audit logs work
- [ ] Contractor can submit quote, staff can approve

**Milestone 3** (End of Phase 5):
- [ ] Outbox processes messages
- [ ] Emails sent (mock)
- [ ] Notifications appear in UI

**Milestone 4** (End of Phase 6):
- [ ] All AI capabilities tested with mock provider
- [ ] AI outputs validated against schemas
- [ ] Staff can use AI triage, draft messages
- [ ] Tenant can use guided intake

**Milestone 5** (End of Phase 7):
- [ ] SMS/WhatsApp send via Twilio
- [ ] Inbound messages create timeline events
- [ ] Opt-out respected

**Milestone 6** (End of Phase 8):
- [ ] Subscription plans enforced
- [ ] Usage tracked and limited
- [ ] Billing page functional

**Milestone 7** (End of Phase 9):
- [ ] Rate limiting works
- [ ] CI/CD pipeline functional
- [ ] Backups automated and tested

---

## Critical Path

1. Phase 1 (scaffolding) must complete before all others
2. Phase 2 (DB schema) blocks Phase 3+ (auth needs entities)
3. Phase 3 (auth) blocks Phase 4+ (workflows need auth)
4. Phase 5 (BullMQ) can start in parallel with Phase 4 (after Phase 3)
5. Phase 6 (AI) requires Phase 5 (BullMQ processors)
6. Phase 7 (Twilio) requires Phase 6 (AI for message drafting)
7. Phase 8 (billing) and Phase 9 (hardening) can partially overlap

---

## Next Steps

**Immediate Actions**:
1. Review and approve this plan
2. Set up project tracking (GitHub Projects, Jira, Linear)
3. Create milestones in repo
4. Start Phase 0 (documentation)
5. Proceed to Phase 1 (scaffolding)

**Weekly Checkpoints**:
- Review completed phases
- Update roadmap
- Adjust timeline if needed
- Demo to stakeholders

---

## Appendix: Command Reference

### Local Development Setup

```bash
# Clone repo
git clone <repo-url>
cd maintainuk

# Start infrastructure
docker-compose up -d

# .NET API
cd apps/api
dotnet restore
dotnet ef database update
dotnet run

# Angular
cd apps/web
npm install
npm start

# Node jobs service
cd apps/jobs
npm install
npm run dev
```

### Database Management

```bash
# Create migration
cd apps/api
dotnet ef migrations add <MigrationName>

# Apply migration
dotnet ef database update

# Rollback migration
dotnet ef database update <PreviousMigrationName>

# Seed data
dotnet run --seed
```

### Testing

```bash
# .NET unit tests
cd apps/api
dotnet test

# .NET integration tests
dotnet test --filter "Category=Integration"

# Angular unit tests
cd apps/web
npm test

# Angular e2e tests
npm run e2e
```

### Production Deployment

```bash
# Build Angular
cd apps/web
npm run build:prod

# Publish .NET API
cd apps/api
dotnet publish -c Release -o ./publish

# Build Node jobs service
cd apps/jobs
npm run build
```

---

**END OF IMPLEMENTATION PLAN**

This plan is a living document. Update continuously as requirements evolve.

