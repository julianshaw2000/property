# MaintainUK: Security Model

## Overview

MaintainUK implements defense-in-depth security with multiple layers of protection. This document outlines security controls, threat models, and incident response procedures.

## Security Principles

1. **Least Privilege**: Users have minimum permissions required
2. **Defense in Depth**: Multiple security layers
3. **Fail Secure**: Errors default to deny
4. **Audit Everything**: Comprehensive logging
5. **Zero Trust**: Verify every request
6. **Encryption**: Protect data at rest and in transit

## Authentication

### Password Requirements

- **Minimum length**: 8 characters
- **Complexity**: 1 uppercase, 1 lowercase, 1 number, 1 special character
- **Hashing**: Argon2id or BCrypt (cost factor 12)
- **Storage**: Never plain text, salted hash only
- **Rotation**: Optional (user-initiated)

### JWT Tokens

**Access Token**:
- Expiry: 15 minutes
- Algorithm: RS256 (RSA + SHA-256)
- Claims: userId, email, orgId, role, permissions
- Storage: Client-side (localStorage or httpOnly cookie)

**Refresh Token**:
- Expiry: 7 days
- Stored: Database (hashed)
- Rotation: New token issued on refresh
- Revocation: Immediate (delete from DB)

**Token Security**:
- HTTPS only (TLS 1.3)
- Short expiry limits blast radius
- Refresh tokens can be revoked instantly
- No sensitive data in JWT payload (orgId is acceptable)

### Multi-Factor Authentication (Future)

- Time-based OTP (TOTP) via authenticator app
- SMS backup codes
- Recovery codes (printed)

### Session Management

- Session timeout: 15 minutes inactivity
- Concurrent sessions: Allowed (track in DB for audit)
- Force logout: Admin can revoke all sessions for user

### Password Reset

1. User requests reset via email
2. API generates secure token (32 bytes random)
3. Token stored hashed in DB with 1-hour expiry
4. Email sent with reset link
5. User submits new password with token
6. API validates token, updates password, invalidates token
7. All existing sessions terminated

## Authorization

### Role-Based Access Control (RBAC)

| Role | Description | Permissions |
|------|-------------|-------------|
| **SuperAdmin** | Platform admin (internal) | All permissions across all orgs |
| **OrgAdmin** | Organisation owner | All permissions within org |
| **Coordinator** | Property manager | Manage tickets, work orders, contractors, messaging |
| **Viewer** | Read-only staff | View tickets, properties, reports |
| **Contractor** | External service provider | View assigned jobs, submit quotes/invoices |
| **Tenant** | Property tenant | Report issues, view own tickets, message staff |

### Permission Model

Permissions follow format: `resource:action`

**Examples**:
- `tickets:read` - View tickets
- `tickets:create` - Create tickets
- `tickets:update` - Edit tickets
- `tickets:delete` - Delete tickets
- `workorders:assign` - Assign contractors
- `quotes:approve` - Approve quotes
- `invoices:approve` - Approve invoices
- `messages:send` - Send messages
- `ai:use` - Use AI capabilities
- `admin:users` - Manage users

### Multi-Tenancy Isolation

**OrgId Scoping**:
- Every entity has `OrgId` column
- JWT contains `orgId` claim
- EF Core global query filter: `WHERE OrgId = @CurrentOrgId`
- Applied automatically to all queries

**Enforcement**:
```csharp
protected override void OnModelCreating(ModelBuilder modelBuilder)
{
    foreach (var entityType in modelBuilder.Model.GetEntityTypes())
    {
        if (typeof(ITenantEntity).IsAssignableFrom(entityType.ClrType))
        {
            var parameter = Expression.Parameter(entityType.ClrType, "e");
            var property = Expression.Property(parameter, nameof(ITenantEntity.OrgId));
            var orgIdValue = Expression.Constant(_currentOrgId);
            var filter = Expression.Lambda(Expression.Equal(property, orgIdValue), parameter);

            entityType.SetQueryFilter(filter);
        }
    }
}
```

**Testing**:
- Integration tests verify cross-org queries return empty
- Penetration tests attempt org boundary violations

### Entity-Level Authorization

**Owner Checks**:
- Contractors can only edit own quotes/invoices
- Tenants can only view own tickets
- Implemented in Application layer before persistence

```csharp
public async Task<Result> ApproveQuote(Guid quoteId, Guid userId)
{
    var quote = await _context.Quotes.FindAsync(quoteId);
    if (quote == null) return Result.NotFound();

    // Multi-tenant check (automatic via query filter)
    // Owner check (explicit)
    if (!_currentUser.HasPermission("quotes:approve"))
        return Result.Forbidden();

    quote.Approve(userId);
    await _context.SaveChangesAsync();
    return Result.Success();
}
```

