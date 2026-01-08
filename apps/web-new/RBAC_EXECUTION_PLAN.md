# Web-New RBAC & Admin System – Step-by-Step Implementation Plan

This plan turns the ROLE/RBAC + admin spec into small, testable steps.
Each step includes **what to implement** and **how to test it** (unit / integration / e2e).

> Scope: `apps/api` (.NET 8 API, Postgres) and `apps/web-new` (Angular, standalone, signals, Material).

---

## Phase 1 – Domain & Data Model Alignment (Backend)

### Step 1.1 – Inventory & gap analysis (no code)

- **Implement**
  - Review existing `MaintainUkDbContext` entities and migrations (`Organisations`, `Users`, `AuditLogs`, `SubscriptionPlans`, `FeatureFlags`, etc.).
  - Map them against the spec tables: `organisations`, `users`, `organisation_users`, `roles`, `user_roles`, `organisation_settings`, `platform_settings`, `audit_log`.
  - Document mismatches and reuse opportunities in `/docs/ASSUMPTIONS.md` (e.g. “existing `Organisation` already has status + plan; we will add `organisation_settings` and `platform_settings` as separate entities”).
- **Test**
  - `cd apps/api && dotnet test` (baseline – ensure we start green).

### Step 1.2 – Introduce role & membership tables (non-breaking)

- **Implement**
  - Add EF Core entities + migrations for:
    - `Role` (id, description).
    - `UserRole` (userId, roleId, organisationId?).
    - `OrganisationUser` (organisationId, userId).
  - Configure relationships and required indexes:
    - PKs as per spec.
    - Indexes on `OrganisationUsers(OrganisationId)`, `UserRoles(OrganisationId)`.
- **Test**
  - `cd apps/api && dotnet ef migrations add AddRbacCore && dotnet ef database update` (against dev DB).
  - `dotnet test` – verify existing tests still pass.
  - Manual DB check (psql) to ensure tables and indexes exist.

### Step 1.3 – Add organisation & platform settings tables

- **Implement**
  - Add `OrganisationSettings` and `PlatformSettings` entities and migrations:
    - `OrganisationSettings(OrganisationId PK/FK, ApprovalThresholdGbp, AllowedChannels jsonb, UpdatedAt)`.
    - `PlatformSettings(Id PK, MaxApprovalThresholdGbp, channel_* flags, AiEnabled, UpdatedAt)`.
  - Seed a single `PlatformSettings` row with `Id = 1` in a migration or via a dedicated seeder.
- **Test**
  - `dotnet ef migrations add AddPlatformAndOrgSettings && dotnet ef database update`.
  - `dotnet test`.
  - psql: verify row exists in `PlatformSettings` with sensible defaults.

### Step 1.4 – Align / extend AuditLog

- **Implement**
  - Confirm existing `AuditLog` entity matches spec; extend with fields if needed:
    - `ActorRole`, `OrganisationId` (nullable), `Action`, `EntityType`, `EntityId`, `Meta` (jsonb).
  - Add migration for any new columns + index on `(OrganisationId, CreatedAt DESC)`.
- **Test**
  - `dotnet ef migrations add ExtendAuditLogForRbac && dotnet ef database update`.
  - Unit test `AuditLogService` to assert it writes `ActorUserId`, `ActorRole`, `OrganisationId`, `Action`, `EntityType`, `Meta` correctly.

---

## Phase 2 – CurrentUser & Org Scoping (Backend)

### Step 2.1 – Define `ICurrentUser` abstraction

- **Implement**
  - Create `Application/Auth/ICurrentUser.cs` and `CurrentUser.cs`:
    - Properties: `UserId`, `Email`, `IsSuperAdmin`, `OrganisationId`, `Roles: IReadOnlyList<UserRoleEntry>`.
  - Implement `CurrentUserAccessor` that:
    - Reads from `HttpContext.User` claims (user id, email, roles, orgId, impersonation flags).
    - Maps claims to `CurrentUser`.
  - Register as scoped service in `Program.cs`.
