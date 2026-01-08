## AI Features – Non‑Breaking Execution Plan

This plan implements the 4 AI features from `ai_module.md` without breaking existing behaviour.
All changes are **additive** – no destructive schema changes, no changes to existing endpoint contracts,
and existing flows continue to work when AI is disabled. Each step includes **Implement** and **Test**
actions; do not start the next step until tests for the current step are green.

Scope:
- Backend: `apps/api` (.NET 8 Web API, Postgres, BullMQ jobs).
- Frontend: `apps/web-new` (Angular, standalone components, signals, Material).

---

## Phase 0 – Baseline & Safety Rails

### Step 0.1 – Confirm current platform settings + RBAC

- **Implement**
  - Review the already‑implemented `PlatformSettingsService` and `PlatformSettingsDto` in `apps/api`.
  - Confirm that platform‑level AI flags from `superadmin.md` (e.g. `AiEnabled`, `AiKillSwitch`, `AiRequestsPerOrgPerDay`,
    `AiTokensPerOrgPerMonth`, `AiConfidenceThreshold`) are present on the DTO and stored in the single
    `"platform.settings"` JSON document (no new table).
  - Confirm that SuperAdmin‑only `/api/platform-settings` endpoints and `PlatformModeMiddleware` are working.
- **Test**
  - `cd apps/api && dotnet test`.
  - Manually:
    - `GET /api/platform-settings` as SuperAdmin → full JSON.
    - `GET /api/platform-settings/public` → safe subset only.
    - Toggle `MaintenanceMode` and `ReadOnlyMode` and hit a non‑admin write endpoint as a normal user to see 503 / 423.

### Step 0.2 – Non‑breaking org settings extension strategy

- **Implement**
  - Decide where org‑level AI flags will live:
    - Prefer adding **optional** fields (nullable or with defaults) to an existing `OrganisationSettings` entity/DTO,
      or create a **new** `OrganisationAiSettings` table & endpoint, instead of changing existing public contracts.
  - Document this decision in `/docs/ASSUMPTIONS.md` (e.g. “Org AI flags exposed via new `/api/orgs/{orgId}/ai/settings` endpoint;
    existing org settings endpoints remain unchanged.”).
- **Test**
  - Rebuild and run existing org admin screens in both `apps/web` and `apps/web-new` to ensure no regressions.

---

## Phase 1 – Settings & Flags (Platform + Org) – Non‑Breaking

### Step 1.1 – Extend PlatformSettings logical document with AI flags

- **Implement**
  - In `PlatformSettingsDto`, ensure the following fields exist (if any missing, add them with safe defaults):
    - `AiEnabled`, `AiKillSwitch`, `AiRequestsPerOrgPerDay`, `AiTokensPerOrgPerMonth`, `AiConfidenceThreshold`.
    - Per‑feature toggles: `AiFeatureIntakeEnabled`, `AiFeatureQuoteReviewEnabled`,
      `AiFeatureCommsDraftEnabled`, `AiFeatureJobSummaryEnabled`.
  - Update `PlatformSettingsService.CreateDefaultSettings()` to seed sensible defaults (AI off, limits = 0 or conservative).
  - Update its validation to enforce:
    - `0 ≤ AiConfidenceThreshold ≤ 1`.
    - When `AiKillSwitch` is true, force all `Ai*Enabled` flags to false.
- **Test**
  - Unit tests:
    - `AiKillSwitch` forces all feature flags off.
    - Confidence outside range throws validation error.
  - `GET /api/platform-settings` to confirm new fields are present in JSON; PATCH with invalid values returns 400.

### Step 1.2 – Add org‑level AI flags via new endpoint (no contract changes)

- **Implement**
  - Create an `OrganisationAiSettings` DTO and API in `apps/api`:
    - `ai_intake_enabled`, `ai_quote_review_enabled`, `ai_comms_draft_enabled`, `ai_job_summary_enabled`.
  - Implement:
    - `GET  /api/orgs/{orgId}/ai/settings`
    - `PUT  /api/orgs/{orgId}/ai/settings`
  - Persist these flags either:
    - As JSON in a new `OrganisationSettings` table (additive, new table only), or
    - As JSON keyed rows in an `OrganisationSettings` key/value table (matching the `PlatformSettings` pattern).
  - Enforce:
    - Organisation can only enable a feature when both platform `AiEnabled` and feature toggle are true.
    - AI is considered disabled for the org if platform AI is off or kill‑switch is on.
- **Test**
  - New API integration tests:
    - OrgAdmin can read/write their org AI settings within platform constraints.
    - Attempt to enable a platform‑disabled feature returns 400/403 with clear error.
  - `dotnet test` remains green.

---

## Phase 2 – AI Usage & Invocation Tables (Additive Only)

### Step 2.1 – Add AI usage tables and entity mappings