## Data Protection

### Encryption at Rest

**Database**:
- Postgres: Transparent Data Encryption (TDE) in production
- Sensitive columns encrypted: access codes, bank details, ID docs
- Encryption: AES-256-GCM
- Key management: AWS KMS or Azure Key Vault

**Encrypted Fields**:
```csharp
public class PropertyEntity
{
    public string Address { get; set; } // Plain text

    [Encrypted]
    public string KeysafeCode { get; set; } // Encrypted at application level

    [Encrypted]
    public string AlarmCode { get; set; }
}
```

**File Storage**:
- S3 bucket encryption enabled (SSE-S3 or SSE-KMS)
- Pre-signed URLs expire after 1 hour

### Encryption in Transit

- **TLS 1.3** enforced (TLS 1.2 minimum)
- **HSTS** enabled (Strict-Transport-Security header)
- **Certificate pinning** (optional, mobile apps)

### Data Redaction

**Before AI Processing**:
- Keysafe codes: `[REDACTED_ACCESS_CODE]`
- Bank account numbers: `[REDACTED_BANK]`
- ID document numbers: `[REDACTED_ID]`
- Full addresses: Redact unit number, keep postcode area

**Logging**:
- Never log passwords, tokens, or credit cards
- Mask PII in logs: `user@example.com` → `u***r@e***e.com`

### Data Retention

**Active Data**: Retained indefinitely (user-controlled deletion)

**Deleted Data**: Soft delete, purge after 90 days

**Audit Logs**: 7 years (UK tax law compliance)

**Backups**: 30 days retention

**GDPR Erasure**: Hard delete on explicit user request (right to erasure)

## AI Safety Guardrails

### Hard Safety Rules (Non-Negotiable)

1. ❌ **AI MUST NOT send email/SMS/WhatsApp** without explicit human click per message
2. ❌ **AI MUST NOT approve quotes** - coordinator approval required
3. ❌ **AI MUST NOT pay invoices** - human approval required
4. ❌ **AI MUST NOT commit spend** - all financial decisions human-approved
5. ✅ **AI outputs must validate against strict JSON schemas** (fail closed)
6. ✅ **Sensitive data must be redacted** before sending to AI
7. ✅ **All AI requests/responses must be audit-logged**
8. ✅ **Human-in-loop for all high-impact actions**

### Implementation

**Schema Validation**:
```typescript
const aiOutputSchema = z.object({
  schemaVersion: z.literal("1.0"),
  requiresHumanApproval: z.boolean(),
  category: z.enum(["PLUMBING", "ELECTRICAL", "HEATING", ...]),
  priority: z.enum(["EMERGENCY", "URGENT", "ROUTINE"]),
  safetyFlags: z.array(z.string()).optional(),
  summary: z.string().max(500)
});

// Validate output (fail closed)
const result = aiOutputSchema.safeParse(response);
if (!result.success) {
  await logError("AI schema validation failed", result.error);
  throw new Error("Invalid AI output");
}
```

**Redaction**:
```typescript
function redactSensitiveData(input: string): { redacted: string, log: string[] } {
  const log = [];
  let redacted = input;

  // Keysafe codes (4-6 digits)
  if (/\b\d{4,6}\b/.test(redacted)) {
    redacted = redacted.replace(/\b\d{4,6}\b/g, "[REDACTED_CODE]");
    log.push("Redacted access code");
  }

  // Bank account numbers (8 digits)
  if (/\b\d{8}\b/.test(redacted)) {
    redacted = redacted.replace(/\b\d{8}\b/g, "[REDACTED_BANK]");
    log.push("Redacted bank account");
  }

  return { redacted, log };
}
```

**Audit Trail**:
```csharp
public async Task<AiJobResult> ProcessAiJob(AiJob job)
{
    var auditEntry = new AuditLog
    {
        Action = "ai:request",
        EntityType = "AiJob",
        EntityId = job.Id,
        OldValueJson = JsonSerializer.Serialize(job.InputJson),
        Timestamp = DateTime.UtcNow,
        UserId = _currentUser.Id,
        OrgId = _currentUser.OrgId
    };

    var result = await _aiProvider.CallAsync(job);

    auditEntry.NewValueJson = JsonSerializer.Serialize(result.OutputJson);
    _context.AuditLogs.Add(auditEntry);
    await _context.SaveChangesAsync();

    return result;
}
```

