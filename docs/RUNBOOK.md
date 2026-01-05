# MaintainUK: Operations Runbook

## Local Development Setup

### Prerequisites

```bash
# Check versions
node --version    # v20+
dotnet --version  # 8.0+
docker --version  # 24.0+
psql --version   # 16+
```

### First-Time Setup

```bash
# 1. Clone repository
git clone https://github.com/maintainuk/maintainuk.git
cd maintainuk

# 2. Copy environment template
cp .env.example .env

# 3. Edit .env with local configuration
# Set database password, API keys (mock providers for development)

# 4. Start infrastructure
docker-compose up -d

# Wait 30 seconds for Postgres to initialize

# 5. Setup .NET API
cd apps/api
dotnet restore
dotnet tool install --global dotnet-ef
dotnet ef database update
dotnet run --seed

# API runs on http://localhost:5000
# Swagger: http://localhost:5000/swagger

# 6. Setup Angular (new terminal)
cd apps/web
npm install
npm start

# Web app runs on http://localhost:4200

# 7. Setup Node jobs service (new terminal)
cd apps/jobs
npm install
npm run dev

# Jobs service logs to console
```

### Daily Development Workflow

```bash
# Start infrastructure
docker-compose up -d

# Start API
cd apps/api && dotnet run

# Start web
cd apps/web && npm start

# Start jobs
cd apps/jobs && npm run dev
```

### Stop All Services

```bash
# Stop applications (Ctrl+C in terminals)

# Stop infrastructure
docker-compose down

# Stop and remove volumes (CAUTION: deletes data)
docker-compose down -v
```

## Database Operations

### Create Migration

```bash
cd apps/api
dotnet ef migrations add <MigrationName> --output-dir Infrastructure/Persistence/Migrations

# Example:
dotnet ef migrations add AddComplianceTracking
```

### Apply Migrations

```bash
# Apply all pending migrations
dotnet ef database update

# Apply to specific migration
dotnet ef database update <MigrationName>

# Rollback to previous migration
dotnet ef database update <PreviousMigrationName>
```

### Seed Data

```bash
dotnet run --seed

# Creates:
# - Demo organisation
# - Admin user (admin@demo.maintainuk.com / Demo123!)
# - 3 properties with units
# - 5 sample tickets
# - 2 contractors
```

### Database Backup (Local)

```bash
# Backup
docker exec maintainuk-postgres pg_dump -U postgres maintainuk_dev > backup_$(date +%Y%m%d_%H%M%S).sql

# Restore
docker exec -i maintainuk-postgres psql -U postgres -d maintainuk_dev < backup_20251231_120000.sql
```

### Connect to Database

```bash
# Using psql
docker exec -it maintainuk-postgres psql -U postgres -d maintainuk_dev

# Useful queries:
\dt                           # List tables
\d "MaintenanceTickets"       # Describe table
SELECT * FROM "Organisations" LIMIT 10;
SELECT COUNT(*) FROM "MaintenanceTickets";
```

## Logs & Debugging

### API Logs

```bash
# Console output (development)
cd apps/api
dotnet run

# Structured logs (production)
# Logs to stdout in JSON format, aggregated by logging service (Datadog/ELK)
```

### Jobs Service Logs

```bash
cd apps/jobs
npm run dev

# Logs show:
# - Outbox dispatcher polls
# - Job enqueued
# - Job processing started
# - Job completed/failed
```

### Angular Logs

```bash
# Browser console
# Open DevTools (F12) → Console tab

# Network requests
# DevTools → Network tab
# Filter: XHR to see API calls
```

### Trace Requests

Every API response includes `traceId`:

```json
{
  "data": {...},
  "error": null,
  "traceId": "abc123-def456-ghi789"
}
```

Search logs by `traceId` to follow request through all services.

## Testing

### .NET Unit Tests

```bash
cd apps/api
dotnet test

# With coverage
dotnet test /p:CollectCoverage=true /p:CoverageReportsFormat=lcov

# Specific test
dotnet test --filter "FullyQualifiedName~TicketServiceTests.CreateTicket_Success"
```

### .NET Integration Tests

```bash
cd apps/api
dotnet test --filter "Category=Integration"

# Uses TestContainers for Postgres/Redis
# Tests run against real database (isolated)
```

### Angular Unit Tests

```bash
cd apps/web
npm test

# Watch mode
npm test -- --watch

# Coverage
npm test -- --code-coverage
```

### Angular E2E Tests

```bash
cd apps/web
npm run e2e

# Specific spec
npm run e2e -- --spec cypress/e2e/tickets.cy.ts
```

### Node Jobs Tests

```bash
cd apps/jobs
npm test

# Watch mode
npm test -- --watch
```

## Troubleshooting

### API won't start

**Error**: `Unable to connect to database`

