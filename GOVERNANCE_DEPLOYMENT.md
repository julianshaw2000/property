# Multi-Tenant SaaS Governance - Production Deployment Guide

## Overview

This guide provides step-by-step instructions for deploying the multi-tenant SaaS governance features to production. The governance system adds role-based administration, organisation management, user management, and comprehensive audit logging.

## Prerequisites

Before starting deployment:

- [ ] Production database backup completed
- [ ] Database migration reviewed and tested in staging
- [ ] At least one existing user identified to be promoted to SuperAdmin
- [ ] Deployment window scheduled (estimated 15-30 minutes downtime)
- [ ] Rollback plan reviewed and ready

## Deployment Steps

### Step 1: Pre-Deployment Verification

#### 1.1 Verify Current State

Connect to production database and verify organisations and users:

```sql
-- Check existing organisations
SELECT "Id", "Name", "Status" FROM "Organisations";

-- Check existing users and their roles
SELECT "Id", "Email", "Role", "OrgId", "IsActive" FROM "Users";

-- Count active OrgAdmins per organisation
SELECT
    o."Name" AS OrganisationName,
    COUNT(*) AS ActiveAdminCount
FROM "Organisations" o
JOIN "Users" u ON u."OrgId" = o."Id"
WHERE u."Role" = 'OrgAdmin' AND u."IsActive" = true
GROUP BY o."Id", o."Name";
```

**Expected**: Every organisation should have at least one active OrgAdmin. If any organisation has zero, manually create or promote a user to OrgAdmin before proceeding.

#### 1.2 Identify SuperAdmin Candidate

Choose a trusted platform administrator user:

```sql
-- Find candidate (adjust email as needed)
SELECT "Id", "Email", "Role", "FirstName", "LastName"
FROM "Users"
WHERE "Email" = 'platform-admin@yourdomain.com';
```

### Step 2: Deploy Application Code

#### 2.1 Deploy API

```bash
# Stop API service
sudo systemctl stop maintainuk-api

# Deploy new API build
cd /var/www/maintainuk-api
git pull origin main
dotnet publish -c Release -o ./publish

# Start API service (migrations will run next)
sudo systemctl start maintainuk-api
```

#### 2.2 Deploy Web App

```bash
# Build and deploy Angular app
cd /var/www/maintainuk-web
git pull origin main
npm install
npm run build:prod

# Copy to web server directory
sudo cp -r dist/maintainuk-web/* /var/www/html/
```

### Step 3: Run Database Migration

#### 3.1 Execute Migration

```bash
cd /var/www/maintainuk-api
dotnet ef database update --connection "<your-connection-string>"
```

**What this does:**
- Adds `PrimaryAdminUserId` column to `Organisations` table
- Creates foreign key constraint
- Automatically backfills `PrimaryAdminUserId` for existing organisations (selects first OrgAdmin by creation date)

#### 3.2 Verify Migration Success

```sql
-- Check schema change
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'Organisations' AND column_name = 'PrimaryAdminUserId';

-- Expected output:
-- column_name          | data_type | is_nullable
-- PrimaryAdminUserId   | uuid      | YES

-- Verify backfill completed
SELECT
    o."Name",
    o."PrimaryAdminUserId",
    u."Email" AS PrimaryAdminEmail
FROM "Organisations" o
LEFT JOIN "Users" u ON u."Id" = o."PrimaryAdminUserId";
```

**Expected**: Every organisation should have a `PrimaryAdminUserId` populated.

### Step 4: Create First SuperAdmin

#### 4.1 Promote User to SuperAdmin

```sql
-- Promote identified user to SuperAdmin
UPDATE "Users"
SET "Role" = 'SuperAdmin'
WHERE "Email" = 'platform-admin@yourdomain.com'
RETURNING "Id", "Email", "Role";
```

**IMPORTANT**: Only ONE SuperAdmin should exist initially. You can create additional SuperAdmins later through the admin UI.

#### 4.2 Verify SuperAdmin Creation

```sql
SELECT "Id", "Email", "Role", "FirstName", "LastName", "IsActive"
FROM "Users"
WHERE "Role" = 'SuperAdmin';
```

### Step 5: Smoke Tests

#### 5.1 SuperAdmin Login Test

1. Navigate to: `https://yourdomain.com/auth/login`
2. Login with SuperAdmin credentials
3. Verify redirect to dashboard

#### 5.2 Admin UI Access Test

1. Navigate to: `https://yourdomain.com/admin`
2. Verify admin navigation sidebar appears with:
   - Organisations (SuperAdmin only)
   - Users
   - Audit Logs

#### 5.3 Organisation Management Test