### Emergency Override

**Deterministic Rules** (no AI involved):
- "gas smell" → EMERGENCY priority, no AI inference
- "flooding near electrics" → EMERGENCY priority
- "no heating" + winter months → URGENT priority
- "fire" / "smoke" → EMERGENCY priority

## API Security

### Rate Limiting

**Per IP Address**:
- General endpoints: 100 requests/minute
- Auth endpoints: 10 requests/minute
- AI endpoints: 20 requests/minute per org

**Implementation**: AspNetCoreRateLimit middleware

**Response**: 429 Too Many Requests
```json
{
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Too many requests. Please try again in 60 seconds."
  },
  "traceId": "abc123"
}
```

### CORS Policy

**Allowed Origins**:
- Production: `https://app.maintainuk.com`
- Staging: `https://staging.maintainuk.com`
- Development: `http://localhost:4200`

**Allowed Methods**: GET, POST, PUT, PATCH, DELETE, OPTIONS

**Allowed Headers**: Authorization, Content-Type, X-Trace-Id

**Credentials**: Allowed (cookies)

### CSRF Protection

- **SameSite cookies**: Strict or Lax
- **CSRF tokens**: Required for state-changing operations (optional with JWT-only auth)

### SQL Injection Prevention

- **Parameterized queries**: Always use EF Core or parameterized raw SQL
- **Never**: String concatenation for queries
- **ORM**: EF Core handles escaping

**Bad**:
```csharp
var tickets = _context.Tickets
    .FromSqlRaw($"SELECT * FROM Tickets WHERE Title = '{userInput}'") // VULNERABLE
    .ToList();
```

**Good**:
```csharp
var tickets = _context.Tickets
    .Where(t => t.Title.Contains(userInput)) // Safe (parameterized)
    .ToList();
```

### XSS Prevention

**Frontend**:
- Angular automatic HTML escaping
- DOMPurify for rich text (user-generated HTML)
- Content Security Policy (CSP)

**Backend**:
- Never return unsanitized user input in responses
- Encode HTML entities if needed

### Content Security Policy (CSP)

```
Content-Security-Policy:
  default-src 'self';
  script-src 'self' 'unsafe-inline' https://cdn.stripe.com;
  style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
  img-src 'self' data: https://*.s3.amazonaws.com;
  connect-src 'self' https://api.maintainuk.com;
  font-src 'self' https://fonts.gstatic.com;
```

### Security Headers

```
Strict-Transport-Security: max-age=31536000; includeSubDomains
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
X-XSS-Protection: 1; mode=block
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: geolocation=(), microphone=(), camera=()
```

## Input Validation

### Backend Validation (FluentValidation)

```csharp
public class CreateTicketRequestValidator : AbstractValidator<CreateTicketRequest>
{
    public CreateTicketRequestValidator()
    {
        RuleFor(x => x.Title)
            .NotEmpty().WithMessage("Title is required")
            .MaximumLength(200).WithMessage("Title too long");

        RuleFor(x => x.Priority)
            .IsInEnum().WithMessage("Invalid priority");

        RuleFor(x => x.Description)
            .MaximumLength(5000).WithMessage("Description too long");
    }
}
```

### Frontend Validation (Reactive Forms)

```typescript
this.ticketForm = this.fb.group({
  title: ['', [Validators.required, Validators.maxLength(200)]],
  priority: ['ROUTINE', [Validators.required]],
  description: ['', [Validators.maxLength(5000)]]
});
```

### File Upload Validation

- **Max size**: 50 MB
- **Allowed types**: PDF, PNG, JPG, HEIC, MP4
- **Virus scanning**: ClamAV or external service
- **Content-Type validation**: Check magic bytes, not just extension

## Messaging Security

### SMS/WhatsApp

**Consent Required**:
- Explicit opt-in before sending
- Opt-out keywords respected (STOP, UNSUBSCRIBE)
- Consent record stored with timestamp and IP

**Content Restrictions**:
- No PII in SMS (opt-out users can screenshot)
- No financial details
- No access codes

**Template Approval**:
- WhatsApp marketing messages require pre-approved templates
- Transactional messages allowed without approval

### Email

**SPF/DKIM/DMARC**:
- SPF record published
- DKIM signing enabled
- DMARC policy: quarantine or reject

**Unsubscribe**:
- One-click unsubscribe link in all marketing emails
- List-Unsubscribe header

**Bounce Handling**:
- Webhooks update contact validity
- Hard bounces → mark email invalid
- Soft bounces → retry 3 times, then mark invalid

