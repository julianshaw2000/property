# Web-New Admin & Role-Based Routing Plan

## Overview

This plan describes the work required in `apps/web-new` to implement robust role-based routing, admin flows, and SuperAdmin capabilities against the existing `apps/api` backend.

---

## 1. Toolbar shows logged-in person’s name

- Extend `AuthService` to expose a signal-backed `currentUser` object (id, email, firstName, lastName, role).
- Map the login response from `/api/v1/auth/login` into `currentUser` and persist to storage.
- Update the main layout toolbar in `web-new` to bind the account label to `currentUser.firstName + ' ' + currentUser.lastName`, falling back to email when names are missing.

## 2. Login / Logout button toggle

- Replace the hard-coded logout action in the toolbar with a single button whose label and behaviour depend on auth state:
  - When `isAuthenticated()` is `false`, show **Login** and navigate to `/auth/login`.
  - When `true`, show **Logout**, call `authService.logout()`, and navigate to `/auth/login`.
- Back this with a signal in `AuthService` so templates can use `@if (authService.isAuthenticated())` cleanly.

## 3. 30-minute session expiry

- Store the JWT and `expiresAt` timestamp (in seconds) in `AuthService` and `localStorage`.
- Implement an HTTP interceptor that:
  - Attaches `Authorization: Bearer <token>` for authenticated requests while the token is valid.
  - On expired tokens (now > `expiresAt`), clears auth state, redirects to `/auth/login`, and optionally shows a “session expired” notification.
- Optionally add a small timer in `AuthService` to automatically log out a few seconds after expiry even without HTTP traffic.

## 5. User Management – fix Create User

- Review the User Management feature in `web-new`:
  - Ensure the Reactive Form has all required controls and validators matching the backend DTO for `/api/v1/admin/users`.
  - Fix `formControlName` bindings and role dropdown options to align with `UserRole` (Viewer, Coordinator, OrgAdmin, SuperAdmin, Contractor, Tenant).
  - Ensure the service payload matches the API contract (organisation scoping, role, optional direct-password vs invite-flow).
- Add error handling:
  - Display backend validation errors (e.g. duplicate email) via a snackbar and inline messages.
  - Disable the Create button while submitting and re-enable on error.
- Add a focused unit test for the Create User component to verify a valid form triggers the service with the expected payload.

## 6. Administration – fix Audit Logs

- Wire the Audit Logs page to `/api/v1/admin/audit-logs` with query parameters for paging.
- Bind the table columns to real data:
  - Timestamp
  - User (email/name)
  - Action
  - Entity Type
  - Changes (summary JSON)
  - IP Address
- Implement:
  - Loading state and error state when the HTTP call fails.
  - A clear “No audit logs yet” empty state.
  - Optional search/filter field only if wired to server or client-side filtering; otherwise remove dead controls from the UI.

## 7. Platform Administration dashboard

- Introduce a `PlatformDashboardService` that aggregates metrics for the Platform Admin dashboard:
  - Total organisations, users, tickets.
  - Basic breakdowns (e.g. organisations by plan, tickets by status).
- Implement dashboard cards and charts that:
  - Use observables + `async` pipe from `PlatformDashboardService`.
  - Show skeleton or spinner while loading, and fail gracefully with an error message.
- Replace any hard-coded or dummy dashboard values with real metrics.

## 8. Organisation Management – “Failed to load Organisation”

- Identify the Organisation detail view in `web-new` and:
  - Fix routing so the component receives the correct organisation ID (string/Guid) from the route.
  - Ensure the service calls `/api/v1/admin/organisations/:id` with the correct ID and handles 404/500 responses gracefully.
- Update UI to:
  - Show a friendly error message instead of a generic failure if the organisation cannot be loaded.
  - Keep the rest of the page responsive (e.g. back navigation).

## 9. Create Organisation flow

- Audit the Create Organisation dialog/component:
  - Confirm the form maps to the backend shape (name, plan enum or slug, optional billing email/notes).
  - Ensure the submit handler calls `POST /api/v1/admin/organisations` and handles the response correctly.
- On success:
  - Show a success snackbar.
  - Close the dialog and refresh or append to the organisations list.
- On failure:
  - Show a clear error message (e.g. validation vs server error).
  - Keep the dialog open and let the user correct fields.

## 10. Usage Analytics

- Define a minimal, realistic set of analytics for the first iteration:
  - Tickets by status over a recent time range.
  - Work orders or quotes/invoices by month.
  - Organisations by plan.
- Implement a `UsageAnalyticsService` that:
  - Calls any existing summary endpoints; or
  - Falls back to list endpoints and performs light client-side aggregation.
- Bind the Usage Analytics page charts to this service:
  - Show a “no data yet” state if lists are empty.
  - Ensure charts handle zero/low data without throwing errors.

## 11. Platform Settings

- Scope the initial Platform Settings feature:
  - Global feature flags (AI, SMS, WhatsApp, etc.).
  - Plan-level or organisation-level overrides (where supported).
  - Global integration toggles (email provider, AI provider), at least as read-only or basic switches.
- Implement a `PlatformSettingsService` against:
  - `PlatformSettings` and `FeatureFlags` API endpoints.
- Build a Reactive Form:
  - Load current settings on init.
  - Save via PATCH/PUT and refresh on success.
  - Handle and display validation errors per field.

## 12. SuperAdmin organisation switching

- Add a SuperAdmin-only organisation switcher in the top bar:
  - When role is `SuperAdmin`, fetch organisations via `/api/v1/admin/organisations`.
  - Display a dropdown/list to select the current organisation context.
- In `AuthService`:
  - Track `impersonatedOrgId` as a signal, persisted to `localStorage`.
  - Expose helpers like `currentOrgContext()` for UI components.
- Ensure admin API calls for:
  - User Management
  - Audit Logs
  respect this impersonation:
  - Pass `orgId` as a query parameter or header (depending on backend support), or route to org-scoped admin endpoints.
- Update the UI to:
  - Show the currently selected organisation name for SuperAdmins.
  - Provide a “View all organisations” or “Clear impersonation” option to return to global cross-org view where appropriate.