1. Navigate to: `https://yourdomain.com/admin/organisations`
2. Verify all organisations are listed
3. Click on an organisation
4. Verify:
   - Organisation details display correctly
   - User list shows all users
   - Primary Admin badge is visible
5. Test suspend/reactivate actions on a test organisation

#### 5.4 User Management Test

1. Navigate to: `https://yourdomain.com/admin/users`
2. Select a test organisation (if SuperAdmin) or view your org's users
3. Test creating a new user:
   - Fill in email, role, name
   - Toggle "Send invite email" option
   - Create user
4. Test role editing:
   - Change a non-admin user's role
   - Verify inline update works
5. Test validations:
   - Try to demote the Primary Admin (should fail with error message)
   - Try to deactivate the last OrgAdmin (should fail with error message)

#### 5.5 Audit Log Test

1. Navigate to: `https://yourdomain.com/admin/audit-logs`
2. Verify audit entries appear for:
   - User creations from previous test
   - Role changes from previous test
   - Organisation suspend/reactivate actions
3. Verify color coding works (created=green, updated=blue, etc.)
4. Expand a "changes" detail and verify JSON displays correctly

### Step 6: OrgAdmin Testing

#### 6.1 Login as OrgAdmin

1. Logout from SuperAdmin
2. Login as an OrgAdmin user
3. Navigate to: `https://yourdomain.com/admin`

#### 6.2 Verify Org Scoping

1. Verify you CANNOT see "Organisations" in sidebar
2. Navigate to: `https://yourdomain.com/admin/users`
3. Verify you only see users from YOUR organisation (not other orgs)
4. Navigate to: `https://yourdomain.com/admin/audit-logs`
5. Verify you only see audit logs from YOUR organisation

#### 6.3 Test User Management as OrgAdmin