## Compliance

### GDPR (General Data Protection Regulation)

**Data Subject Rights**:
- **Right to access**: Export all user data (JSON format)
- **Right to rectification**: Edit personal information
- **Right to erasure**: Hard delete on request (with exceptions for legal obligations)
- **Right to data portability**: Export in machine-readable format
- **Right to object**: Opt-out of marketing

**Implementation**:
```
GET /api/v1/users/me/data-export
→ Returns ZIP with all user data

DELETE /api/v1/users/me
→ Soft deletes immediately, hard deletes after 90 days (or immediately on explicit request)
```

**Data Processing Agreement**: Required for all processors (email, SMS, AI providers)

**Breach Notification**: 72 hours to ICO, immediate to affected users

### UK Data Protection Act 2018

- Aligns with GDPR
- Additional protections for UK citizens
- ICO (Information Commissioner's Office) oversight

### Accessibility (WCAG AA)

- Keyboard navigation
- Screen reader support
- Color contrast ratios
- ARIA labels

### Housing Compliance

See [UK_COMPLIANCE.md](./UK_COMPLIANCE.md) for details.

## Incident Response

### Detection

**Monitoring**:
- Failed login attempts (>5 in 15 min)
- Unusual API activity (rate spikes)
- Error rate spikes
- Database connection failures
- AI output schema validation failures

**Alerts**:
- PagerDuty for critical (24/7)
- Email for warnings

### Response Procedure

1. **Detect**: Monitoring alert or user report
2. **Assess**: Severity (Critical / High / Medium / Low)
3. **Contain**: Isolate affected systems, revoke compromised tokens
4. **Investigate**: Review logs, identify root cause
5. **Remediate**: Patch vulnerability, restore service
6. **Communicate**: Notify affected users (GDPR 72h), public disclosure if needed
7. **Post-mortem**: Document incident, update runbook

### Breach Notification

**GDPR Requirements**:
- Notify ICO within 72 hours
- Notify affected users without undue delay
- Document breach details (date, data affected, actions taken)

**Template Email**:
```
Subject: Important Security Notice - MaintainUK Data Breach

Dear [User],

We are writing to inform you of a data security incident that may have affected your account.

What happened: [Brief description]
What data was affected: [Specific data types]
What we're doing: [Actions taken]
What you should do: [Recommendations]

For questions, contact security@maintainuk.com.

Sincerely,
MaintainUK Security Team
```

## Security Testing

### Automated Testing

- **SAST** (Static Analysis): SonarQube, Semgrep
- **DAST** (Dynamic Analysis): OWASP ZAP
- **Dependency Scanning**: Snyk, Dependabot
- **Secret Scanning**: GitGuardian, TruffleHog

### Manual Testing

- **Penetration Testing**: Annual external audit
- **Code Review**: Security-focused PR reviews
- **Threat Modeling**: Quarterly review of architecture changes

### Vulnerability Management

**Process**:
1. Scan dependencies weekly (Snyk)
2. Triage findings (Critical / High / Medium / Low)
3. Patch Critical/High within 7 days
4. Patch Medium within 30 days
5. Document exceptions (with risk acceptance)

## Secrets Management

### Environment Variables

**Development**: `.env` file (git-ignored)

**Production**: Secret store (AWS Secrets Manager, Azure Key Vault, K8s Secrets)

### Never Commit

- ❌ API keys
- ❌ Database passwords
- ❌ Encryption keys
- ❌ JWT signing keys
- ❌ OAuth secrets

### Rotation Policy

- Database passwords: Every 90 days
- API keys: Every 180 days
- JWT signing keys: Every 365 days
- Encryption keys: As needed (with re-encryption migration)

## Security Checklist (Pre-Deployment)

- [ ] All dependencies up to date (no known vulnerabilities)
- [ ] HTTPS enforced (HSTS enabled)
- [ ] JWT secret is strong (256-bit random)
- [ ] Database passwords rotated
- [ ] CORS origins restricted to production domain
- [ ] Rate limiting enabled
- [ ] Security headers configured
- [ ] CSP policy defined
- [ ] SQL injection testing passed
- [ ] XSS testing passed
- [ ] Authentication flow tested (including edge cases)
- [ ] Multi-tenancy isolation tested
- [ ] AI safety guardrails tested
- [ ] Audit logging verified
- [ ] Backup and restore tested
- [ ] Incident response plan documented
- [ ] Security contact published (security.txt)

---

**Last Updated**: 2025-12-31
**Next Security Review**: 2026-03-31
**Security Contact**: security@maintainuk.com

