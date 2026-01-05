# MaintainUK: System Architecture

## Overview

MaintainUK is a multi-tenant SaaS platform built on a modern, event-driven architecture with clear separation between frontend, backend, and asynchronous job processing.

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                         CLIENTS                                  │
├─────────────┬───────────────────┬───────────────────────────────┤
│  Web App    │  Contractor Portal │   Tenant Portal              │
│  (Angular)  │     (Angular)      │     (Angular)                │
└──────┬──────┴──────┬────────────┴───────┬───────────────────────┘
       │             │                     │
       │   HTTPS + JWT (Authorization Bearer)
       │             │                     │
       ▼             ▼                     ▼
┌─────────────────────────────────────────────────────────────────┐
│                    API GATEWAY / LOAD BALANCER                   │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                   .NET 8 WEB API (Stateless)                     │
├─────────────────────────────────────────────────────────────────┤
│  ┌──────────┐  ┌─────────┐  ┌─────────┐  ┌──────────────────┐  │
│  │ Endpoints│  │  Auth   │  │  CORS   │  │  Rate Limiting   │  │
│  │ (Minimal │  │  JWT    │  │         │  │                  │  │
│  │   API)   │  │         │  │         │  │                  │  │
│  └────┬─────┘  └────┬────┘  └────┬────┘  └────────┬─────────┘  │
│       │             │            │                 │            │
│       ▼             ▼            ▼                 ▼            │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │            Application Layer (Services)                   │  │
│  │  - Ticket Service                                        │  │
│  │  - Work Order Service                                    │  │
│  │  - Messaging Service                                     │  │
│  │  - Notification Service                                  │  │
│  │  - AI Orchestration Service                              │  │
│  │  - Outbox Publisher                                      │  │
│  └────────────────────┬─────────────────────────────────────┘  │
│                       │                                         │
│                       ▼                                         │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │               Domain Layer (Entities)                     │  │
│  │  - Organisation, User, Property, Unit, Tenancy           │  │
│  │  - MaintenanceTicket, WorkOrder, Quote, Invoice          │  │
│  │  - Message, Conversation, Notification                   │  │
│  │  - ComplianceItem, AiJob, AuditLog                       │  │
│  └────────────────────┬─────────────────────────────────────┘  │
│                       │                                         │
│                       ▼                                         │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │         Infrastructure Layer (EF Core)                    │  │
│  │  - DbContext (Multi-tenant query filters)                │  │
│  │  - Repositories                                           │  │
│  │  - External Service Adapters                             │  │
│  └────────────────────┬─────────────────────────────────────┘  │
└────────────────────────┼─────────────────────────────────────────┘
                         │
         ┌───────────────┼────────────────┐
         │               │                │
         ▼               ▼                ▼
┌────────────────┐ ┌──────────┐ ┌────────────────┐
│   PostgreSQL   │ │  Redis   │ │  MinIO (S3)    │
│   (Primary DB) │ │ (Cache + │ │  (File Storage)│
│                │ │  Queue)  │ │                │
└────────────────┘ └─────┬────┘ └────────────────┘
                         │
                         │ Poll Outbox + Enqueue
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│              NODE JOBS SERVICE (BullMQ Workers)                  │
├─────────────────────────────────────────────────────────────────┤
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  Outbox Dispatcher (every 5 seconds)                      │  │
│  │  - Poll OutboxMessage table (Pending)                     │  │
│  │  - Enqueue to BullMQ with jobId = OutboxMessage.Id        │  │
│  │  - Update status to Dispatched                            │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  BullMQ Processors (concurrent workers)                   │  │
│  │  - send-email: Email provider integration                 │  │
│  │  - send-sms: Twilio SMS                                   │  │
│  │  - send-whatsapp: Twilio WhatsApp                         │  │
│  │  - ai-job: AI provider integration                        │  │
│  │  - invoice-extract: OCR + AI extraction                   │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  Repeatable Jobs (scheduled)                              │  │
│  │  - compliance-sweep: Daily 9am                            │  │
│  │  - sla-escalation: Every 5 min                            │  │
│  │  - digest-generator: Daily/Weekly                         │  │
│  │  - dead-letter-reprocessor: Hourly                        │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
         │               │                │
         │ (HTTP)        │ (HTTP)         │ (HTTP)
         ▼               ▼                ▼
