## Live LLM Introduction Plan (Non‑Breaking)

This plan builds on the existing `IAiClient` + `MockAiClient` abstraction and keeps everything opt‑in and safe.
All changes are additive and controllable via configuration and platform settings.

Scope:
- Backend: `apps/api` (.NET 8 Web API, Postgres, BullMQ jobs).
- Frontend: `apps/web-new` (Angular, standalone components, signals, Material).

---

## 1. Configuration & Secrets (No Behaviour Change)

### 1.1 Add configuration for AI providers

- **Implement**
  - Extend `appsettings.json` and env vars (no defaults that enable real LLMs):
    - `Ai:Provider` (`Mock` | `OpenAI` | `AzureOpenAI` | etc.).
    - `Ai:Endpoint`
    - `Ai:ApiKey`
    - `Ai:Model`
    - `Ai:MaxTokens`
    - `Ai:RequestTimeoutSeconds`
  - Do **not** commit any keys; document environment variable names in `/docs/AI.md`.
- **Test**
  - Run API with no `Ai:` section → still uses `MockAiClient` (current behaviour).
  - Add `Ai:Provider = "Mock"` explicitly → behaviour unchanged.

---

## 2. Pluggable IAiClient Implementations

### 2.1 Implement concrete provider client (e.g. OpenAI)

- **Implement**
  - Create `OpenAiClient : IAiClient` in `apps/api`:
    - Map `AiFeatureKey` → system prompts + model parameters.
    - Build payloads for the chosen OpenAI API (Chat Completions or similar).
    - Parse response into `AiResult` (JSON `Output`, `TokensIn`, `TokensOut`, `Confidence`).
  - Avoid referencing OpenAI directly from domain/services; keep it in an infrastructure namespace.

### 2.2 Configure DI selection logic

- **Implement**
  - In `Program.cs`, configure `IAiClient` binding:
    - Default: `MockAiClient`.
    - If `Ai:Provider == "OpenAI"` *and* `Ai:ApiKey` present → register `OpenAiClient` instead.
  - Keep this logic conditional and purely configuration‑driven (no code changes needed to switch provider).
- **Test**
  - Unit tests with stubbed `IConfiguration` ensuring that:
    - `Provider=Mock` → `IAiClient` resolves to `MockAiClient`.
    - `Provider=OpenAI` with key → resolves to `OpenAiClient`.

---

## 3. Safety & Redaction Layer

### 3.1 Input redaction

- **Implement**
  - Add `AiRedactionService` that:
    - Takes the incoming domain payload (job/quote/message context).
    - Produces a redacted `input_redacted` object with PII stripped or masked (emails, phones, exact addresses).
  - Use this redacted payload both for:
    - The `input_redacted` column in `ai_invocations`.
    - The payload passed into `IAiClient.ExecuteAsync`.
- **Test**
  - Unit tests:
    - Inputs containing emails, phone numbers, postcodes, and tenant names are masked or removed.
    - Redaction never fails the request but degrades gracefully (e.g. logs a warning if unknown field).

### 3.2 Safety policy integration

- **Implement**
  - Extend `AiPolicyService` so it:
    - Checks platform AI flags (`AiEnabled`, `AiKillSwitch`) and org AI feature flags.
    - Applies safety categories (gas/electrics + tenant → escalate only; no troubleshooting instructions).
    - Interprets `AiConfidenceThreshold`:
      - For confidence below threshold, marks suggestion as “low confidence” (metadata) so UI can show warning.
  - Ensure that policy decisions are made **before** calling the real LLM.
- **Test**
  - Unit tests:
    - `AiEnabled=false` or `AiKillSwitch=true` → policy blocks with reason `AI_DISABLED`.
    - Tenant gas/electrics case returns an “escalate” type response without troubleshooting content.
    - Confidence just below threshold yields “low confidence” flag; above threshold is “normal”.

---

## 4. Cost & Usage Accounting with Real Tokens

### 4.1 Wire token usage into AiInvocation & usage tables

- **Implement**
  - In `OpenAiClient`, read token usage from provider response (`usage.prompt_tokens`, `usage.completion_tokens`, etc.).
  - Pass token counts into `AiInvocationService`, which:
    - Stores `tokens_in`, `tokens_out`, and `cost_gbp_est` in `ai_invocations`.
    - Uses `AiUsageService` to increment `ai_usage_daily` and `ai_usage_monthly`.
  - Add configuration for per‑1K‑token pricing per model in `appsettings` (e.g. `Ai:Pricing:OpenAI:gpt-4o`).
- **Test**
  - Unit tests with fake usage metadata:
    - Cost calculation uses correct (tokens_in + tokens_out) × rate.
    - Daily/monthly usage increments by real tokens, not a constant.

---

