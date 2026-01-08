# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

MaintainUK is a UK property maintenance SaaS platform with multi-tenant architecture. The system manages property maintenance tickets from issue reporting through resolution, with AI-powered assistance and multi-channel communication (Portal, Email, SMS, WhatsApp).

## Development Commands

### Quick Start
```bash
# Start infrastructure (Redis, MinIO - Postgres uses Neon cloud)
docker-compose up -d

# API (terminal 1)
cd apps/api && dotnet restore && dotnet ef database update && dotnet run --seed

# Web (terminal 2)
cd apps/web && npm install && npm start

# Jobs (terminal 3)
cd apps/jobs && npm install && npm run dev
```

### Testing
```bash
# .NET API tests
cd apps/api && dotnet test
cd apps/api && dotnet test --filter "FullyQualifiedName~TicketServiceTests"  # single test class

# Angular unit tests
cd apps/web && npm test                                        # watch mode
cd apps/web && npm run test:ci                                 # CI mode (headless)

# Angular E2E tests (Playwright)
cd apps/web && npm run e2e                                     # headless mode
cd apps/web && npm run e2e:ui                                  # UI mode (recommended)
cd apps/web && npm run e2e:headed                              # headed mode (see browser)
cd apps/web && npm run e2e:debug                               # debug mode
cd apps/web && npx playwright test superadmin-auth             # run specific test file

# Node jobs tests
cd apps/jobs && npm test
cd apps/jobs && npm test -- --testPathPattern=email            # single file
```

### Test Coverage
```bash
# .NET API coverage (outputs to apps/api/Tests/*/TestResults/)
cd apps/api && dotnet test --collect:"XPlat Code Coverage"

# Angular coverage (outputs to apps/web/coverage/)
cd apps/web && npm run test:coverage

# Node jobs coverage (outputs to apps/jobs/coverage/)
cd apps/jobs && npm run test:coverage
```

### Database Migrations
```bash
cd apps/api
dotnet ef migrations add MigrationName
dotnet ef database update
```

### Linting
```bash
cd apps/web && npm run lint
cd apps/jobs && npm run lint
```

## Architecture

### Project Structure
- **apps/api** - .NET 8 Web API with Clean Architecture layers:
  - `Domain/` - Entities, value objects, enums
  - `Application/` - Use cases, services
  - `Contracts/` - DTOs, requests, responses
  - `Infrastructure/` - EF Core, external integrations (Persistence, Security, Services)
- **apps/web** - Angular 18 SPA with standalone components and signals
  - `core/` - Auth, guards, interceptors
  - `features/` - Domain feature modules
- **apps/jobs** - Node.js BullMQ worker service for background processing
- **packages/shared** - Shared TypeScript types and Zod schemas

### Data Flow
API uses Repository + Unit of Work patterns. Never inject DbContext directly into controllers or services. Repositories return materialized results (DTOs or IEnumerable), not IQueryable.

### Test Projects
- **apps/api/Tests/MaintainUk.Api.Tests** - xUnit tests with FluentAssertions, Moq, EF Core InMemory
  - `Domain/Entities/` - Entity unit tests
  - `Application/Services/` - Service tests with in-memory database
