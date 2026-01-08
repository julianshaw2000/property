KEYWORD: property maintenance

You are a senior full-stack engineer working in my repo. Execute the **non-breaking monetisation MVP** (`mvp`) and the **read-only AI Gateway** (`AI.md`) in small, testable steps. Produce code, not theory. Each step below must be independently shippable, reversible, and have clear tests (unit/integration/E2E or manual checks).

Use feature flags and config so **existing production behaviour is unchanged** until explicitly enabled.

========================================================
1) FOUNDATION – SCAN, FLAGS, AND GUARDRAILS
========================================================
Goal: Understand the current system and put safety rails in place before adding behaviour.

Implementation:
- Scan existing code for:
  - Auth, RBAC, org scoping.
  - Existing billing/subscription logic.
  - Lead/contractor flows.
  - Existing AI usage integrations (`IAiClient`, jobs).
- Introduce configuration flags (no-op initially):
  - `Billing:EnforceWriteLock` (bool, default false)
  - `Entitlements:Enforce` (bool, default false)
  - `AiLimits:Enforce` (bool, default false)
  - `Monetisation:Enabled` (bool, default false)
  - `AiGateway:Enabled` (bool, default false)
- Add or update `/docs/ASSUMPTIONS.md` to capture:
  - Current billing model and limits.
  - Existing AI entry points.
  - Any known constraints/risk areas.

Tests (required):
- Config:
  - Unit test: flags default to `false` when config missing.
- Behaviour:
  - Run existing backend + frontend test suites; there must be **no behaviour changes** and no new failures with flags off.
- Docs:
  - Manual check: `/docs/ASSUMPTIONS.md` exists and reflects current system.

========================================================
2) ADDITIVE DB LAYER – MONETISATION TABLES
========================================================
Goal: Add all new monetisation tables **without touching existing tables or behaviour**.

Implementation:
- Create EF Core migrations (or equivalent) for additive tables (from `mvp`):
  - `plans`
  - `plan_entitlements`
  - `organisation_billing`
  - `billing_events`
  - `stripe_webhook_events`
  - `job_leads`
  - `contractor_verification`
  - `contractor_verification_docs`
  - `ai_usage_monthly`
- Ensure:
  - No changes to existing tables (no new NOT NULL, no column type changes).
  - FKs are nullable where needed to avoid existing-data migration failures.
  - Reasonable indexes added (orgId/date fields) without altering existing indexes.

Tests (required):
- DB:
  - Run migrations against dev DB containing realistic existing data; verify migration completes without errors.
  - Inspect schema: existing tables/columns/indexes unchanged.
- Automated:
  - Run backend test suite (e.g., `dotnet test`); ensure no new failures.

========================================================
3) STRIPE + BILLING STATE – SHADOW MODE
========================================================
Goal: Integrate Stripe and start writing billing state into new tables, **without affecting current billing behaviour**.

Implementation:
- Implement Stripe client + configuration:
  - API keys from environment/secret store only.
  - Config for plan/product IDs (STARTER/PRO/BUSINESS + verification product).
- Implement webhooks:
  - Endpoint `POST /api/stripe/webhook`.
  - Signature verification + idempotency using `stripe_webhook_events`.
  - Map events into `billing_events` and `organisation_billing` only.
- Implement read-only billing queries:
  - `GET /api/orgs/{orgId}/billing` reading from `organisation_billing`/`plans`.
- Do **not** update any existing plan/status fields or business logic in this step.

Tests (required):
- Unit:
  - Webhook handler writes correct rows for key events (checkout completed, subscription updated, invoice paid/failed).
  - Idempotency: same event processed twice results in single business update.
- Integration:
  - Simulate Stripe webhook payloads against test server; observe DB changes in new tables only.
  - Existing billing flows continue to work exactly as before.

========================================================
4) ENTITLEMENTS SERVICE – LOG-ONLY
========================================================
Goal: Implement `EntitlementsService` to compute plan limits and log when exceeded, **without blocking**.

Implementation:
- Implement `EntitlementsService`:
  - Reads `plans`, `plan_entitlements`, `organisation_billing`.
  - Functions: `CanCreateProperty`, `CanCreateUser`, `CanCreateJob`, `GetUsageSnapshot`.
- Wire it into key command points (e.g., property/user/job create service methods):
  - On over-limit, log an event (`PLAN_LIMIT_REACHED`) into `billing_events` and/or audit, but **do not throw** if `Entitlements:Enforce == false`.

Tests (required):
- Unit:
  - Given specific entitlements + usage, `CanCreate*` returns expected values.
  - Over-limit conditions produce expected log/audit writes.
- Behaviour:
  - With `Entitlements:Enforce == false`, existing create endpoints succeed exactly as before, regardless of limits.

========================================================
5) WRITE-LOCK MIDDLEWARE – REPORT-ONLY
========================================================
Goal: Add `WriteLock` middleware that detects `org_write_lock` and logs potential lock events, but does **not block** writes yet.