┌────────────────┐ ┌──────────┐ ┌────────────────┐
│ Resend/SendGrid│ │  Twilio  │ │    OpenAI      │
│    (Email)     │ │ (SMS/WA) │ │  (AI Provider) │
└────────────────┘ └──────────┘ └────────────────┘

         ▲               ▲
         │ Webhooks      │ Webhooks
         │               │
┌────────────────────────────────────┐
│  Webhook Ingress (.NET API)        │
│  - /webhooks/twilio/inbound        │
│  - /webhooks/stripe                │
│  - /webhooks/email (bounce)        │
└────────────────────────────────────┘
```

## Components

### 1. Frontend Layer (Angular)

**Technology**: Angular 18+ (standalone components, signals)

**Structure**:
```
/apps/web/src/app/
  /core               Auth, guards, interceptors, global services
  /shared             Reusable components, pipes, directives
  /features           Feature modules (tickets, properties, etc.)
  /layouts            Shell, toolbar, sidebar
```

**Key Patterns**:
- **Standalone components**: No NgModules
- **Signals**: Reactive state management
- **OnPush change detection**: Performance optimization
- **Reactive Forms**: All input validation
- **Material + Tailwind**: Consistent UI

**State Management**:
```typescript
@Injectable({ providedIn: 'root' })
export class TicketStore {
  private readonly _tickets = signal<Ticket[]>([]);
  private readonly _selectedId = signal<string | null>(null);
  private readonly _loading = signal(false);

  readonly tickets = this._tickets.asReadonly();
  readonly selectedTicket = computed(() =>
    this._tickets().find(t => t.id === this._selectedId())
  );
}
```

### 2. Backend Layer (.NET 8 Web API)

**Technology**: .NET 8, Minimal APIs, EF Core 8

**Layered Architecture**:

#### 2.1 API Layer (`/Api`)
- Minimal API endpoints
- Request/response DTOs only
- Route definitions
- Middleware pipeline

#### 2.2 Application Layer (`/Application`)
- Use case services
- Business orchestration
- Transaction boundaries
- Outbox publishing

#### 2.3 Domain Layer (`/Domain`)
- Entities
- Value objects
- Domain events
- Business rules

#### 2.4 Infrastructure Layer (`/Infrastructure`)
- EF Core DbContext
- Repository implementations
- External service adapters
- Email, SMS, AI providers

**Middleware Pipeline**:
```
Request → CORS → Authentication → Authorization → Rate Limiting
  → Logging → Exception Handling → Endpoint → Response Envelope