- **apps/web/src/** - Jasmine/Karma unit tests (*.spec.ts files co-located with source)
  - Component tests use `TestBed` with spy services
  - Mock signals with `signal()` in spy property bags
- **apps/web/e2e/** - Playwright E2E tests for admin features
  - `superadmin-auth.spec.ts` - Authentication and navigation tests
  - `superadmin-organisations.spec.ts` - Organisation CRUD operations
  - `superadmin-organisation-details.spec.ts` - Organisation detail page tests
  - `superadmin-audit-logs.spec.ts` - Audit log viewing tests
  - `superadmin-rbac.spec.ts` - Role-based access control tests
  - `helpers/auth.helper.ts` - Reusable authentication helpers
- **apps/jobs/src/** - Jest tests (*.test.ts files co-located with source)
  - Mock logger and external dependencies with `jest.mock()`
  - Processor tests use mock `Job` objects

## Multi-Tenant SaaS Governance

### User Roles & Permissions

The platform implements role-based access control with the following hierarchy:

1. **SuperAdmin** - Platform administrator with cross-organisation access
   - Can view and manage all organisations
   - Can create new organisations and assign initial OrgAdmins
   - Can suspend/reactivate organisations
   - Bypasses multi-tenant query filters (sees all data)
   - Access admin UI at `/admin`

2. **OrgAdmin** - Organisation administrator
   - Can manage users within their organisation
   - Can create/invite new users
   - Can change user roles
   - Can deactivate users (with validation)
   - Can set the Primary Admin for their organisation
   - Access admin UI at `/admin` (org-scoped views only)

3. **Coordinator** - Day-to-day operational manager
   - Can manage tickets, work orders, quotes, invoices
   - Cannot access user management

4. **Viewer** - Read-only access
   - Can view data but not modify

5. **Contractor** - External contractor access
   - Can view assigned work orders and update status

6. **Tenant** - Property tenant access
   - Can create tickets for their properties
   - Can view ticket status

### Authorization Implementation

#### Backend (API)

**Authorization Policies** (`apps/api/Program.cs`):
```csharp
builder.Services.AddAuthorization(options =>
{
    options.AddPolicy("RequireSuperAdmin", policy =>
        policy.RequireClaim("role", UserRole.SuperAdmin.ToString()));

    options.AddPolicy("RequireOrgAdmin", policy =>
        policy.RequireAssertion(context =>
        {
            var role = context.User.FindFirst("role")?.Value;
            return role == UserRole.SuperAdmin.ToString() ||
                   role == UserRole.OrgAdmin.ToString();
        }));
});
```

**Multi-Tenant Query Filtering** (`apps/api/Infrastructure/Persistence/MaintainUkDbContext.cs`):
- All entities except `User` and `Organisation` are automatically filtered by `OrgId`
- SuperAdmin users bypass the filter (returns `Guid.Empty` which disables the filter)
- Use `.IgnoreQueryFilters()` explicitly for cross-org queries in admin services

**JWT Claims**:
- `userId`: User GUID
- `orgId`: Organisation GUID
- `email`: User email
- `role`: UserRole enum value (included in JWT for client-side role checks)

#### Frontend (Angular)

**Role Guard** (`apps/web/src/app/core/guards/role.guard.ts`):
```typescript
roleGuard(['SuperAdmin', 'OrgAdmin']) // Parameterized guard
```

**AuthService** (`apps/web/src/app/core/services/auth.service.ts`):
- Tracks role in signal: `role = signal<string | null>(null)`
- Computed properties: `isSuperAdmin()`, `isOrgAdmin()`
- Role persisted to localStorage alongside JWT

**Admin Routes** (`apps/web/src/app/app.routes.ts`):
```typescript
{
  path: 'admin',
  canActivate: [roleGuard(['SuperAdmin', 'OrgAdmin'])],
  children: [
    { path: 'organisations', canActivate: [roleGuard(['SuperAdmin'])] },
    { path: 'users', ... },
    { path: 'audit-logs', ... }
  ]
}
```

### Critical Business Rules

The following validations prevent orphaned organisations and ensure admin continuity:

#### Primary Admin Protection
- **Cannot demote Primary Admin** - Must reassign Primary Admin first
- **Cannot deactivate Primary Admin** - Must reassign Primary Admin first
- **Primary Admin must be OrgAdmin role** - Enforced when setting Primary Admin
- **Primary Admin must be active** - Cannot assign inactive user

Implemented in: `UserManagementService.UpdateUserRoleAsync()`, `UserManagementService.DeactivateUserAsync()`

#### Last Admin Protection
- **Cannot demote last OrgAdmin** - Prevents organisation lockout
- **Cannot deactivate last OrgAdmin** - Prevents organisation lockout

Implemented in: `UserManagementService.UpdateUserRoleAsync()`, `UserManagementService.DeactivateUserAsync()`

#### OrgAdmin Restrictions
- **OrgAdmin cannot create SuperAdmin users** - Only SuperAdmin can create SuperAdmin users

Implemented in: `UserManagementService.CreateUserAsync()`

### Admin API Endpoints

All admin endpoints are under `/api/v1/admin/` and require authentication + appropriate role.

#### Organisation Management (SuperAdmin only)
- `GET /api/v1/admin/organisations` - List all organisations
- `GET /api/v1/admin/organisations/{id}` - Get organisation details with users
- `POST /api/v1/admin/organisations` - Create new organisation
- `POST /api/v1/admin/organisations/{id}/suspend` - Suspend organisation
- `POST /api/v1/admin/organisations/{id}/reactivate` - Reactivate organisation

#### User Management (OrgAdmin+)
- `GET /api/v1/admin/users?orgId={orgId}` - List users (optional orgId for SuperAdmin)
- `POST /api/v1/admin/users` - Create/invite user
- `PATCH /api/v1/admin/users/{id}/role` - Update user role
- `POST /api/v1/admin/users/{id}/deactivate` - Deactivate user
- `POST /api/v1/admin/organisations/{orgId}/primary-admin` - Set primary admin

#### Audit Logs (OrgAdmin+)
- `GET /api/v1/admin/audit-logs?orgId={orgId}` - List audit logs (optional orgId for SuperAdmin)

### Audit Logging

All governance actions are automatically logged to the `audit_logs` table with:
- **Organisation ID** - Which org the action affected
- **User ID** - Who performed the action
- **Action** - Event type (e.g., `user.created`, `organisation.suspended`, `user.role_changed`)
- **Entity Type** - What was changed (e.g., `User`, `Organisation`)
- **Entity ID** - ID of the affected entity
- **Changes Summary JSON** - Before/after values
- **IP Address** - Request IP
- **User Agent** - Request user agent
- **Timestamp** - When the action occurred

**Logged Events**:
- `organisation.created`, `organisation.suspended`, `organisation.reactivated`
- `organisation.primary_admin_changed`
- `user.created`, `user.invited`, `user.role_changed`, `user.deactivated`

Implemented in: `AuditLogService.LogAsync()`

### Admin UI Components

**SuperAdmin Features** (`/admin/organisations`):
- List all organisations with status, plan, user count
- Create new organisations
- View organisation details with full user list
- Suspend/reactivate organisations

**OrgAdmin Features** (`/admin/users`):
- List users in their organisation
- Create users with password or invite email
- Inline role editing via dropdown
- Set Primary Admin for eligible users (OrgAdmin role + active)
- Deactivate users (with validation feedback)

**Audit Logs** (`/admin/audit-logs`):
- View all governance actions
- Color-coded action chips (created=green, updated=blue, deleted=red, invited=orange)
- Expandable JSON changes viewer
- SuperAdmin sees all orgs, OrgAdmin sees only their org

### Production Deployment

#### Step 1: Create First SuperAdmin

After initial deployment, promote an existing user to SuperAdmin via SQL:

```sql
UPDATE "Users"
SET "Role" = 'SuperAdmin'
WHERE "Email" = 'platform-admin@yourdomain.com';
```

#### Step 2: Run Migrations

```bash
cd apps/api
dotnet ef database update
```

The `AddGovernanceSupport` migration:
- Adds `PrimaryAdminUserId` column to `Organisations` table
- Creates foreign key relationship with automatic backfill
- Backfills existing organisations by setting the first OrgAdmin as Primary Admin

#### Step 3: Verify Setup

1. Login as SuperAdmin
2. Navigate to `/admin/organisations`
3. Verify all organisations have Primary Admins assigned
4. Create a test organisation to validate end-to-end flow

### Development Workflow

**Creating a SuperAdmin locally**:
```sql
-- Using the default demo account
UPDATE "Users"
SET "Role" = 'SuperAdmin'
WHERE "Email" = 'admin@demo.maintainuk.com';
```

**Testing admin features**:
1. Login as SuperAdmin: `admin@demo.maintainuk.com` / `Demo123!`
2. Navigate to http://localhost:4200/admin
3. Test organisation and user management workflows

## Code Conventions

### C# (.NET API)
- Fluent API only for EF Core configuration (no Data Annotations)
- All EF calls must be async (`ToListAsync`, `FirstOrDefaultAsync`, etc.)
- Use `.AsNoTracking()` for read-only queries
- Use `.Select()` projection to DTOs instead of fetching full entities
- FluentValidation for request validation
- Custom specific exceptions (not generic `Exception`)
- Allman-style braces (new line), 4-space indentation
- Test naming: `Method_Scenario_ExpectedResult`

### Angular (Web)
- Standalone components only (no NgModules)
- Use `httpResource` for data fetching, not HttpClient directly
- Use Signal Forms (`form()`, `field()`) for new forms, not Reactive Forms
- Use `input()` function, not `@Input()` decorator
- Component state via `signal()`, shared state via NgRx SignalStore
- Kebab-case file naming, co-located .ts/.html/.scss files

### TypeScript (Jobs)
- Zod for schema validation
- BullMQ processors in `src/processors/`
- Scheduled jobs in `src/schedulers/`

## Commit Convention

Use Conventional Commits:
```
feat(tickets): add AI triage capability
fix(auth): resolve token refresh race condition
refactor(messaging): extract channel logic
test(tickets): add timeline event tests
```

## Default Dev Credentials

- Email: `admin@demo.maintainuk.com`
- Password: `Demo123!`

## URLs

- Web: http://localhost:4200
- API: http://localhost:5000
- Swagger: http://localhost:5000/swagger
- MinIO Console: http://localhost:9001