## 5. Runtime Toggling & Safe Rollout

### 5.1 Connect provider choice to PlatformSettings

- **Implement**
  - Extend `PlatformSettingsDto` with:
    - `AiProvider` (string, default `"Mock"`).
  - Extend the SuperAdmin `/superadmin/platform-settings` UI to:
    - Show a provider dropdown (Mock / OpenAI / …), but only enable real providers if backend config says they’re available.
- **Test**
  - SuperAdmin changing provider in the UI:
    - Updates `PlatformSettings`.
    - Does **not** break existing AI endpoints (they keep working with either mock or real client).

### 5.2 Respect platform flags in AI endpoints

- **Implement**
  - Ensure all `/ai/...` endpoints:
    - First consult `PlatformSettings` via `AiPolicyService`:
      - `AiEnabled` must be true.
      - `AiKillSwitch` must be false.
      - Org feature + usage caps must allow the call.
    - If blocked, return non‑200 with a clear, non‑technical error (`AI disabled`, `Usage limit reached`, etc.).
- **Test**
  - Integration tests:
    - Flip flags and confirm endpoints respond with expected codes:
      - `AiEnabled=false` → all AI endpoints blocked.
      - `AiKillSwitch=true` → all AI endpoints blocked.
      - Org feature disabled → only that feature blocked.

---

## 6. Observability & Alerts

### 6.1 Structured logging for AI

- **Implement**
  - In `AiInvocationService`, log:
    - `invocationId`, `orgId`, `featureKey`, `provider`, `model`, `tokens_in`, `tokens_out`, `cost_gbp_est`, `status`.
  - Ensure logs **never** include raw PII or full model outputs.
- **Test**
  - Manually exercise a few AI endpoints and check logs for structured fields and absence of sensitive content.

### 6.2 Metrics & alerting (if observability stack exists)

- **Implement**
  - Emit metrics where possible (e.g. Prometheus, AppInsights):
    - Counters by featureKey and status: `ai_invocations_total{feature,status}`.
    - Tokens/cost per org and per provider.
  - Configure basic alerts:
    - Abnormal spike in `FAILED` or `BLOCKED` invocations.
    - Daily cost approaching a defined budget.
- **Test**
  - Run a small scripted load and verify metrics/alerts pipeline works in a non‑production environment.

---

## 7. Frontend UX Adjustments (LLM Awareness)

### 7.1 Provider and safety indicators

- **Implement**
  - In `web-new` AI‑powered components (intake, quote review, comms draft, job summary):
    - Add a subtle “AI suggestion” label and optional provider indicator (e.g. “(Mock)” in dev).
    - Show a small “Review before sending” note near generated content.
  - When in `Mock` mode (from public settings or a dev flag), optionally:
    - Display a small badge “Demo AI output” in non‑prod environments.
- **Test**
  - E2E:
    - Confirm labels and warnings appear for AI‑generated fields.
    - Confirm behaviour is identical structurally whether provider is `Mock` or real, so no contract breaks.

---

## 8. Environment Rollout Strategy

### 8.1 Rollout sequence

- **Implement**
  - Define environment‑specific defaults:
    - **Local/dev**: `AiProvider="Mock"`, `AiEnabled=true` for convenience (no real key).
    - **Staging**: `AiProvider="OpenAI"`, `AiEnabled=false` initially; enable only for a test org via org AI settings.
    - **Production**: start with `AiProvider="Mock"`, then:
      - Switch to `OpenAI` for allowlisted orgs using rollout flags in `PlatformSettings`.
      - Monitor usage, performance, and error rates.
- **Test**
  - Practice:
    - Flipping provider from `Mock` → `OpenAI` and back in staging.
    - Engaging the kill switch and verifying AI endpoints return safe, clear errors.

---

## 9. Documentation & Runbooks

### 9.1 Update AI docs

- **Implement**
  - Update `/docs/AI.md` with:
    - Supported providers and how to configure them.
    - Required env vars for each provider (no secrets in the repo).
    - Safety rules, redaction strategy, and kill‑switch behaviour.
  - Update `/docs/API.md` with:
    - Any provider‑specific fields added to AI responses (e.g. `provider`, `model`, `confidence`).

### 9.2 Incident runbook

- **Implement**
  - Add a short runbook (e.g. `/docs/AI_RUNBOOK.md`) that covers:
    - How to:
      - Toggle `AiProvider` back to `Mock`.
      - Toggle `AiKillSwitch` on.
      - Inspect recent `ai_invocations` and logs for failures.
    - Who to notify and what to check (usage caps, provider status pages).
- **Test**
  - Have a team member follow the runbook in a staging environment to:
    - Simulate an incident (force errors in the client).
    - Kill switch AI.
    - Restore service using the documented steps.