```

**Response Envelope**:
```csharp
public record ApiResponse<T>(
    T? Data,
    ApiError? Error,
    string TraceId
);
```

### 3. Data Layer (PostgreSQL + EF Core)

**Multi-Tenancy Strategy**:
- Every entity has `OrgId` (Guid)
- Global query filter: `e => e.OrgId == CurrentOrgId`
- OrgId extracted from JWT claims
- Set in DbContext on save

**Key Entities**:
- **Organisation**: Tenant root
- **User**: Staff, contractors, tenants
- **Property → Unit → Tenancy**: Hierarchy
- **MaintenanceTicket → WorkOrder → Quote → Invoice**: Workflow
- **Message, Conversation**: Multi-channel comms
- **AiJob, OutboxMessage**: Background processing
- **AuditLog**: Compliance trail

**Indexes**:
- OrgId on all tables
- Composite: (OrgId, Status, CreatedAt)
- Full-text search: ticket descriptions

### 4. Jobs Layer (Node + BullMQ)

**Technology**: Node.js 20+, BullMQ, TypeScript

**Architecture Pattern**: Outbox + Worker

#### 4.1 Outbox Dispatcher
```typescript
// Polls every 5 seconds
async function dispatchOutbox() {
  const pending = await db.query(`
    SELECT * FROM "OutboxMessages"
    WHERE "Status" = 'Pending'
      AND "AvailableAt" <= NOW()
    FOR UPDATE SKIP LOCKED
    LIMIT 100
  `);

  for (const msg of pending) {
    await queue.add(msg.Type, msg.PayloadJson, {
      jobId: msg.Id,
      attempts: 5,
      backoff: { type: 'exponential', delay: 5000 }
    });
    await db.query(`UPDATE "OutboxMessages" SET "Status" = 'Dispatched' WHERE "Id" = $1`, [msg.Id]);
  }
}
```

#### 4.2 Job Processors
- **send-email**: Resend/SendGrid integration
- **send-sms**: Twilio SMS
- **send-whatsapp**: Twilio WhatsApp
- **ai-job**: OpenAI integration with schema validation
- **invoice-extract**: OCR + AI parsing

#### 4.3 Repeatable Jobs
- **compliance-sweep**: Daily 9am (cron: `0 9 * * *`)
- **sla-escalation**: Every 5 min (cron: `*/5 * * * *`)
- **digest-generator**: Daily/weekly
- **dead-letter-reprocessor**: Hourly

### 5. External Services

#### 5.1 Email (Resend/SendGrid)
- Transactional emails only (v1)
- HTML + plain text templates
- Bounce/complaint webhooks
- Unsubscribe handling

#### 5.2 SMS/WhatsApp (Twilio)
- UK numbers only
- Consent-based
- Opt-out keywords (STOP, UNSUBSCRIBE)
- Inbound webhooks → timeline events

#### 5.3 AI (OpenAI)
- GPT-4 or GPT-4-turbo
- JSON mode (structured output)
- Schema validation (fail closed)
- Redaction of sensitive data
- Audit all requests/responses

#### 5.4 Storage (MinIO/S3)
- Pre-signed URLs for upload
- Pre-signed URLs for download (1 hour expiry)
- Virus scanning (ClamAV)
- Thumbnail generation

#### 5.5 Billing (Stripe)
- Subscription management
- Usage reporting
- Webhook sync (invoices, payments)

## Data Flow Patterns

### Pattern 1: Synchronous API Request

```
1. Client sends HTTP request with JWT
2. API validates token, extracts OrgId
3. API sets OrgId in DbContext
4. Service processes request (scoped to OrgId)
5. EF Core applies global filter (WHERE OrgId = ...)
6. Response envelope returned
```

### Pattern 2: Asynchronous Job (Outbox Pattern)

```
1. API receives request (e.g., send email)
2. API writes domain changes + OutboxMessage in transaction
3. API returns 202 Accepted
4. Outbox Dispatcher polls OutboxMessage table
5. Dispatcher enqueues to BullMQ (jobId = OutboxMessage.Id)
6. Processor executes job
7. Processor updates OutboxMessage status (Completed/Failed)
8. Processor writes AuditLog
```

### Pattern 3: Inbound Webhook

```
1. External service POSTs to /webhooks/twilio/inbound
2. API validates signature
3. API parses payload
4. API creates Message entity
5. API creates TicketTimelineEvent
6. API creates Notification for staff
7. API returns 200 OK
```

### Pattern 4: AI-Assisted Flow (Human-in-Loop)

```
1. User clicks "AI Triage" on ticket
2. API creates AiJob entity (status=Pending)
3. API creates OutboxMessage (type=ai-job)
4. API returns 202 Accepted
5. AI processor runs:
   - Redacts sensitive data
   - Calls OpenAI API
   - Validates response against JSON schema
   - Writes result to AiJob.OutputJson