- **Test**
  - Unit tests:
    - Given different combinations of claims (SuperAdmin with no org, OrgAdmin with orgId, multiple roles) ensure `CurrentUser` is populated correctly.
  - Integration (if test host exists):
    - Fake `ClaimsPrincipal` and assert resolved `ICurrentUser` view.

### Step 2.2 – Implement org-scoping helpers

- **Implement**
  - Create `Infrastructure/Extensions/AuthorizationExtensions.cs` with:
    - `RequireOrgId(Guid? orgId)` – throws if null.
    - `EnsureOrgAccess(ICurrentUser user, Guid orgId)` – allows if `user.IsSuperAdmin` or has a role with that `OrganisationId`.
    - `EnsureSuperAdmin(ICurrentUser user)` – throws/returns 403 if not SuperAdmin.
  - Refactor key services (`OrganisationService`, `UserManagementService`, etc.) to accept `ICurrentUser` or take an `orgId` validated via these helpers.
- **Test**
  - Unit tests for `AuthorizationExtensions`:
    - OrgAdmin with correct `OrganisationId` passes; other org fails.
    - SuperAdmin always passes.
  - Update existing service tests to assert `EnsureOrgAccess` is invoked (e.g. expect thrown exception when called with foreign orgId).

### Step 2.3 – HTTP filters for org scoping

- **Implement**
  - Create an endpoint filter or action filter, e.g. `OrgScopedFilter`, that:
    - Looks for `orgId` (or `organisationId`) in route/data.
    - Calls `EnsureOrgAccess(currentUser, orgId)` before letting the handler run.
  - Apply this filter to all `/api/orgs/{orgId}/**` style endpoints and any admin endpoints that operate on specific orgs.
- **Test**
  - Unit tests for the filter (using a fake `EndpointFilterInvocationContext`).
  - Integration tests:
    - Call an org-scoped endpoint as:
      - OrgAdmin of same org → 200.
      - OrgAdmin of different org → 403.
      - SuperAdmin → 200.

---

## Phase 3 – Authorization Policies & RBAC Rules (Backend)

### Step 3.1 – Define policies

- **Implement**
  - In `Program.cs` configure policies:
    - `SuperAdminOnly` → `currentUser.IsSuperAdmin`.
    - `OrgAdminOnly` → `currentUser.Roles` contains `OrgAdmin` for current org context.
    - `OrgScoped` → any role with the route `orgId` or SuperAdmin.
  - Replace inline role checks in endpoints with `.RequireAuthorization("SuperAdminOnly")` or `"OrgAdminOnly"` where appropriate.
- **Test**
  - Unit tests against policy handlers:
    - SuperAdmin passes `SuperAdminOnly`.
    - OrgAdmin passes `OrgAdminOnly` for its org and fails for others.

### 3.2 – Wire policies to endpoints

- **Implement**
  - SuperAdmin endpoints:
    - `/api/super-admin/**` → `.RequireAuthorization("SuperAdminOnly")`.
  - OrgAdmin endpoints:
    - `/api/orgs/{orgId}/**` → `.RequireAuthorization("OrgAdminOnly")` AND `OrgScoped` filter.
- **Test**
  - Integration tests (or minimal WebApplicationFactory tests):
    - Authenticated but non‑SuperAdmin hitting `/api/super-admin/organisations` → 403.
    - OrgAdmin hitting `/api/orgs/{differentOrg}/users` → 403.

---

## Phase 4 – Audit Logging (Backend)

### Step 4.1 – Central audit logger

- **Implement**
  - Create `Application/Services/IAuditLogger` and `AuditLogger`:
    - Methods like `Task LogAsync(string action, string entityType, string entityId, object? meta = null, Guid? orgId = null)`.
    - Internally reads `ICurrentUser` and writes `AuditLog` with actor, role, org, meta, correlation id.
  - Register in DI.
- **Test**
  - Unit tests:
    - When `ICurrentUser` is SuperAdmin vs OrgAdmin, ensure `ActorRole` and `OrganisationId` are set appropriately.
  - Integration test:
    - Call a simple test endpoint that uses `IAuditLogger` and assert row exists in DB.

