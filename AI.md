You are a senior full-stack engineer working in my repo. Build an MCP-based, READ-ONLY AI interface for my PROPERTY MAINTENANCE system.

Stack + rules:
- Frontend: Angular (latest), standalone, signals-first, best practices.
- Backend: .NET (C#) Web API (existing). PostgreSQL.
- I use Cursor IDE. Produce code, not theory.
- The AI layer MUST be READ-ONLY. No state changes, no “mark as read”, no “refresh status” side effects.
- Enforce strict org/role scoping and prevent data leakage.
- Keep deliverables small and shippable. Start with 10–15 read tools/resources max.

========================================================
0) GOAL
========================================================
Create an "AI Tool Gateway" service that exposes MCP Resources + read-only Tools over HTTP, backed by my existing .NET APIs, to support AI queries such as:
- “Summarise open work orders for Org X”
- “What’s overdue this week?”
- “Show pending quotes and risks”
- “Summarise tenant comms for ticket 123”
- “Draft a response” (draft only; never send)

========================================================
1) DELIVERABLES (create/update these files)
========================================================
/docs/ASSUMPTIONS.md
/docs/AI_READ_ONLY_GUARDRAILS.md
/docs/MCP_GATEWAY_API.md
/docs/SECURITY_AND_PRIVACY.md
/docs/TOOL_CATALOG.md

Backend service folder (new):
/src/AiToolGateway/ (or /services/AiToolGateway/ if that matches repo conventions)
  AiToolGateway.csproj
  Program.cs
  appsettings.json
  appsettings.Development.json
  /Controllers
  /Mcp
  /Auth
  /Policies
  /Audit
  /Clients
  /Models
  /Filters
  /Tests

Database (new tables/migrations):
- audit_tool_access
- optional: ai_saved_views (read-only saved filters; no writes from AI)

========================================================
2) MCP IMPLEMENTATION REQUIREMENTS
========================================================
Implement an MCP server compatible interface with:
- Tools (read-only): list/search/get style operations only
- Resources: structured read access to core entities with stable URIs
- Prompts (optional): “daily ops brief”, “work order summary”, “risk review”

Expose endpoints:
- GET  /mcp (server info/capabilities)
- GET  /mcp/tools
- POST /mcp/tools/{toolName}       (execution; must be read-only)
- GET  /mcp/resources
- GET  /mcp/resources/{resourceUri}
- GET  /mcp/prompts (optional)
- POST /mcp/prompts/{promptName}  (optional; returns a prompt template + required params)

NOTE: If MCP spec requires a different path/shape, follow the current official spec. Document any differences in /docs/MCP_GATEWAY_API.md.

========================================================
3) READ-ONLY GUARANTEE (HARD REQUIREMENT)
========================================================
Implement a “ReadOnlyGuard” that blocks ANY potential state change:
- Block all outbound HTTP methods except GET/HEAD to internal APIs
- If you must call POST to an internal “search” endpoint, wrap it in a dedicated allowlist with:
  - proof it has no side effects
  - idempotency proof
  - explicit allowlist entry in code + docs
- Block any route in this gateway that is not GET for resources/tools, except tool execution endpoint itself
- For tool execution, validate that tool metadata is read-only and enforce it at runtime
- Add tests that prove the guard works (attempted write calls must fail)

Create /docs/AI_READ_ONLY_GUARDRAILS.md describing:
- rules
- allowed methods
- allowlist process
- test cases

========================================================
4) AUTH, ORG SCOPING, AND PRIVACY
========================================================
Auth:
- Use JWT bearer auth (integrate with existing auth if present)
- Extract: userId, orgId, role
- Enforce: every tool/resource call is scoped to orgId unless super-admin

Privacy:
- Field-level filtering for tenant PII and sensitive notes:
  - tenant phone/email/address (mask by default unless role allows)
  - payment details (never expose)
  - internal-only notes (role-gated)
- Add “data classification” constants and a response filter layer.

Audit:
- Write audit row for every resource/tool access:
  - timestamp, userId, orgId, role, tool/resource, params hash, success/fail, latency