Implementation:
- Implement middleware/filter:
  - Detect write operations (POST/PUT/PATCH/DELETE) scoped to an org.
  - If `organisation_billing.org_write_lock == true`:
    - Log `"BILLING_LOCK would apply"` + context.
    - Allow request if `Billing:EnforceWriteLock == false`.
- Register middleware in pipeline (after auth), with default behaviour report-only.

Tests (required):
- Unit:
  - Locked org + write request + flag false => request passes, log entry written.
  - Unlocked org => no log, request passes.
- Behaviour:
  - E2E smoke test of core write paths shows no behavioural change with flag off.

========================================================
6) PAY-PER-LEAD – NEW ENDPOINTS + UI (ISOLATED)
========================================================
Goal: Implement new pay-per-lead flows using `job_leads`, without changing existing lead/job behaviour.

Implementation:
- Backend:
  - Endpoints:
    - `GET /api/contractors/{contractorId}/leads` (paginated).
    - `POST /api/contractors/{contractorId}/leads/{leadId}/accept`.
    - `POST /api/orgs/{orgId}/leads/{leadId}/refund`.
  - Pricing rules (ROUTINE/URGENT/EMERGENCY) from config.
  - Charging logic uses Stripe Checkout/PaymentIntent and writes to `billing_events` only.
- Frontend:
  - New routes/components:
    - `/contractor/leads` (standalone, signals, OnPush).
  - Do not remove or alter any existing lead/contractor UIs.

Tests (required):
- Unit:
  - Lead accept calls Stripe charge once, idempotent safeguards in place.
  - Refund updates `billing_events` with correct metadata.
- Integration/E2E:
  - Contractor can see leads and accept via new UI.
  - Existing lead views and job flows remain unchanged.

========================================================
7) CONTRACTOR VERIFICATION – DECORATIVE FIRST
========================================================
Goal: Implement paid contractor verification, storing state in new tables and **only enhancing** visibility (no gating core access).

Implementation:
- Backend:
  - Endpoints:
    - `POST /api/contractors/{contractorId}/verification/checkout`
    - `POST /api/contractors/{contractorId}/verification/docs`
    - `GET  /api/orgs/{orgId}/verification/pending`
    - `POST /api/orgs/{orgId}/contractors/{contractorId}/verify`
    - `POST /api/orgs/{orgId}/contractors/{contractorId}/reject`
  - Map states: UNVERIFIED -> PENDING_REVIEW -> VERIFIED -> EXPIRED.
- Frontend:
  - New `/contractor/verification` screen (status + purchase + upload docs).
  - Add a **badge** display for VERIFIED contractors without changing access rules.

Tests (required):
- Unit:
  - State transitions applied correctly on webhook/payment + review endpoints.
- Integration:
  - End-to-end flow: purchase -> PENDING_REVIEW -> upload docs -> VERIFIED.
  - Existing contractor usage not impacted.

========================================================
8) AI USAGE METERING – READ-ONLY
========================================================
Goal: Start logging AI usage into `ai_usage_monthly` without impacting existing AI flows.

Implementation:
- Wrap existing `IAiClient`/AI call sites:
  - After a successful call, record:
    - orgId, date month, requests_used (+1), tokens_used (estimated or from provider).
  - Store in `ai_usage_monthly` (upsert per org/month).
- Add read-only endpoint:
  - `GET /api/orgs/{orgId}/ai/usage` returning a simple usage summary.

Tests (required):
- Unit:
  - Metering writes correct increments given calls and token counts.
- Behaviour:
  - With `AiLimits:Enforce == false`, existing AI features behave identically, only additional reads/writes occur in the new table.

========================================================
9) ORG BILLING & AI USAGE UI – NEW PAGES
========================================================
Goal: Add minimal, new Angular screens for billing and AI usage using the new endpoints only.

Implementation:
- Org Admin:
  - `/org-admin/billing`:
    - Show plan name, status, trial end from new billing APIs.
    - Buttons for “Upgrade” (Stripe Checkout) and “Manage billing” (Stripe Portal).
    - Show usage vs entitlements, including AI usage charts.
- Global:
  - Optional informational banners for `PAST_DUE`/`READ_ONLY` states; **do not** assume blocking is enabled yet.

Tests (required):
- Frontend:
  - Component unit tests: properly renders mocked billing + usage data.
  - Routing tests: page is guarded appropriately (OrgAdmin only).
- Manual/E2E:
  - Navigating to new pages does not break existing navigation.

========================================================
10) AI TOOL GATEWAY – SKELETON SERVICE
========================================================
Goal: Create the AiToolGateway service skeleton and core docs, without any business tools yet.

Implementation:
- Create new project structure (per `AI.md`):
  - `/src/AiToolGateway/` (or equivalent): `Program.cs`, `AiToolGateway.csproj`, basic folder layout.