### Step 4.2 – Wire audit into admin endpoints

- **Implement**
  - For every **write** endpoint:
    - SuperAdmin: `ORG_CREATE`, `ORG_SUSPEND`, `ORG_DELETE`, `PLATFORM_SETTINGS_UPDATE`, `IMPERSONATE_START`, etc.
    - OrgAdmin: `ORG_USER_CREATE`, `ORG_USER_DISABLE`, `ORG_SETTINGS_UPDATE`.
  - Replace ad‑hoc logging in `OrganisationService`, `UserManagementService`, etc. with calls to `IAuditLogger`.
- **Test**
  - Unit tests for each service method:
    - Verify `IAuditLogger.LogAsync` is invoked with correct `action` and `entityType`.
  - Integration tests:
    - Hit representative endpoints and query `audit_log` for expected `action` values.

---

## Phase 5 – Admin & Org APIs (Backend)

### Step 5.1 – SuperAdmin organisation endpoints

- **Implement**
  - Implement or align endpoints with spec:
    - `GET /api/super-admin/organisations` → project from existing `Organisation` + roles.
    - `POST /api/super-admin/organisations` → wrap existing create‑org+OrgAdmin logic under new route (or alias to `/api/v1/admin/organisations` if consistent).
    - `POST /api/super-admin/organisations/{id}/suspend` → call `OrganisationService.SuspendOrganisationAsync`.
    - `DELETE /api/super-admin/organisations/{id}` → mark org as deleted/archived or soft-delete (document decision).
  - All endpoints use:
    - `SuperAdminOnly` policy.
    - `IAuditLogger` with actions `ORG_CREATE`, `ORG_SUSPEND`, `ORG_DELETE`.
- **Test**
  - Unit tests on `OrganisationService` + mapping layer.
  - Integration tests for each endpoint:
    - Success for SuperAdmin.
    - 403 for non‑SuperAdmin.

### Step 5.2 – Platform settings API

- **Implement**
  - `GET /api/super-admin/platform-settings` → return current `PlatformSettings`.
  - `PATCH /api/super-admin/platform-settings` → update channels, AI flag, and `MaxApprovalThresholdGbp`.
  - Enforce that there is only ever ID = 1 row.
  - Log `PLATFORM_SETTINGS_UPDATE` via `IAuditLogger`.
- **Test**
  - Unit tests for settings service validating patches and clamping values as needed.
  - Integration tests:
    - SuperAdmin can read+update.
    - Non‑SuperAdmin receives 403.

### Step 5.3 – OrgAdmin user + settings endpoints

- **Implement**
  - Under `/api/orgs/{orgId}`:
    - `GET /users` → list org users with roles.
    - `POST /users` → create/invite user (reuse existing logic).
    - `PATCH /users/{userId}/disable` → mark as disabled.
    - `PUT /settings` → upsert `OrganisationSettings` enforcing:
      - `approval_threshold_gbp <= platform_settings.max_approval_threshold_gbp`.
      - `allowed_channels` subset of enabled platform channels.
  - All endpoints guarded by:
    - `OrgAdminOnly` + `OrgScoped` filter.
  - Audit:
    - `ORG_USER_CREATE`, `ORG_USER_DISABLE`, `ORG_SETTINGS_UPDATE`.
- **Test**
  - Unit tests:
    - Threshold validation rejects values over platform max.
    - Allowed channels validator rejects channels disabled at platform level.
  - Integration:
    - OrgAdmin in org A can CRUD users/settings for org A.
    - OrgAdmin from org B gets 403 on org A.

### Step 5.3b – Initial OrgAdmin via "first user in org" (Option 2, non-breaking)