**Solution**:
```bash
# Check Postgres is running
docker ps | grep postgres

# Check connection string in appsettings.Development.json
# Restart Postgres
docker-compose restart postgres

# Wait 10 seconds, then retry
```

**Error**: `Port 5000 already in use`

**Solution**:
```bash
# Find process using port
lsof -i :5000  # Mac/Linux
netstat -ano | findstr :5000  # Windows

# Kill process or change port in appsettings.json
```

### Migrations fail

**Error**: `The migration '...' has already been applied`

**Solution**:
```bash
# Check migration status
dotnet ef migrations list

# If migrations out of sync, reset database (CAUTION: loses data)
dotnet ef database drop
dotnet ef database update
dotnet run --seed
```

### Jobs service not processing

**Error**: Jobs stuck in "Pending" status

**Solution**:
```bash
# Check Redis is running
docker exec maintainuk-redis redis-cli ping
# Should return "PONG"

# Check jobs service logs
cd apps/jobs
npm run dev
# Look for "Dispatcher started" message

# Manually check OutboxMessages table
docker exec -it maintainuk-postgres psql -U postgres -d maintainuk_dev
SELECT * FROM "OutboxMessages" WHERE "Status" = 'Pending' LIMIT 10;

# If dispatcher not running, restart jobs service
```

### Angular build fails

**Error**: `Module not found`

**Solution**:
```bash
# Delete node_modules and reinstall
cd apps/web
rm -rf node_modules package-lock.json
npm install
```

### CORS errors

**Error**: `Access to XMLHttpRequest ... has been blocked by CORS policy`

**Solution**:
```bash
# Check API CORS configuration in Program.cs
# Ensure http://localhost:4200 is in allowed origins
# Restart API after changing CORS settings
```

## Production Deployment

### Build

```bash
# Build Angular (production)
cd apps/web
npm run build:prod
# Output: dist/maintainuk-web

# Publish .NET API
cd apps/api
dotnet publish -c Release -o ./publish

# Build Node jobs service
cd apps/jobs
npm run build
# Output: dist/
```

### Environment Variables

**Required for Production**:

```bash
# Database
DATABASE_HOST=<RDS endpoint>
DATABASE_NAME=maintainuk_prod
DATABASE_USER=maintainuk_app
DATABASE_PASSWORD=<strong password>
DATABASE_SSL=true

# Redis
REDIS_HOST=<ElastiCache endpoint>
REDIS_PORT=6379
REDIS_PASSWORD=<strong password>

# JWT
JWT_SECRET=<256-bit random key>
JWT_ISSUER=https://api.maintainuk.com
JWT_AUDIENCE=https://app.maintainuk.com

# Storage
S3_BUCKET=maintainuk-prod-files
S3_REGION=eu-west-2
AWS_ACCESS_KEY_ID=<IAM key>
AWS_SECRET_ACCESS_KEY=<IAM secret>

# Email
RESEND_API_KEY=<API key>
EMAIL_FROM_ADDRESS=noreply@maintainuk.com

# AI
OPENAI_API_KEY=<API key>
OPENAI_MODEL=gpt-4-turbo

# Twilio (optional, feature-flagged)
TWILIO_ACCOUNT_SID=<SID>
TWILIO_AUTH_TOKEN=<token>
TWILIO_PHONE_NUMBER=<E.164 format>

# Stripe
STRIPE_SECRET_KEY=<secret key>
STRIPE_WEBHOOK_SECRET=<webhook signing secret>

# Feature Flags
FEATURE_SMS_ENABLED=false
FEATURE_WHATSAPP_ENABLED=false
```

### Database Migrations (Production)

**Pre-Deployment**:

```bash
# 1. Backup database
pg_dump -h <RDS endpoint> -U maintainuk_app -d maintainuk_prod > backup_pre_deploy.sql

# 2. Test migrations on staging
dotnet ef database update --connection "<staging connection string>"

# 3. Review migration SQL (optional)
dotnet ef migrations script <LastAppliedMigration> <NewMigration>

# 4. Apply to production
dotnet ef database update --connection "<prod connection string>"
```

**Rollback Plan**:

```bash
# Rollback migration
dotnet ef database update <PreviousMigrationName> --connection "<prod connection string>"

# Or restore from backup
psql -h <RDS endpoint> -U maintainuk_app -d maintainuk_prod < backup_pre_deploy.sql
```

### Kubernetes Deployment

```bash
# Apply manifests
kubectl apply -f k8s/

# Check deployment status
kubectl get pods -n maintainuk
kubectl get services -n maintainuk

# Check logs
kubectl logs -f deployment/api-deployment -n maintainuk
kubectl logs -f deployment/jobs-deployment -n maintainuk

# Check health
kubectl exec -it deployment/api-deployment -n maintainuk -- curl http://localhost:5000/health
```

