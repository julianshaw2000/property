# MaintainUK: Assumptions

This document lists business, technical, and operational assumptions made during system design and implementation.

## Business Assumptions

### Target Market
- **Geography**: UK market only (initially)
- **Users**: Property managers, landlords with 5+ properties, letting agents, contractors
- **Scale**: 100-10,000 properties per organisation
- **Pricing**: SaaS subscription model (tiered) + usage-based add-ons

### User Personas

**Property Coordinator** (primary user):
- Manages 50-500 properties
- Processes 10-100 tickets/week
- Needs fast triage and contractor assignment
- Values mobile access

**Contractor** (portal user):
- Manages 5-20 active jobs
- Submits quotes and invoices
- Needs job details and access instructions
- Values WhatsApp notifications

**Tenant** (portal user):
- Reports issues 1-2 times/year
- Checks status occasionally
- Prefers simple, guided flow
- Values SMS updates

**Landlord/Owner** (read-only, future):
- Monitors spend and compliance
- Receives monthly summaries
- Rarely logs in

### Business Rules

#### Ticket Priority
- **EMERGENCY**: Gas leak, flooding, no heating (winter), security breach
- **URGENT**: Major leak, no hot water, broken lock, heating failure (non-winter)
- **ROUTINE**: Minor repairs, cosmetic issues, non-urgent requests
- **PLANNED**: Scheduled maintenance

#### SLA Targets
- **EMERGENCY**: 2 hours response, 24 hours resolution
- **URGENT**: 24 hours response, 7 days resolution
- **ROUTINE**: 5 days response, 30 days resolution

#### Workflow States
- Tickets: NEW → ASSIGNED → IN_PROGRESS → COMPLETED → CLOSED
- Work Orders: CREATED → SCHEDULED → IN_PROGRESS → COMPLETED → VERIFIED
- Quotes: DRAFT → SUBMITTED → APPROVED or REJECTED
- Invoices: UPLOADED → REVIEWED → APPROVED → PAID

#### Financial
- All amounts in GBP
- VAT rate: 20% (configurable)
- Quote validity: 30 days default
- Invoice payment terms: 30 days default
- Contractors paid via BACS (external to system)

## Technical Assumptions

### Data Volume (per organisation)
- Properties: 10-10,000
- Active tickets: 10-1,000/month
- Archived tickets: unlimited
- Users: 5-500 staff + contractors
- Tenants: 10-20,000 contacts
- Messages: 100-10,000/month
- Documents: 100-50,000 files

### Performance Targets
- API response time: <500ms p95
- Page load: <2s initial, <500ms navigation
- Search: <1s for 10,000 records
- Concurrent users: 100-1,000/org
- Job processing latency: <5s p95

### Availability
- Target: 99.5% uptime (43.8 hours downtime/year)
- Maintenance window: Sundays 2-4am GMT
- Degraded mode acceptable for non-critical features

### Data Retention
- Active data: unlimited
- Audit logs: 7 years (UK tax law)
- Deleted records: soft delete, purge after 90 days
- Backups: 30 days point-in-time recovery

### Browser Support
- Chrome/Edge: latest 2 versions
- Firefox: latest 2 versions
- Safari: latest 2 versions
- Mobile: responsive design, iOS Safari + Chrome Android

### Multi-Tenancy
- Complete data isolation between organisations
- No cross-org queries
- OrgId in every table (except Organisation itself)
- JWT contains OrgId claim
- EF Core global query filters enforce scoping

### External Service Assumptions

#### Email (Resend/SendGrid)
- Deliverability: >95%
- Sending limit: 10,000/day (Starter plan)
- Bounce handling: webhook updates contact validity

#### SMS (Twilio)
- UK mobile numbers only
- Delivery rate: >98%
- Cost: ~£0.04/message
- Opt-out required (CAN-SPAM / PECR)
- Character limit: 160 (1 segment), 306 (2 segments), 459 (3 segments)

#### WhatsApp (Twilio)
- Business API access required
- Template approval required for marketing
- Session-based pricing: £0.005-0.08/message
- 24-hour response window after user message

#### AI Provider (OpenAI)
- Model: GPT-4 or GPT-4-turbo
- Fallback: GPT-3.5-turbo
- Token limit: 8k-128k depending on model
- Latency: 2-10s typical
- Structured output: JSON mode required
- Cost: £0.01-0.10/request typical

#### Storage (S3/MinIO)
- File size limit: 50MB/file
- Total storage: 100GB/org (Starter), unlimited (Professional+)
- Supported formats: PDF, PNG, JPG, HEIC, MP4
- Pre-signed URLs: 1 hour expiry