- **Implement**
  - Keep `POST /api/super-admin/organisations` (and existing `/api/v1/admin/organisations`) using the simple `{ name, plan }` contract so existing clients are not broken.
  - In the **user creation path**:
    - In `AuthService.RegisterAsync` (self‑service signup): when a new organisation is created here, the registering user is created as `OrgAdmin` and can be set as `PrimaryAdminUserId` if the organisation has no primary admin yet.
    - In `UserManagementService.CreateUserAsync` (SuperAdmin/OrgAdmin‑driven creation): after creating a user for a given `orgId`, check `!_context.Users.Any(u => u.OrgId == orgId && u.Id != newUser.Id)`:
      - If this is the **first user for that organisation**, automatically:
        - assign the `OrgAdmin` role (if not already assigned),
        - set `Organisation.PrimaryAdminUserId = newUser.Id` if it is currently null.
  - Always write audit entries for these automatic promotions, e.g. `ORG_USER_PROMOTED_TO_ADMIN`, and include meta noting that this was “first user promotion” to distinguish from manual role changes.
- **Test**
  - Unit tests:
    - For `AuthService.RegisterAsync`:
      - New org + first user → user role is `OrgAdmin` and `PrimaryAdminUserId` is set, audit written.
    - For `UserManagementService.CreateUserAsync`:
      - Creating the **first** user in an org auto‑promotes them to OrgAdmin and sets `PrimaryAdminUserId`.
      - Creating additional users in the same org does **not** change `PrimaryAdminUserId` automatically.
  - Integration tests:
    - Self‑service register flow produces an organisation whose first user is OrgAdmin and primary admin.
    - SuperAdmin creates org (no admin), then creates first user for that org via admin users API – user becomes OrgAdmin + primary admin, and subsequent users do not overwrite that automatically.

### Step 5.4 – Impersonation endpoint

- **Implement**
  - `POST /api/super-admin/impersonate/{orgId}/{userId}`:
    - Validate SuperAdmin and that `userId` belongs to `orgId`.
    - Generate an impersonation token/session (e.g. JWT with special claim or opaque token) and return it.
    - Write `IMPERSONATE_START` audit entry with meta (target org/user).
  - Add counterpart to end impersonation on client (handled mostly on FE, but log `IMPERSONATE_END` on explicit stop if desired).
- **Test**
  - Unit tests for impersonation service:
    - Non‑SuperAdmin cannot impersonate.
    - Cannot impersonate users from other orgs if constraints require.
  - Integration:
    - Call endpoint as SuperAdmin → get token.
    - Use token in subsequent calls to org endpoints and verify effective org/user context.

---

## Phase 6 – Angular Routing, Guards & Auth State (Frontend)

### Step 6.1 – Auth state & roles in `apps/web-new`

- **Implement**
  - Extend `AuthService` in `web-new` (already partially done):
    - Track roles and organisations (SuperAdmin vs OrgAdmin) from API auth payload.
    - Add optional impersonation context (`impersonatedOrgId`, `impersonatedUserId`, banner text).
  - Keep everything in **signals** (`role`, `isSuperAdmin`, `isOrgAdmin`, `currentOrgContext()`).
- **Test**
  - Unit tests:
    - Auth responses with multiple roles produce correct signals.
    - Impersonation setters/getters work and are persisted (localStorage).

### Step 6.2 – Routing for SuperAdmin and OrgAdmin areas

- **Implement**
  - In `app.routes.ts` (already structured):
    - Ensure:
      - `/superadmin/**` guarded by `areaGuard('superadmin')` + `authGuard`.
      - `/admin/**` (OrgAdmin console) guarded by `areaGuard('admin')` + `authGuard`.
  - Add `/superadmin/audit`, `/superadmin/settings`, `/org-admin/settings` routes as needed.
- **Test**
  - Unit: existing `area.guard.spec.ts`, `auth.guard.spec.ts`, `role.guard.spec.ts` (now fixed) cover expected flows.
  - E2E:
    - `navigation-visibility.spec.ts` / `role-based-routing.spec.ts` – ensure SuperAdmin sees SuperAdmin nav and can move between areas; OrgAdmin is limited to admin/app areas.

---

## Phase 7 – Angular Admin Consoles (Frontend)

### Step 7.1 – SuperAdmin organisations console