### Rollback Deployment

```bash
# Rollback to previous version
kubectl rollout undo deployment/api-deployment -n maintainuk
kubectl rollout undo deployment/jobs-deployment -n maintainuk

# Check rollout status
kubectl rollout status deployment/api-deployment -n maintainuk
```

## Monitoring

### Health Checks

```bash
# API liveness
curl https://api.maintainuk.com/health
# Expected: {"status":"Healthy"}

# API readiness (checks DB + Redis)
curl https://api.maintainuk.com/health/ready
# Expected: {"status":"Healthy"}
```

### Metrics

**Key Metrics** (Prometheus + Grafana):

- API request rate (req/sec)
- API response time (p50, p95, p99)
- API error rate (%)
- Database connection pool usage
- Redis connection count
- BullMQ queue depth
- BullMQ job processing time
- Job success/failure rate

**Alerts**:

- API error rate > 5% for 5 minutes
- API p95 latency > 2s for 5 minutes
- Database connections > 80% for 5 minutes
- Queue depth > 1000 for 10 minutes
- Job failure rate > 10% for 10 minutes

### Log Aggregation

**Datadog / ELK Stack**:

```bash
# Search by traceId
traceId:"abc123-def456-ghi789"

# Search errors
level:ERROR

# Search by org
orgId:"org-uuid"

# Search slow queries
action:"db:query" AND duration:>1000
```

## Backup & Restore

### Automated Backups (Production)

**RDS Postgres**:
- Automated daily snapshots (retention: 30 days)
- Point-in-time recovery (PITR): 5 minutes granularity

**S3 Files**:
- Versioning enabled
- Lifecycle policy: transition to Glacier after 90 days

**Redis**:
- RDB snapshots: daily
- AOF enabled (append-only file)

### Manual Backup

```bash
# Database
pg_dump -h <RDS endpoint> -U maintainuk_app -d maintainuk_prod -F c -f maintainuk_backup_$(date +%Y%m%d).dump

# Files (S3)
aws s3 sync s3://maintainuk-prod-files s3://maintainuk-backup-$(date +%Y%m%d)
```

### Restore from Backup

```bash
# Database
pg_restore -h <RDS endpoint> -U maintainuk_app -d maintainuk_prod -c maintainuk_backup_20251231.dump

# Files (S3)
aws s3 sync s3://maintainuk-backup-20251231 s3://maintainuk-prod-files
```

### Test Restore (Quarterly)

```bash
# 1. Create test RDS instance from snapshot
# 2. Restore latest snapshot
# 3. Verify data integrity
# 4. Document results
# 5. Delete test instance
```

## Incident Response

### Critical Incident (Severity 1)

**Examples**: API down, data breach, database corruption

**Response**:

1. **Detect**: Alert via PagerDuty
2. **Acknowledge**: On-call engineer acknowledges within 15 minutes
3. **Assess**: Severity, impact, affected users
4. **Communicate**: Post status page update (status.maintainuk.com)
5. **Mitigate**: Apply hotfix, rollback, or activate DR
6. **Resolve**: Restore service
7. **Verify**: Health checks pass
8. **Communicate**: All-clear status update
9. **Post-Mortem**: Within 48 hours, document root cause and preventions

### High Incident (Severity 2)

**Examples**: Degraded performance, partial outage, elevated error rate

**Response**: Same as Severity 1, but acknowledgement within 1 hour

### Escalation

- Level 1: On-call engineer
- Level 2: Engineering lead
- Level 3: CTO

## Maintenance Windows

**Schedule**: Sundays 2-4am GMT

**Communication**: 7 days notice via email + status page

**Process**:

1. T-7 days: Announce maintenance window
2. T-1 day: Reminder email
3. T-0: Post "Maintenance in progress" status
4. Perform maintenance (database upgrades, migrations, infrastructure changes)
5. Verify health checks
6. Post "All systems operational" status

## Useful Commands

```bash
# Check API version
curl https://api.maintainuk.com/version

# Generate JWT (testing)
dotnet run --project apps/api -- generate-jwt --email admin@demo.com --orgId <uuid>

# Reset user password (admin)
dotnet run --project apps/api -- reset-password --email user@example.com

# Reprocess dead letter queue
curl -X POST https://api.maintainuk.com/api/v1/admin/dead-letters/{id}/reprocess \
  -H "Authorization: Bearer <admin-token>"

# Force compliance sweep (testing)
curl -X POST https://api.maintainuk.com/api/v1/admin/jobs/compliance-sweep/trigger \
  -H "Authorization: Bearer <admin-token>"
```

---

**Last Updated**: 2025-12-31
**On-Call Schedule**: PagerDuty rotation
**Status Page**: https://status.maintainuk.com
**Incident Log**: `/docs/incidents/`