- Add correlationId to logs + audit table.

Create /docs/SECURITY_AND_PRIVACY.md.

========================================================
5) INITIAL TOOL CATALOG (10–12 READ TOOLS)
========================================================
Implement these tools (names stable, JSON schema explicit):

1) search_work_orders
   Inputs: orgId(optional if from token), queryText, status[], priority[], propertyId?, dateFrom?, dateTo?, limit, offset
   Output: list summary rows

2) get_work_order_details
   Inputs: orgId?, workOrderId
   Output: full details (role-filtered fields)

3) list_overdue_work_orders
   Inputs: orgId?, asOfDate?, limit
   Output: list + reason overdue

4) list_pending_quotes
   Inputs: orgId?, propertyId?, limit, offset
   Output: quote summaries + linked work orders

5) get_property_summary
   Inputs: orgId?, propertyId
   Output: key property info + counts (open tickets, overdue, upcoming)

6) get_asset_warranty_info
   Inputs: orgId?, assetId OR propertyId
   Output: warranties/serials (mask sensitive fields)

7) get_contractor_profile
   Inputs: orgId?, contractorId
   Output: profile + KPIs (on-time %, disputes count)

8) get_tenant_comms_history
   Inputs: orgId?, tenantId OR workOrderId, dateFrom?, dateTo?, limit
   Output: message summaries (mask PII)

9) get_sla_status
   Inputs: orgId?, propertyId? workOrderId?
   Output: SLA timers + breached flags

10) daily_ops_brief
   Inputs: orgId?, date
   Output: a structured brief object (not plain text):
     - today counts
     - overdue list
     - pending quotes
     - risks

11) search_invoices_readonly (if invoices exist)
   Inputs: orgId?, status[], dateFrom?, dateTo?, limit
   Output: summary only; no payment details

12) system_health_readonly
   Inputs: none
   Output: gateway health + downstream dependency statuses (no secrets)

Put tool schemas and examples in /docs/TOOL_CATALOG.md.

========================================================
6) RESOURCES (READ CONTEXT)
========================================================
Expose MCP resources with stable URIs, examples:
- property://{orgId}/{propertyId}
- workorder://{orgId}/{workOrderId}
- tenant://{orgId}/{tenantId}
- contractor://{orgId}/{contractorId}
- asset://{orgId}/{assetId}
- ops://{orgId}/daily-brief/{yyyy-mm-dd}

Resources must:
- enforce org scoping + role filtering
- return structured JSON
- support pagination where needed

Document in /docs/MCP_GATEWAY_API.md.

========================================================
7) DOWNSTREAM API CLIENTS
========================================================
Implement typed HTTP clients in /Clients that call existing .NET services:
- WorkOrdersClient
- PropertiesClient
- TenantsClient
- ContractorsClient
- AssetsClient
- BillingClient (read-only)

Requirements:
- All outbound calls pass through ReadOnlyGuard
- Timeouts, retries (safe), circuit breaker (optional)
- Never log secrets or PII

========================================================
8) TESTS (REQUIRED)
========================================================
Add unit + integration tests:
- ReadOnlyGuard blocks PUT/PATCH/DELETE always
- ReadOnlyGuard blocks POST by default
- Allowed POST (if any) must be explicitly allowlisted and tested
- Org scoping: user from Org A cannot access Org B
- Role filtering: tenant PII masked for roles that lack access
- Audit row created on every request (success and failure)

========================================================
9) ANGULAR (OPTIONAL MINIMAL UI)
========================================================
If time permits, add a minimal Angular admin-only screen:
- “AI Insights” page
- lets user pick: daily ops brief / overdue / pending quotes
- calls the gateway read-only endpoints
- shows results in tables
- no chat UI required

========================================================
10) OUTPUT EXPECTATIONS
========================================================
- Create the folder/files listed above.
- Provide runnable code.
- Add clear README steps to run locally.
- Log assumptions in /docs/ASSUMPTIONS.md.
- Keep the scope tight and focused on read-only AI enablement for PROPERTY MAINTENANCE.