- **Implement**
  - Add EF Core entities and migrations for:
    - `AiUsageDaily` (`OrganisationId`, `Day`, `RequestsUsed`, `TokensUsed`).
    - `AiUsageMonthly` (`OrganisationId`, `Month`, `TokensUsed`).
    - `AiInvocation` (schema as in `ai_module.md`, but **new tables only**).
  - Register `DbSet`s in `MaintainUkDbContext` and configure indexes (PK on `(OrgId, Day)` / `(OrgId, Month)`, index on `FeatureKey` for invocations).
- **Test**
  - `dotnet ef migrations add AddAiUsageTables && dotnet ef database update` against your dev DB.
  - DB check via `psql`: tables created with expected columns and indexes.

### Step 2.2 – Implement AiUsageService (accounting only)

- **Implement**
  - Create `AiUsageService` with methods:
    - `CanConsumeAsync(orgId, featureKey, tokensRequested)` → returns { allowed, reason }.
    - `RecordSuccessAsync(invocation)` → increments daily/monthly usage.
    - `RecordBlockedAsync(invocation, reason)` → writes `AiInvocation` row with status `BLOCKED`.
  - Use transactions to ensure updates to `AiUsageDaily` and `AiUsageMonthly` are atomic.
- **Test**
  - Unit tests:
    - Hitting limits marks `allowed=false` and leaves usage unchanged.
    - Recording success increments both daily & monthly counters correctly.

---

## Phase 3 – AI Client Abstraction & Policy Guard

### Step 3.1 – IAiClient + MockAiClient (no vendor lock)

- **Implement**
  - Define `IAiClient` interface in `apps/api`:
    - `Task<AiResult> ExecuteAsync(AiFeatureKey feature, string systemPrompt, object userPayload, CancellationToken ct)`.
  - Implement `MockAiClient` that:
    - Produces deterministic, safe JSON outputs for all 4 features (simple templates, no real LLM).
    - Can be used in dev and tests without external dependencies.
  - Wire DI so that, unless a real provider is configured, `IAiClient` resolves to `MockAiClient`.
- **Test**
  - Unit tests against `MockAiClient` verifying shape of outputs (e.g. summary fields exist, flags array not empty).

### Step 3.2 – AiPolicyService (safety + caps + feature gates)

- **Implement**
  - Create `AiPolicyService` which:
    - Reads platform and org AI settings.
    - Uses `AiUsageService.CanConsumeAsync` for request/token limits.
    - Applies safety rules (e.g. gas/electrics for tenants → block troubleshooting guidance but allow job creation).
    - Applies confidence threshold logic (for later; for now on mock it can just pass through).
  - Policy should decide:
    - `ALLOWED`, `BLOCKED_POLICY`, `BLOCKED_USAGE`, with reasons and optional safe fallback message.
- **Test**
  - Unit tests:
    - Platform AI disabled → all features blocked.
    - Kill switch → all features blocked.
    - Org feature disabled → blocked for that feature only.
    - Usage over cap → blocked with usage reason.

---

## Phase 4 – AI Invocation Service & Audit Integration

### Step 4.1 – Central AiInvocationService

- **Implement**
  - Create `AiInvocationService` that:
    - Coordinates: policy check → AI client call → usage accounting → `AiInvocation` row.
    - On success:
      - Writes `AiInvocation` with status `SUCCESS` and tokens/costs.
      - Calls `AiUsageService.RecordSuccessAsync`.
      - Writes `AuditLog` with action `AI_INVOKE` and minimal, non‑sensitive meta (feature, entity, tokens, cost).
    - On blocked:
      - Writes `AiInvocation` with status `BLOCKED`.
      - Writes `AuditLog` with `AI_BLOCKED` / `AI_USAGE_LIMIT`.
- **Test**
  - Unit/integration tests:
    - Successful invocation creates both `AiInvocation` and audit row.
    - Blocked invocation creates `AiInvocation` + audit with correct action and reason.

---

## Phase 5 – Org‑Scoped AI Endpoints (All Additive)

### Step 5.1 – Implement the 4 feature endpoints

- **Implement**
  - Under `/api/orgs/{orgId}/ai/*`, add minimal endpoints:
    1. `POST /api/orgs/{orgId}/ai/intake` → returns draft job structure.
    2. `POST /api/orgs/{orgId}/ai/quote-review` → returns flags + questions + recommendation.
    3. `POST /api/orgs/{orgId}/ai/comms-draft` → returns subject + message draft.
    4. `POST /api/orgs/{orgId}/ai/job-summary` → returns summary + blockers + next steps + SLA risk.
  - Enforce:
    - Org scoping via existing multi‑tenancy filters / `OrgId` claims.
    - Role check: allow OrgAdmin and SuperAdmin, but no tenants hitting admin endpoints directly.
  - Each endpoint should:
    - Call `AiInvocationService`.
    - Never mutate jobs/quotes/messages directly (read‑only suggestions).
- **Test**
  - Integration tests per endpoint:
    - Happy path for OrgAdmin with AI enabled.
    - 403/401 for unauthenticated / wrong role.
    - 400/429 equivalent when usage/policy blocks.

### Step 5.2 – AI usage + invocations read endpoints