#### Stripe
- Currency: GBP only
- Billing cycle: monthly
- Usage reporting: monthly aggregation
- Webhook reliability: at-least-once delivery

## Security Assumptions

### Authentication
- JWT access token: 15 min expiry
- Refresh token: 7 days expiry
- Password: min 8 chars, 1 uppercase, 1 number, 1 special
- Password reset: 1 hour token expiry
- Failed logins: lock after 5 attempts, 15 min lockout

### Authorization
- Role-based + permission-based
- Roles: SuperAdmin, OrgAdmin, Coordinator, Viewer, Contractor, Tenant
- Permissions: 40+ granular permissions
- Least privilege by default

### Data Protection
- PII encrypted at rest: contact details, bank info, access codes
- Encryption: AES-256
- TLS 1.3 in transit
- Postgres connection SSL required in prod
- Redis AUTH required

### AI Safety
- No auto-send (email/SMS/WhatsApp) without explicit click
- No auto-approve (quotes, invoices, payments)
- Redact sensitive fields before AI processing
- Schema validation on all AI outputs (fail closed)
- Human-in-loop for all financial decisions
- Audit all AI requests and responses

### Compliance
- GDPR: right to access, rectify, erase, port
- Data retention: 7 years for financial records
- Consent required for SMS/WhatsApp marketing
- Accessibility: WCAG AA target
- Tenant rights: comply with Housing Act 1988, Landlord & Tenant Act 1985

## Integration Assumptions

### BullMQ Architecture
- Redis is single source of truth for queue state
- Outbox table is source of truth for message state
- Node jobs service is stateless (can scale horizontally)
- .NET API never runs cron for core workflows
- Job retries: exponential backoff, max 5 attempts
- Dead letter queue: manual review and reprocess

### Email Integration
- Templates stored in code (not DB)
- Plain text + HTML versions
- Unsubscribe link in all marketing emails
- Bounce/complaint webhooks update contact status

### File Storage
- Upload: client → pre-signed URL → S3
- Download: pre-signed URL (1 hour expiry)
- Virus scanning: ClamAV or external service
- Image thumbnails: generated on upload

## Operational Assumptions

### Deployment
- Kubernetes (production)
- Docker Compose (local dev)
- Database migrations: automated in CD pipeline
- Zero-downtime deployments: rolling updates
- Rollback: automated on health check failure

### Monitoring
- Logs: JSON structured, aggregated in Datadog/ELK
- Metrics: Prometheus + Grafana
- Alerts: PagerDuty for critical issues
- Error tracking: Sentry
- Uptime monitoring: Pingdom/UptimeRobot

### Support
- Tier 1: Email support (24 hour response)
- Tier 2: In-app chat (business hours)
- Tier 3: Dedicated account manager (Enterprise only)
- On-call: weekends for critical issues (Enterprise only)

### Backup & DR
- Database: automated daily backups, 30-day retention
- Files: S3 versioning + lifecycle policies
- Redis: RDB snapshots + AOF
- RTO: 4 hours
- RPO: 15 minutes

## Future Assumptions (Out of Scope for v1)

- ❌ Multi-currency support
- ❌ Multi-language support
- ❌ Mobile native apps (iOS/Android)
- ❌ Accounting system integration (Xero, QuickBooks)
- ❌ E-signature integration (DocuSign)
- ❌ Payment processing (rent collection)
- ❌ Tenant screening / credit checks
- ❌ Property listing / marketing
- ❌ Lease management
- ❌ Key management / smart locks
- ❌ IoT sensor integration
- ❌ Voice assistant integration

## Risks & Mitigations

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| AI provider outage | Medium | Low | Fallback to mock provider, queue retries |
| Email deliverability issues | High | Medium | Multi-provider fallback, monitor bounce rates |
| Twilio rate limits | Medium | Low | Queue throttling, batch messages |
| Stripe billing failure | High | Low | Graceful degradation, manual invoicing |
| Database scaling | Medium | Medium | Read replicas, connection pooling, indexes |
| Redis single point of failure | High | Low | Redis Sentinel or Cluster in prod |
| GDPR data breach | Critical | Low | Encryption, audit logs, incident response plan |
| AI hallucinations | Medium | Medium | Schema validation, human-in-loop, audit trail |

## Validation

These assumptions should be validated:
- With 5-10 pilot customers (beta program)
- Monthly usage metrics review
- Quarterly business review
- Annual compliance audit

**Last Updated**: 2025-12-31
**Next Review**: 2026-03-31

