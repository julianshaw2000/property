KEYWORD: property maintenance

You are a senior full-stack engineer working in my repo. Add 4 high-ROI AI features to my UK-focused PROPERTY MAINTENANCE SaaS and wire them end-to-end (DB + API + Angular UI + background jobs + audit + usage limits). Produce code, not theory. Create/modify files directly.

Stack + rules:
- Frontend: latest Angular (standalone only, signals-first, OnPush), Reactive Forms, Router, Material (or existing UI kit).
- Backend: .NET Web API, clean layering, Postgres.
- Jobs/queues: BullMQ (or existing queue infra). If BullMQ is not already used in repo, add it in a minimal way for async AI calls.
- Auth/RBAC: already exists. Respect roles:
  - SuperAdmin controls platform-wide AI flags + limits.
  - OrgAdmin can enable/disable AI features only if platform allows.
- Security: enforce org scoping at API level. Never trust UI-only checks.
- Logging: every AI invocation must write an audit record + cost/usage row.
- Safety: AI must NOT provide safety-critical instructions (gas/electrics). It must escalate to human for low confidence or unsafe categories.

========================================================
0) THE 4 AI FEATURES TO IMPLEMENT (BEST ROI)
========================================================
AI-1) Smart Issue Intake (Tenant -> Structured Job)
- Input: free-text description + optional images + property + contact preference
- Output: structured draft job:
  - category/trade
  - urgency (Emergency/Urgent/Routine)
  - summary (1–3 sentences)
  - missing info questions (max 5)
  - recommended next action (e.g. request photos, book visit)
- UI: tenant portal form + “AI assist” button + review before submit
- Store AI draft + user edits + final job

AI-2) Quote Review Assistant (Staff/Admin -> Risk flags + questions)
- Input: quote line items, totals, VAT flag, contractor, job category
- Output:
  - risk flags (price outlier, vague line items, missing items, VAT mismatch)
  - suggested questions to ask contractor (max 8)
  - approve/reject recommendation WITH CONFIDENCE + rationale (short)
- UI: quote screen side panel + “Run AI review”
- Must never auto-approve. Only suggest.

AI-3) Auto-Drafting Communications (Staff -> Tenant/Contractor messages)
- Input: context (job, latest status, recipient type) + intent (chase, confirm, clarify, appointment, closure)
- Output: message draft (short, plain English) + subject (for email)
- UI: message composer with “Generate draft” and editable output
- Must include required context tokens: job ref, property, next step, contact window

AI-4) Job Thread Summary + Next Steps (Staff/Admin)
- Input: job timeline (notes, messages, status changes), quote states, appointments
- Output:
  - summary (bullet list)
  - open blockers (bullets)
  - 3 next steps (ranked)
  - SLA risk: Low/Med/High (heuristic + optional AI)
- UI: job details header widget + refresh button
- Cache latest summary per job; invalidate on new events.

========================================================
1) PLATFORM SETTINGS + ORG SETTINGS (ADD FLAGS + LIMITS)
========================================================
Extend existing settings model (or create if missing):

PlatformSettings (SuperAdmin):
- ai_enabled (bool)
- ai_kill_switch (bool)
- ai_requests_per_org_per_day (int)
- ai_tokens_per_org_per_month (int)
- ai_confidence_threshold (decimal 0..1)
- ai_feature_intake_enabled (bool)
- ai_feature_quote_review_enabled (bool)
- ai_feature_comms_draft_enabled (bool)
- ai_feature_job_summary_enabled (bool)

OrganisationSettings (OrgAdmin, within platform constraints):
- ai_intake_enabled (bool)
- ai_quote_review_enabled (bool)
- ai_comms_draft_enabled (bool)
- ai_job_summary_enabled (bool)

Rules:
- If platform ai_enabled=false OR ai_kill_switch=true => all org AI features disabled.
- Org can only enable features that platform enables.
- Enforce usage caps per org per day/month (server-side).

========================================================
2) DATA MODEL (POSTGRES) + MIGRATIONS
========================================================
Add tables:

ai_usage_daily:
- organisation_id (uuid)
- day (date)
- requests_used (int)
- tokens_used (int)
- primary key (organisation_id, day)

ai_usage_monthly:
- organisation_id (uuid)
- month (date first-of-month)
- tokens_used (int)
- primary key (organisation_id, month)