1. Create a test user in your organisation
2. Change their role
3. Set yourself as Primary Admin (if you're an OrgAdmin)
4. Verify validation messages work

### Step 7: Production Validation

#### 7.1 Verify Multi-Tenancy Isolation

Run this SQL query to verify no cross-org data leaks:

```sql
-- This should return 0 rows (all audit logs should have valid orgIds)
SELECT * FROM "AuditLogs" WHERE "OrgId" IS NULL;

-- Verify each org's users only appear in their org's audit logs
SELECT
    a."OrgId",
    COUNT(*) AS AuditLogCount,
    COUNT(DISTINCT a."UserId") AS UniqueUsers
FROM "AuditLogs" a
GROUP BY a."OrgId";
```

#### 7.2 Check System Health

```bash
# Check API logs for errors
sudo journalctl -u maintainuk-api --since "10 minutes ago" | grep -i error

# Check API is responding
curl https://yourdomain.com/api/health

# Check web app loads
curl -I https://yourdomain.com/
```

## Post-Deployment Tasks

### Configure Additional SuperAdmins (Optional)

If you need additional SuperAdmins:

1. Login as existing SuperAdmin
2. Navigate to target user's organisation
3. Navigate to Users tab
4. Manually promote via SQL (SuperAdmin creation not available in UI for security):

```sql
UPDATE "Users"
SET "Role" = 'SuperAdmin'
WHERE "Email" = 'another-admin@yourdomain.com'
AND "IsActive" = true;
```

### Set Primary Admins for All Organisations

The migration automatically sets Primary Admins, but you should verify and adjust:

1. Login as SuperAdmin
2. For each organisation:
   - Navigate to organisation detail
   - Review the Primary Admin
   - If incorrect, navigate to Users and set the correct Primary Admin

### Configure Audit Log Retention (Optional)

Add a scheduled job to archive old audit logs:

```sql
-- Example: Archive logs older than 1 year
-- Run this monthly via cron
CREATE TABLE "AuditLogsArchive" (LIKE "AuditLogs" INCLUDING ALL);

INSERT INTO "AuditLogsArchive"
SELECT * FROM "AuditLogs"
WHERE "CreatedAt" < NOW() - INTERVAL '1 year';

DELETE FROM "AuditLogs"
WHERE "CreatedAt" < NOW() - INTERVAL '1 year';
```

## Rollback Procedure

If issues arise, follow this rollback process:

### Step 1: Revert Application Code

```bash
# Rollback API
cd /var/www/maintainuk-api
git reset --hard <previous-commit-hash>
dotnet publish -c Release -o ./publish
sudo systemctl restart maintainuk-api

# Rollback Web
cd /var/www/maintainuk-web
git reset --hard <previous-commit-hash>
npm install
npm run build:prod
sudo cp -r dist/maintainuk-web/* /var/www/html/
```

### Step 2: Rollback Database Migration

```bash
cd /var/www/maintainuk-api
dotnet ef database update <previous-migration-name> --connection "<your-connection-string>"
```

**OR** Manually remove the governance schema changes:

```sql
-- Remove foreign key
ALTER TABLE "Organisations"
DROP CONSTRAINT IF EXISTS "FK_Organisations_Users_PrimaryAdminUserId";

-- Drop index
DROP INDEX IF EXISTS "IX_Organisations_PrimaryAdminUserId";

-- Remove column
ALTER TABLE "Organisations"
DROP COLUMN IF EXISTS "PrimaryAdminUserId";

-- Revert SuperAdmin users
UPDATE "Users"
SET "Role" = 'OrgAdmin'
WHERE "Role" = 'SuperAdmin';
```

### Step 3: Verify Rollback

1. Login as regular OrgAdmin user
2. Verify application works as before
3. Check that no admin UI appears

## Monitoring

### Key Metrics to Monitor

1. **Failed Authorization Attempts**
   ```sql
   -- Check API logs for 403 Forbidden responses
   -- Indicates users trying to access admin features without permission
   ```

2. **Audit Log Growth**
   ```sql
   SELECT
       DATE("CreatedAt") AS LogDate,
       COUNT(*) AS EventCount
   FROM "AuditLogs"
   WHERE "CreatedAt" > NOW() - INTERVAL '7 days'
   GROUP BY DATE("CreatedAt")
   ORDER BY LogDate DESC;
   ```

3. **Primary Admin Consistency**
   ```sql
   -- Verify all organisations have valid Primary Admins
   SELECT o."Name"
   FROM "Organisations" o
   LEFT JOIN "Users" u ON u."Id" = o."PrimaryAdminUserId"
   WHERE o."PrimaryAdminUserId" IS NULL
      OR u."IsActive" = false
      OR u."Role" != 'OrgAdmin';
   ```

## Troubleshooting

### Issue: User cannot access admin UI

**Symptoms**: 403 Forbidden or redirect to dashboard

**Resolution**:
1. Verify user's role in database
2. Check JWT token includes `role` claim:
   ```bash
   # Decode JWT at https://jwt.io
   # Verify "role": "OrgAdmin" or "SuperAdmin" is present
   ```
3. Clear browser localStorage and re-login

### Issue: Organisation has no Primary Admin

**Symptoms**: Cannot deactivate last admin, validation errors

**Resolution**:
```sql
-- Set a Primary Admin manually
UPDATE "Organisations"
SET "PrimaryAdminUserId" = (
    SELECT "Id" FROM "Users"
    WHERE "OrgId" = <org-id>
    AND "Role" = 'OrgAdmin'
    AND "IsActive" = true
    ORDER BY "CreatedAt"
    LIMIT 1
)
WHERE "Id" = <org-id>;
```

### Issue: Cannot demote or deactivate user

**Symptoms**: API returns 400 with validation error

**Resolution**:
- This is expected behavior for Primary Admin or last OrgAdmin
- Reassign Primary Admin first, or promote another user to OrgAdmin
- Validation is working correctly

### Issue: Audit logs not appearing

**Symptoms**: Empty audit log list

**Resolution**:
1. Check database for audit entries:
   ```sql
   SELECT * FROM "AuditLogs" ORDER BY "CreatedAt" DESC LIMIT 10;
   ```
2. If logs exist but UI shows none, verify org scoping:
   - OrgAdmin users: check `orgId` filter is applied correctly
   - SuperAdmin users: check query bypasses filter

## Support

For issues during deployment:

1. Check API logs: `sudo journalctl -u maintainuk-api -n 100`
2. Check database connectivity
3. Review Swagger docs: `https://yourdomain.com/swagger`
4. Contact: platform-admin@yourdomain.com

## Appendix: SQL Reference

### Useful Queries

**List all SuperAdmins:**
```sql
SELECT "Id", "Email", "FirstName", "LastName"
FROM "Users"
WHERE "Role" = 'SuperAdmin';
```

**Count users by role per organisation:**
```sql
SELECT
    o."Name" AS Organisation,
    u."Role",
    COUNT(*) AS UserCount
FROM "Organisations" o
JOIN "Users" u ON u."OrgId" = o."Id"
WHERE u."IsActive" = true
GROUP BY o."Id", o."Name", u."Role"
ORDER BY o."Name", u."Role";
```

**Recent audit activity:**
```sql
SELECT
    a."Action",
    u."Email" AS PerformedBy,
    a."EntityType",
    a."CreatedAt"
FROM "AuditLogs" a
JOIN "Users" u ON u."Id" = a."UserId"
ORDER BY a."CreatedAt" DESC
LIMIT 20;
```

**Organisations without Primary Admin:**
```sql
SELECT o."Id", o."Name"
FROM "Organisations" o
WHERE o."PrimaryAdminUserId" IS NULL;
```