6. Frontend polls /api/v1/ai-jobs/:id
7. Frontend displays AI output (editable)
8. User confirms/edits and clicks "Save"
9. API applies changes to ticket
```

## Security Architecture

### Authentication Flow

```
1. User submits email + password to /auth/login
2. API validates credentials (BCrypt hash)
3. API generates JWT access token (15 min expiry)
4. API generates refresh token (7 days expiry, stored in DB)
5. API returns tokens
6. Client stores tokens (localStorage or secure cookie)
7. Client attaches access token to requests (Authorization: Bearer)
8. On 401, client calls /auth/refresh with refresh token
9. API validates refresh token, issues new access token
```

**JWT Claims**:
```json
{
  "sub": "user-id",
  "email": "user@example.com",
  "orgId": "org-id",
  "role": "Coordinator",
  "permissions": ["tickets:read", "tickets:create", ...],
  "exp": 1735689600
}
```

### Authorization Layers

1. **Route-level**: `[Authorize]` attribute
2. **Policy-based**: `[Authorize(Policy = "tickets:create")]`
3. **Data-level**: OrgId scoping via EF global filter
4. **Entity-level**: Owner checks (e.g., contractor can only edit own quotes)

### Data Protection

- **At Rest**: AES-256 encryption for PII
- **In Transit**: TLS 1.3 (enforced in prod)
- **In Memory**: Secure string handling, no logging of secrets
- **Backups**: Encrypted backups with separate key management

## Scalability & Performance

### Horizontal Scaling

**Stateless Services** (can scale infinitely):
- .NET API (load balanced)
- Node jobs service (multiple workers)

**Stateful Services** (need clustering):
- PostgreSQL (read replicas, connection pooling)
- Redis (Sentinel or Cluster in prod)

### Performance Optimizations

**Backend**:
- EF Core query filters (auto-applied)
- Async/await everywhere
- Connection pooling (min=10, max=100)
- Response caching (Redis)
- Database indexes on hot queries

**Frontend**:
- Lazy loading (feature modules)
- OnPush change detection
- Virtual scrolling (large lists)
- Image optimization (WebP, lazy load)
- Service worker (PWA caching)

**Jobs**:
- Concurrent processing (10 workers/queue)
- Batch operations where possible
- Exponential backoff on retries

### Caching Strategy

- **API responses**: Redis cache (5-60 min TTL)
- **Static data**: In-memory cache (organisations, users)
- **CDN**: Static assets (CSS, JS, images)

## Observability

### Logging

**Structured JSON**:
```json
{
  "timestamp": "2025-12-31T10:00:00Z",
  "level": "INFO",
  "message": "Ticket created",
  "traceId": "abc123",
  "orgId": "org-456",
  "userId": "user-789",
  "ticketId": "ticket-001"
}
```

**Log Levels**:
- ERROR: Exceptions, failures
- WARN: Degraded performance, retries
- INFO: Business events (ticket created, invoice approved)
- DEBUG: Detailed execution flow (dev only)

### Metrics

- Request rate (req/sec)
- Error rate (%)
- Response time (p50, p95, p99)
- Queue depth (BullMQ)
- Job processing time
- Active connections (DB, Redis)

### Tracing

- Correlation IDs across services
- Distributed tracing (OpenTelemetry optional)

### Health Checks

- `/health` - API liveness
- `/health/ready` - API readiness (DB + Redis reachable)

## Deployment Architecture

### Development (Local)
```
Docker Compose:
  - postgres:16
  - redis:7
  - minio (S3 compatible)

Host:
  - .NET API (dotnet run)
  - Angular (npm start)
  - Node jobs (npm run dev)
```

### Production (Kubernetes)
```
Pods:
  - api-deployment (3 replicas, load balanced)
  - jobs-deployment (2 replicas)
  - web-deployment (nginx, static files)

Services:
  - api-service (ClusterIP)
  - jobs-service (ClusterIP)
  - web-service (LoadBalancer)

StatefulSets:
  - postgres (primary + replica)
  - redis (Sentinel or Cluster)

External:
  - AWS S3
  - Managed Postgres (RDS/Aurora)
  - Managed Redis (ElastiCache)
```

### CI/CD Pipeline

```
1. Code push to feature branch
2. GitHub Actions:
   - Lint (ESLint, dotnet format)
   - Test (Jest, xUnit)
   - Build (Angular prod, dotnet publish)
   - Security scan (Snyk, OWASP ZAP)
3. PR review and approval
4. Merge to main
5. Deploy to staging (automatic)
6. Integration tests (automated)
7. Manual approval gate
8. Deploy to production (rolling update)
9. Health check validation
10. Rollback on failure
```

## Disaster Recovery

### Backup Strategy
- **Postgres**: Daily automated backups, 30-day retention, PITR
- **Redis**: RDB snapshots + AOF
- **S3**: Versioning enabled, lifecycle policies

### Recovery Procedures
- **RTO** (Recovery Time Objective): 4 hours
- **RPO** (Recovery Point Objective): 15 minutes
- **Runbook**: See [RUNBOOK.md](./RUNBOOK.md)

---

**Last Updated**: 2025-12-31
**Version**: 1.0