ai_invocations:
- id (uuid pk)
- at (timestamptz)
- organisation_id (uuid)
- actor_user_id (uuid)
- feature_key (text: INTAKE|QUOTE_REVIEW|COMMS_DRAFT|JOB_SUMMARY)
- entity_type (text: JOB|QUOTE|MESSAGE)
- entity_id (text)
- input_redacted (jsonb)  (no secrets; strip personal data where possible)
- output (jsonb)
- model (text)
- tokens_in (int)
- tokens_out (int)
- cost_gbp_est (numeric(12,4))
- confidence (numeric(4,3))
- status (text: SUCCESS|FAILED|BLOCKED)
- error (text nullable)

Also ensure audit_log is written for:
- AI_INVOKE
- AI_BLOCKED
- AI_USAGE_LIMIT

========================================================
3) BACKEND IMPLEMENTATION (.NET WEB API)
========================================================
A) AI abstraction (no vendor lock)
- Create IAiClient with a single method:
  ExecuteAsync(featureKey, systemPrompt, userPayload) -> { outputJson, tokensIn, tokensOut, confidence }
- Provide a default "MockAiClient" for dev/testing if real client not configured.
- Add config via appsettings + env vars.

B) Safety + policy guard (MUST)
Create AiPolicyService that checks BEFORE invocation:
- platform ai enabled and not kill-switched
- org feature enabled
- usage caps not exceeded
- category safety block:
  - if job category suggests gas/electrics and user is tenant, respond with:
    - “I can’t advise steps. I’ll raise this as urgent and route to a professional.”
  - still allow creating the job, but block troubleshooting guidance
- confidence threshold:
  - if confidence < threshold => mark as low confidence and require human review

C) Usage accounting
- On success, increment requests/tokens in ai_usage_daily and ai_usage_monthly atomically.
- On blocked, write ai_invocations with status=BLOCKED and audit.

D) Endpoints (org-scoped)
1) POST /api/orgs/{orgId}/ai/intake
- Input: description, propertyId, optional mediaIds
- Output: draft job payload (as above)

2) POST /api/orgs/{orgId}/ai/quote-review
- Input: quoteId OR inline quote payload
- Output: flags + questions + recommendation + confidence

3) POST /api/orgs/{orgId}/ai/comms-draft
- Input: jobId, recipientType, intent, optional tone (default "plain")
- Output: message draft + subject + placeholders filled

4) POST /api/orgs/{orgId}/ai/job-summary
- Input: jobId
- Output: summary + blockers + next steps + sla risk

Also add:
- GET /api/orgs/{orgId}/ai/usage (daily + monthly)
- GET /api/orgs/{orgId}/ai/invocations?featureKey=&from=&to= (OrgAdmin)

E) Async execution
- For longer calls (job summary, intake with images), enqueue BullMQ job:
  - Request returns 202 + invocationId
  - Client polls GET /api/orgs/{orgId}/ai/invocations/{id}
- Keep quote review + comms draft synchronous unless slow.

F) Tests
- usage caps enforce (429 or 403 with reason)
- kill switch blocks all
- org cannot enable platform-disabled feature
- audit written for invoke + blocked
- confidence threshold behaviour

========================================================
4) FRONTEND (ANGULAR) IMPLEMENTATION
========================================================
A) Tenant intake screen
- Add “AI assist” button:
  - calls /ai/intake
  - shows draft fields for review/edit
  - user confirms -> creates job using existing job create endpoint
- If blocked for safety, show safe message and allow submit as urgent.

B) Quote screen
- Add side panel:
  - “Run AI review”
  - show flags list + suggested questions
  - copy-to-clipboard questions button

C) Message composer
- Add “Generate draft”:
  - choose intent dropdown
  - insert draft into editor (editable)

D) Job details
- Add summary widget:
  - shows last summary
  - “Refresh” to regenerate
  - shows SLA risk badge (text only)
  - if async, show spinner + polling

E) Admin settings UI
- In org settings page:
  - toggles for the 4 features (disabled if platform disallows)
- In super-admin settings page:
  - global toggles + caps + confidence threshold + kill switch

========================================================
5) DOCS + OBSERVABILITY
========================================================
Create/Update:
- /docs/AI.md
  - feature definitions
  - policy rules
  - redaction rules
  - usage limits
  - safe messaging for gas/electrics
- /docs/API.md (endpoints)
- /docs/ASSUMPTIONS.md (any assumptions)

Add basic logging:
- correlation id per request
- log invocationId + featureKey + orgId

========================================================
6) EXECUTION ORDER
========================================================
1) Scan repo and use existing patterns
2) Add settings flags + migrations
3) Add AI tables + usage accounting + audit hooks
4) Implement IAiClient + policy + endpoints + async queue
5) Implement Angular UI changes for 4 features
6) Add tests + docs + ensure build passes

Start now. Create the files and commit-ready changes.
