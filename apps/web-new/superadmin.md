KEYWORD: property maintenance

You are a senior full-stack engineer working in my repo. Implement “Platform Settings” for a UK-focused PROPERTY MAINTENANCE SaaS.

Stack + rules:
- Frontend: latest Angular (standalone only, signals-first, OnPush), Reactive Forms, Router, Material (or existing UI kit).
- Backend: .NET Web API, clean layering, Postgres.
- Auth/RBAC already exists or you will implement minimal support:
  - SuperAdmin can edit platform settings
  - Everyone else can only read a safe subset (if required)
- Security: enforce SuperAdmin-only writes at API level. Every change must be audited.
- Produce code, not theory. Create/modify files directly. Keep changes incremental.
- Update docs: /docs/README.md, /docs/ASSUMPTIONS.md, /docs/RBAC.md, /docs/PLATFORM_SETTINGS.md.

========================================================
0) DELIVERABLES (CREATE + KEEP UPDATED)
========================================================
Backend:
- Reuse existing `PlatformSettings` key/value table (no breaking schema changes)
- API endpoints: read + update (SuperAdmin only) + read-public (optional)
- Validation rules enforced server-side
- Audit log entries on every update
- Unit tests covering auth + validation + audit

Frontend:
- /super-admin/settings screen with forms + toggles
- Save + error handling + “dirty” state
- If impersonating, disable editing and show banner

Docs:
- /docs/PLATFORM_SETTINGS.md (keys, meaning, defaults, validation)
- Update /docs/API.md with endpoints
- Update /docs/ASSUMPTIONS.md with any assumptions

========================================================
1) PLATFORM SETTINGS FEATURE LIST (IMPLEMENT)
========================================================
Implement these settings as a single logical “platform settings” document, backed by the existing
`PlatformSettings` key/value table (one row per logical key) rather than a new strongly-typed row:

A) Organisation limits & defaults
- max_properties_per_org (int)
- max_users_per_org (int)
- max_active_jobs_per_month (int)
- default_approval_threshold_gbp (decimal(12,2))
- max_approval_threshold_gbp (decimal(12,2))
- sla_emergency_hours (int)
- sla_urgent_hours (int)
- sla_routine_days (int)

B) Billing & monetisation controls (flags only; billing can be stubbed)
- billing_enabled (bool)
- trial_days (int)
- nonpayment_grace_days (int)
- hard_stop_on_nonpayment (bool)
- vat_enabled (bool)
- vat_rate_percent (decimal(5,2))
- allowed_billing_models (jsonb array of strings; values: "PER_PROPERTY","PER_JOB","FLAT_MONTHLY")

C) Communication channels
- channel_email_enabled (bool)
- channel_sms_enabled (bool)
- channel_whatsapp_enabled (bool)
- comms_quiet_hours_start_local (time)  (UK default)
- comms_quiet_hours_end_local (time)
- rate_limit_messages_per_org_per_day (int)
- rate_limit_messages_per_user_per_hour (int)
- templates_locked (bool)

D) Workflow rules
- auto_assignment_enabled (bool)
- require_approval_above_gbp (decimal(12,2))
- allow_cancel_after_assigned (bool)

E) Contractor governance
- contractor_onboarding_mode (text enum: "INVITE_ONLY"|"OPEN_REGISTRATION")
- contractor_insurance_required (bool)
- contractor_certifications_required (bool)
- contractor_visibility_mode (text enum: "ORG_ONLY"|"CROSS_ORG")

F) AI controls
- ai_enabled (bool)
- ai_tenant_portal_enabled (bool)
- ai_work_assist_enabled (bool)
- ai_summarisation_enabled (bool)
- ai_requests_per_org_per_day (int)
- ai_tokens_per_org_per_month (int)
- ai_confidence_threshold (decimal(4,3))  (0.000–1.000)
- ai_kill_switch (bool)

G) Compliance & security
- gdpr_retention_months (int)
- audit_retention_months (int)
- mfa_required (bool)
- session_expiry_minutes (int)

H) Feature flags
- feature_flags (jsonb object map string->bool)
- rollout_mode (text enum: "ALL"|"PERCENT"|"ALLOWLIST")
- rollout_percent (int 0–100)
- rollout_allowlist_org_ids (jsonb array of uuid strings)

I) Platform identity
- platform_name (text)
- support_email (text)
- terms_url (text)
- privacy_url (text)
- global_banner_message (text nullable)
- maintenance_mode (bool)
- read_only_mode (bool)