- **Implement**
  - Add:
    - `GET /api/orgs/{orgId}/ai/usage` → returns daily + monthly usage for that org.
    - `GET /api/orgs/{orgId}/ai/invocations?featureKey=&from=&to=` → paged list for OrgAdmin.
- **Test**
  - Integration tests:
    - OrgAdmin sees only their org’s usage/invocations.
    - SuperAdmin can see cross‑org if needed via a separate SuperAdmin endpoint (optional and additive).

---

## Phase 6 – Async Execution via Jobs (Optional, Non‑Breaking)

### Step 6.1 – BullMQ workers for long‑running AI calls

- **Implement**
  - In `apps/jobs`, add new queues + processors for AI jobs:
    - e.g. queue `ai`, jobs `intake`, `job_summary` that call `IAiClient` and update `AiInvocation`.
  - Update API endpoints for heavy features (intake with images, job summary) to:
    - Create `AiInvocation` with status `PENDING`.
    - Publish a job to the BullMQ queue.
    - Return `202 Accepted` + `invocationId`.
  - Add `GET /api/orgs/{orgId}/ai/invocations/{id}` so the UI can poll for results.
- **Test**
  - Jobs tests:
    - Worker pulls pending messages and transitions `AiInvocation` from `PENDING` → `SUCCESS` / `FAILED`.
  - End‑to‑end manual:
    - Call async endpoint, poll invocation endpoint until completed.

---

## Phase 7 – Angular UI for the 4 AI Features

### Step 7.1 – Tenant intake “AI assist”

- **Implement**
  - In the tenant/maintenance intake UI in `apps/web-new`:
    - Add an “AI assist” button that calls `/api/orgs/{orgId}/ai/intake`.
    - Show returned draft (category, urgency, summary, missing‑info questions, recommended next action) in a preview form.
    - Allow the tenant to edit fields before final submit through the **existing** job‑create endpoint.
  - Respect org + platform flags:
    - Hide / disable the button when AI intake is not enabled.
- **Test**
  - Unit tests for the intake component/service.
  - E2E: AI disabled → button hidden and normal flow works; AI enabled → draft appears and job creation still succeeds.

### Step 7.2 – Quote review side panel

- **Implement**
  - In quote detail screen:
    - Add a side panel or drawer with a “Run AI review” button.
    - Display risk flags and suggested questions; add “Copy questions” button.
  - Never auto‑approve; only show suggestions.
- **Test**
  - Unit tests: component maps API response correctly.
  - E2E: run AI review on a quote, see flags/questions, ensure approving/rejecting still uses existing flows.

### Step 7.3 – Message composer “Generate draft”

- **Implement**
  - In message composer (staff → tenant/contractor):
    - Add an intent dropdown (chase, confirm, clarify, appointment, closure).
    - Add “Generate draft” button that calls `/ai/comms-draft` and fills subject/body, which remain fully editable.
- **Test**
  - Unit tests for message composer enhancements.
  - E2E: draft generation populates editor; sending works as before if AI is disabled (button hidden).

### Step 7.4 – Job details summary widget

- **Implement**
  - In job details header:
    - Add a summary widget showing last AI summary + SLA risk badge.
    - Provide a “Refresh summary” button that calls `/ai/job-summary`.
    - Cache the latest summary client‑side and/or rely on persisted `AiInvocation`.
- **Test**
  - Unit tests for summary component.
  - E2E: refresh updates summary; when AI is disabled, widget is either hidden or shows a static message.

---

## Phase 8 – Admin UI for AI Settings

### Step 8.1 – SuperAdmin AI controls (platform)

- **Implement**
  - Extend the existing SuperAdmin `/superadmin/platform-settings` screen in `web-new`:
    - Add toggles for `AiEnabled`, `AiKillSwitch`, and the 4 feature flags.
    - Add numeric inputs for `AiRequestsPerOrgPerDay`, `AiTokensPerOrgPerMonth`, `AiConfidenceThreshold`.
- **Test**
  - Unit tests for the settings form to ensure correct mapping and validation messages.
  - Manual: toggle flags and confirm they affect behaviour of AI endpoints according to policy.

### Step 8.2 – OrgAdmin AI settings

- **Implement**
  - On the org settings screen:
    - Add toggles for the 4 AI features, disabled if platform disallows them.
  - Bind to `/api/orgs/{orgId}/ai/settings` (new endpoint from Phase 1).
- **Test**
  - Unit + integration tests ensuring OrgAdmin cannot enable AI when platform has it off.

---

## Phase 9 – Docs & Final QA

### Step 9.1 – Documentation

- **Implement**
  - Create `/docs/AI.md` describing:
    - The 4 features, safety rules, usage limits, and policy behaviour.
  - Update `/docs/API.md` and `/docs/ASSUMPTIONS.md` with:
    - New tables, endpoints, and the non‑breaking design decisions (key/value settings, additive tables).
- **Test**
  - From a clean checkout, follow docs to:
    - Run migrations, start API and jobs worker, start `web-new`.
    - Enable AI for a test org and exercise each feature end‑to‑end.