- **Implement**
  - Use existing `superadmin` + `OrganisationListComponent` in `web-new`:
    - Ensure it calls the **new** `/api/super-admin/organisations` where appropriate (or `/api/v1/admin/organisations` if that remains canonical).
    - Wire Create Org dialog to the updated backend (with admin fields).
    - Suspend/delete buttons triggering the new SuperAdmin endpoints.
- **Test**
  - Unit tests:
    - `OrganisationService` calls correct URLs.
    - Create Org dialog calls service with full DTO (including admin fields).
  - E2E:
    - `superadmin-organisations.spec.ts` (already largely green) validating:
      - list, create, view, suspend/reactivate flows.

### Step 7.2 – SuperAdmin audit + settings UI

- **Implement**
  - Audit page:
    - Table with filters (`from`, `to`, `orgId`) calling `/api/super-admin/audit`.
    - Paged or infinite-scroll (basic version ok).
  - Settings page:
    - Form bound to `PlatformSettingsService`:
      - toggles for email/sms/whatsapp, AI.
      - `maxApprovalThresholdGbp` numeric input.
    - Respect validation feedback from backend.
- **Test**
  - Unit tests:
    - Settings component reacts to service errors and disables save appropriately.
  - E2E:
    - `superadmin-settings.spec.ts` – toggles flags and persists values across reloads (where backend support exists).

### Step 7.3 – OrgAdmin users + settings console

- **Implement**
  - Users page:
    - Adapt existing `UserListComponent` in `web-new` to call `/api/orgs/{orgId}/users`.
    - Create user dialog using invite vs direct password pattern.
    - Disable user toggle.
  - Settings page:
    - Form for `approval_threshold_gbp` and `allowed_channels` (checkboxes) with hints about platform max and enabled channels.
- **Test**
  - Unit tests:
    - Users component/service mapping and error handling.
    - Settings component ensures value is clamped and invalid channel choices are rejected.
  - E2E:
    - `orgadmin-users.spec.ts` – create, disable, and see role changes.
    - `orgadmin-settings.spec.ts` – threshold validation and allowed channels behaviour.

---

## Phase 8 – Impersonation UX (Frontend)

### Step 8.1 – SuperAdmin impersonation banner + switcher

- **Implement**
  - Add an organisation/user switcher + “Impersonate” action in SuperAdmin area:
    - Calls `/api/super-admin/impersonate/{orgId}/{userId}`.
    - Stores returned token + context in `AuthService`.
  - Show a banner across admin/app areas when impersonating, with “Stop impersonating” button that:
    - Clears impersonation context and restores original SuperAdmin token/session.
- **Test**
  - Unit tests:
    - Impersonation service properly swaps tokens and updates context.
  - E2E:
    - `superadmin-impersonation.spec.ts` – as SuperAdmin, impersonate an OrgAdmin and operate in org context, then stop impersonating and return to SuperAdmin context.

---

## Phase 9 – Docs & Final QA

### Step 9.1 – Documentation

- **Implement**
  - Update:
    - `/docs/README.md` – high-level overview, how to run BE/FE, how RBAC works.
    - `/docs/ASSUMPTIONS.md` – any deviations from the exact spec and rationale.
    - `/docs/RBAC.md` – roles, permissions matrix, org scoping rules, impersonation semantics.
    - `/docs/API.md` – endpoints table with auth requirements and sample requests/responses.
- **Test**
  - Manual:
    - Follow docs from a clean checkout to:
      - run migrations,
      - seed SuperAdmin + sample org + OrgAdmin,
      - start API and `web-new`,
      - log in as `julianshaw2000@gmail.com / Gl@ria100` and exercise SuperAdmin + OrgAdmin flows.

### Step 9.2 – Full regression test

- **Implement/Test**
  - Backend:
    - `cd apps/api && dotnet test`.
  - Frontend:
    - `cd apps/web-new && npm test`.
    - `cd apps/web-new && npm run e2e` (or focused suites: auth/guards, superadmin, orgadmin).
  - Fix any regressions discovered and update this plan file with notes if scope changes.