========================================================
2) VALIDATION RULES (SERVER-SIDE, MUST)
========================================================
- max_approval_threshold_gbp >= default_approval_threshold_gbp
- all counts and durations > 0 where applicable
- vat_rate_percent:
  - if vat_enabled=false => must be 0
  - if vat_enabled=true  => 0 < rate <= 30
- quiet hours:
  - start != end
  - accept overnight ranges (e.g. 22:00–07:00)
- ai_confidence_threshold must be between 0 and 1 inclusive
- rollout_percent required when rollout_mode="PERCENT"
- allowlist required when rollout_mode="ALLOWLIST"
- if ai_kill_switch=true then force:
  - ai_enabled=false
  - ai_*_enabled=false

Also: add a single “SettingsVersion” (int) that increments on each update.

========================================================
3) BACKEND IMPLEMENTATION (.NET)
========================================================
A) Data model + migration
- Keep existing `PlatformSetting` entity/table shape as-is (Key, Value jsonb, UpdatedAt, UpdatedBy).
- Model the logical settings document in code (DTO + mapper) that reads/writes individual keys
  (e.g. `platform.max_properties_per_org`, `platform.ai_enabled`, etc.).
- Optionally add a new key such as `platform.settings_version` to track `SettingsVersion`
  without changing the underlying table schema.

B) Endpoints
- GET  /api/platform-settings (SuperAdmin full view)
- PATCH /api/platform-settings (SuperAdmin update; partial allowed)
- GET  /api/platform-settings/public (non-admin safe subset)
  - Return only what org admins need to validate their org settings:
    - max_approval_threshold_gbp
    - channel_*_enabled
    - ai_enabled
    - maintenance_mode
    - read_only_mode

C) Concurrency
- Use SettingsVersion for optimistic concurrency:
  - PATCH requires If-Match header OR body includes expectedVersion
  - If version mismatch -> 409

D) Auditing
- On every successful PATCH:
  - audit_log action = "PLATFORM_SETTINGS_UPDATE"
  - include diff in meta: { changedKeys:[], old:{...}, new:{...} } (store only changed keys in old/new)

E) Tests
- Non-SuperAdmin cannot PATCH
- Validation failures return 400 with field errors
- Version mismatch returns 409
- ai_kill_switch forces ai flags off
- Audit record written on update

========================================================
4) FRONTEND IMPLEMENTATION (ANGULAR)
========================================================
A) Routes
- /super-admin/settings
- protect with SuperAdminGuard

B) Services + state
- PlatformSettingsApiService:
  - get()
  - patch(changes, expectedVersion)
- SuperAdminSettingsStore (signals):
  - settings
  - loading
  - saving
  - error
  - dirty

C) UI
- Use a single settings page with sections matching 1A–1I
- Use Reactive Forms; split into FormGroups
- Show:
  - Last updated time
  - Current version
- Save button:
  - disabled if not dirty or if read_only_mode/maintenance_mode active (confirm behaviour)
- If impersonating:
  - disable all controls
  - show banner “Impersonation active — settings locked”
- Show API validation errors inline

D) Feature flags editor
- Provide a simple key/value editor:
  - add flag
  - remove flag
  - toggle
- Rollout controls:
  - mode dropdown
  - percent input or allowlist chips

========================================================
5) READ-ONLY + MAINTENANCE MODE EFFECTS (IMPLEMENT MINIMUM)
========================================================
Backend:
- If maintenance_mode=true:
  - allow SuperAdmin to read + update settings
  - block other write endpoints across the API via a global filter/middleware (except auth + health)
- If read_only_mode=true:
  - allow all reads
  - block all writes for non-SuperAdmin

Frontend:
- Show banner site-wide if maintenance_mode or read_only_mode (use existing layout shell)
- Disable write actions when read_only_mode active unless SuperAdmin

========================================================
6) EXECUTION STEPS (DO IN ORDER)
========================================================
1) Scan repo structure and use existing patterns (EF, controllers, filters, Angular layout).
2) Add code-level DTO/mapper over existing `PlatformSettings` keys; only add migrations for new seed keys or indexes if strictly required (no destructive schema changes).
3) Add backend endpoints + validation + optimistic concurrency + audit logging + tests.
4) Add Angular settings screen + service + state + guards + error handling.
5) Add maintenance/read-only middleware + frontend banners.
6) Update docs and ensure build/tests pass.

Start now. Create the files and commit-ready changes.