- Implement:
  - Basic `/health` endpoint.
  - JWT bearer auth integration (reuse existing auth if available).
  - `ReadOnlyGuard` middleware that:
    - Blocks all outbound HTTP methods except GET/HEAD by default.
    - Will apply to all downstream API clients.
- Create initial docs:
  - `/docs/AI_READ_ONLY_GUARDRAILS.md`
  - `/docs/MCP_GATEWAY_API.md` (skeleton describing architecture)
  - `/docs/SECURITY_AND_PRIVACY.md` (skeleton)

Tests (required):
- Automated:
  - Gateway project builds and runs tests independently.
  - ReadOnlyGuard unit tests: PUT/PATCH/DELETE blocked, POST blocked by default.
- Manual:
  - `GET /health` reachable locally.

========================================================
11) MCP RESOURCES + 4–5 CORE READ TOOLS
========================================================
Goal: Implement a small, robust subset of MCP tools/resources for read-only ops views.

Implementation:
- Resources:
  - Implement URIs and handlers for a subset:
    - `workorder://{orgId}/{workOrderId}`
    - `property://{orgId}/{propertyId}`
    - `ops://{orgId}/daily-brief/{yyyy-mm-dd}`
- Tools (from `AI.md`):
  - `search_work_orders`
  - `get_work_order_details`
  - `list_overdue_work_orders`
  - `list_pending_quotes`
  - `daily_ops_brief`
- Ensure:
  - All calls go through typed downstream clients (`WorkOrdersClient`, etc.).
  - All outbound calls are GET/HEAD or explicitly allowlisted POST to read-only search endpoints.
  - Org scoping enforced from JWT (orgId, role).

Tests (required):
- Unit:
  - Each tool validates input schema and enforces org scoping.
  - ReadOnlyGuard rejects a deliberately crafted “write” client.
- Integration:
  - With a test JWT, tools return valid, filtered JSON and PII-masked fields.

========================================================
12) PRIVACY, AUDIT, AND TOOL CATALOG
========================================================
Goal: Lock down privacy guarantees and auditing for all AI gateway operations.

Implementation:
- Privacy:
  - Implement field-level masking for tenant PII and internal notes based on role.
- Audit:
  - Implement `audit_tool_access` table and write an audit row for every tool/resource call:
    - timestamp, userId, orgId, role, tool/resource, params hash, success/fail, latency, correlationId.
- Docs:
  - Finalise `/docs/SECURITY_AND_PRIVACY.md`.
  - Populate `/docs/TOOL_CATALOG.md` with schemas and examples.

Tests (required):
- Unit:
  - PII masking for non-privileged roles.
  - Audit rows written on success and failure.
- Integration:
  - Log sample calls and verify audit table content and masking.

========================================================
13) ENFORCEMENT FLAGS – CONTROLLED ROLLOUT
========================================================
Goal: Safely enable blocking behaviour where desired, behind flags, after observing shadow-mode logs.

Implementation:
- Billing/Entitlements:
  - When comfortable, enable `Entitlements:Enforce` and/or `Billing:EnforceWriteLock` **in a non-production environment first**.
  - Update frontend to show clear messages for `"PLAN_LIMIT_REACHED"` and `"BILLING_LOCK"`.
- AI Limits:
  - Enable `AiLimits:Enforce` in non-production; block AI calls over limits with `"AI_LIMIT_REACHED"`.
- Monitor:
  - Add dashboards/log queries around:
    - Rate of PLAN_LIMIT_REACHED / BILLING_LOCK / AI_LIMIT_REACHED.

Tests (required):
- Automated:
  - Integration tests that toggle flags on and verify:
    - Over-limit creates are blocked appropriately.
    - Locked org writes fail with expected error.
    - AI calls over limits are rejected.
- Manual:
  - UAT flows verifying user-facing messages and ensuring no unexpected 5xx errors.

========================================================
14) FINAL QA, DOCS, AND HANDOVER
========================================================
Goal: Ensure everything is documented, testable, and safe to roll out incrementally.

Implementation:
- Docs:
  - Update `/docs/BILLING.md` and `/docs/ENTITLEMENTS.md` with:
    - Flag behaviour.
    - Rollout plan.
    - Back-out steps.
  - Update `/docs/MCP_GATEWAY_API.md` and `/docs/README.md` with:
    - How to run AiToolGateway.
    - Example MCP client configuration.
- Final regression:
  - Rerun all backend + frontend test suites.
  - Smoke-test core user flows with all enforcement flags OFF.

Tests (required):
- CI:
  - All test suites green (API, jobs, web, gateway).
- Manual:
  - Confirm that with all flags off, app behaves exactly as before, and new pages/services are reachable for targeted users only.

This plan ensures each step is **small, testable, and reversible**, while combining the non-breaking monetisation stack and the read-only AI gateway into a coherent rollout.

