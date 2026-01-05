# MaintainUK: AI Capabilities & Guardrails

## Overview

MaintainUK uses AI to assist (not replace) humans in property maintenance workflows. Every AI capability follows strict safety guardrails with **human-in-loop** for high-impact actions.

## Core Principles

1. **AI assists, humans decide** - No auto-execution of financial or communication actions
2. **Fail closed** - Invalid AI output is rejected, not silently accepted
3. **Audit everything** - Every AI request and response is logged
4. **Redact sensitive data** - PII never sent to AI providers
5. **Schema validation** - All outputs must conform to strict JSON schemas
6. **Transparency** - Users know when AI is involved

## Hard Safety Rules (Non-Negotiable)

| Rule | Rationale |
|------|-----------|
| ❌ AI MUST NOT send email/SMS/WhatsApp without explicit human click | Prevents spam, maintains accountability |
| ❌ AI MUST NOT approve quotes or invoices | Prevents unauthorized spend |
| ❌ AI MUST NOT pay invoices or commit spend | Financial controls |
| ❌ AI MUST NOT auto-assign contractors | Human judgment required for relationship management |
| ✅ AI outputs MUST validate against JSON schemas (fail closed) | Prevents hallucinations from causing bugs |
| ✅ Sensitive data MUST be redacted before AI processing | Privacy and security |
| ✅ All AI requests/responses MUST be audit-logged | Compliance and debugging |
| ✅ `requiresHumanApproval: true` MUST be enforced in UI | Explicit confirmation for drafts |

## AI Provider Architecture

### Abstraction Layer

```csharp
public interface IAiProvider
{
    Task<AiResponse> CallAsync(AiRequest request, CancellationToken ct);
    bool IsAvailable();
}

public class OpenAiProvider : IAiProvider { ... }
public class MockAiProvider : IAiProvider { ... }
```

**Configuration**:
```json
{
  "Ai": {
    "Provider": "OpenAI",
    "OpenAI": {
      "ApiKey": "sk-...",
      "Model": "gpt-4-turbo",
      "Temperature": 0.2,
      "MaxTokens": 2000
    },
    "FallbackToMock": true
  }
}
```

### Request Flow

```
1. User triggers AI capability (e.g., "AI Triage")
2. API creates AiJob entity (status=PENDING)
3. API redacts sensitive data from input
4. API creates OutboxMessage (type=ai-job)
5. API returns 202 Accepted with aiJobId
6. BullMQ processor picks up job
7. Processor calls AI provider with redacted input
8. Processor validates response against JSON schema
9. If valid: writes to AiJob.OutputJson, status=COMPLETED
10. If invalid: writes error, status=FAILED, schedules retry
11. Frontend polls /ai-jobs/:id for result
12. Frontend displays output (editable if requiresHumanApproval=true)
13. User confirms and applies changes
```

## Staff AI Capabilities

### 1. Ticket Intake & Triage

**Endpoint**: `POST /ai/intake`

**Input**:
```json
{
  "ticketId": "uuid",
  "description": "Kitchen sink leaking near electrical socket, water pooling on floor",
  "attachments": []
}
```

**AI Prompt** (simplified):
```
You are a property maintenance triage specialist.
Classify this maintenance issue:

Description: {{description}}

Return JSON:
{
  "category": "PLUMBING|ELECTRICAL|HEATING|GENERAL|STRUCTURAL|PEST|APPLIANCE|SECURITY",
  "priority": "EMERGENCY|URGENT|ROUTINE|PLANNED",
  "safetyFlags": ["GAS_LEAK", "FLOODING", "ELECTRICAL_HAZARD", "STRUCTURAL_DAMAGE", ...],
  "missingInfo": ["Photo of leak source", "Tenant availability", ...],
  "summary": "Brief summary for coordinator"
}

Priority rules:
- EMERGENCY: Gas leak, flooding with electrical risk, fire, no heating in winter, security breach
- URGENT: Major leak, no hot water, heating failure (non-winter), broken lock
- ROUTINE: Minor repairs, cosmetic issues
```

**Output Schema** (`/packages/shared/schemas/ai/intake-output.schema.json`):
```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "required": ["schemaVersion", "category", "priority", "summary"],
  "properties": {
    "schemaVersion": { "const": "1.0" },
    "category": {
      "enum": ["PLUMBING", "ELECTRICAL", "HEATING", "GENERAL", "STRUCTURAL", "PEST", "APPLIANCE", "SECURITY"]
    },
    "priority": {
      "enum": ["EMERGENCY", "URGENT", "ROUTINE", "PLANNED"]
    },
    "safetyFlags": {
      "type": "array",
      "items": { "type": "string" }
    },
    "missingInfo": {
      "type": "array",
      "items": { "type": "string" }
    },
    "summary": {
      "type": "string",
      "maxLength": 500
    }
  }
}
```

**Emergency Override** (deterministic, no AI):
```typescript
function applyEmergencyOverride(description: string): Priority | null {
  const lowerDesc = description.toLowerCase();

  if (lowerDesc.match(/\b(gas leak|smell gas|smell of gas)\b/)) {
    return "EMERGENCY";
  }

  if (lowerDesc.match(/\b(fire|smoke|flames)\b/)) {
    return "EMERGENCY";
  }

  if (lowerDesc.match(/\b(flooding|flooded|water everywhere)\b/) &&
      lowerDesc.match(/\b(electric|electrical|socket|fuse|wiring)\b/)) {
    return "EMERGENCY";
  }

  return null; // Let AI decide
}
```

### 2. Timeline Summarisation

**Endpoint**: `POST /ai/summarise`

**Input**:
```json
{
  "ticketId": "uuid",
  "timelineEvents": [
    { "eventType": "TICKET_CREATED", "timestamp": "...", "data": {...} },
    { "eventType": "CONTRACTOR_ASSIGNED", "timestamp": "...", "data": {...} },
    { "eventType": "QUOTE_SUBMITTED", "timestamp": "...", "data": {...} }
  ]
}
```

**Output**:
```json
{
  "schemaVersion": "1.0",
  "whatHappened": "Tenant reported kitchen sink leak. ABC Plumbing assigned and submitted quote for £210.",
  "lastUpdate": "Quote submitted 2 hours ago, awaiting approval",
  "nextAction": "Review and approve/reject quote",
  "risks": ["Delay could increase water damage"],
  "blockers": []
}
```

### 3. Message Drafting

**Endpoint**: `POST /ai/draft-message`

**Input**:
```json
{
  "ticketId": "uuid",
  "recipient": "TENANT",
  "channel": "PORTAL",
  "intent": "REQUEST_PHOTOS",
  "context": {
    "ticketTitle": "Leak under kitchen sink",
    "category": "PLUMBING"
  }
}
```

**Output**:
```json
{
  "schemaVersion": "1.0",
  "requiresHumanSend": true,
  "channel": "PORTAL",
  "subject": "Additional photos needed for your repair request",
  "body": "Hi,\n\nThank you for reporting the kitchen sink leak. To help our contractor assess the issue accurately, could you please provide:\n\n1. A photo of the area under the sink showing the leak source\n2. A photo of any water damage to surrounding areas\n\nThis will help us schedule the repair more efficiently.\n\nBest regards,\nMaintenance Team",
  "tone": "professional_friendly"
}
```

**Channel-Aware Drafting**:
- **Portal**: Detailed (200-500 words), professional
- **SMS**: Short (160 chars), no PII, clear call-to-action
- **WhatsApp**: Conversational (100-300 words), emoji-friendly, photo-friendly

**SMS Example**:
```json
{
  "channel": "SMS",
  "body": "Your sink repair is scheduled for Thu 2 Jan at 9am. Contractor will use keysafe. Reply YES to confirm.",
  "charCount": 117
}
```

### 4. Contractor Assignment Suggestions

**Endpoint**: `POST /ai/suggest-contractors`

**Input**:
```json
{
  "ticketId": "uuid",
  "category": "PLUMBING",
  "priority": "URGENT",
  "location": "London SW1",
  "availableContractors": [
    {
      "id": "uuid1",
      "name": "ABC Plumbing",
      "rating": 4.8,
      "completionRate": 0.95,
      "avgResponseTime": 2.5,
      "recentJobs": 45,
      "specialties": ["PLUMBING"],
      "availability": "Mon-Fri 9am-5pm"
    }
  ]
}
```

**Output**:
```json
{
  "schemaVersion": "1.0",
  "suggestions": [
    {
      "contractorId": "uuid1",
      "rank": 1,
      "score": 0.92,
      "reason": "High rating (4.8/5), excellent completion rate (95%), fast response time (2.5 hours avg)",
      "constraints": ["Available Mon-Fri only", "No weekend coverage"],
      "estimatedAvailability": "Within 24 hours"
    }
  ],
  "requiresHumanApproval": true
}
```

### 5. Duplicate Issue Detection

**Endpoint**: `POST /ai/detect-duplicates`

**Input**:
```json
{
  "ticketId": "uuid",
  "description": "Boiler not working, no heating",
  "propertyId": "uuid",
  "recentTickets": [
    {
      "id": "uuid2",
      "title": "No hot water in flat 3A",
      "description": "Boiler issue",
      "status": "OPEN",
      "createdAt": "2025-12-30T10:00:00Z"
    }
  ]
}
```

**Output**:
```json
{
  "schemaVersion": "1.0",
  "duplicates": [
    {
      "ticketId": "uuid2",
      "similarity": 0.85,
      "reason": "Both tickets report boiler issues in same property, likely same root cause",
      "recommendation": "Link tickets and diagnose together to save contractor visit"
    }
  ]
}
```

### 6. SLA & Risk Prediction

**Endpoint**: `POST /ai/predict-risk`

**Input**:
```json
{
  "ticketId": "uuid",
  "priority": "URGENT",
  "slaDueAt": "2026-01-03T10:00:00Z",
  "currentStatus": "ASSIGNED",
  "assignedAt": "2025-12-31T10:00:00Z",
  "historicalData": {
    "avgResolutionTime": 48,
    "contractorAvgResponseTime": 3
  }
}
```

**Output**:
```json
{
  "schemaVersion": "1.0",
  "riskLevel": "MEDIUM",
  "breachProbability": 0.35,
  "explanation": "Contractor typically responds within 3 hours. With 72 hours until SLA deadline and typical 48-hour resolution time, moderate risk of breach if complications arise.",
  "recommendations": [
    "Follow up with contractor within 24 hours",
    "Prepare backup contractor if needed"
  ]
}
```

### 7. Invoice & Cost Review

**Endpoint**: `POST /ai/extract-invoice`

**Input**:
```json
{
  "invoiceFileKey": "s3-key-to-pdf",
  "quoteId": "uuid",
  "approvedQuoteTotal": 210.00
}
```

**AI Process**:
1. OCR extracts text from PDF/image
2. AI parses structured data (invoice number, line items, totals)
3. AI compares to approved quote
4. AI flags anomalies

**Output**:
```json
{
  "schemaVersion": "1.0",
  "invoiceNumber": "INV-2025-001",
  "invoiceDate": "2026-01-05",
  "dueDate": "2026-02-04",
  "lineItems": [
    {
      "description": "Sink repair - parts",
      "quantity": 1,
      "unitPriceGBP": 45.00,
      "totalGBP": 45.00
    },
    {
      "description": "Labour (2 hours)",
      "quantity": 2,
      "unitPriceGBP": 65.00,
      "totalGBP": 130.00
    }
  ],
  "subtotalGBP": 175.00,
  "vatGBP": 35.00,
  "totalGBP": 210.00,
  "anomalies": [
    {
      "type": "TOTAL_MATCHES_QUOTE",
      "severity": "INFO",
      "description": "Invoice total matches approved quote (£210.00)"
    }
  ]
}
```

**Anomaly Types**:
- `TOTAL_EXCEEDS_QUOTE` (HIGH): Invoice > approved quote
- `VAT_MISMATCH` (MEDIUM): VAT calculation incorrect
- `DUPLICATE_INVOICE_NUMBER` (HIGH): Invoice number already exists
- `MISSING_LINE_ITEMS` (MEDIUM): Quote items not on invoice
- `EXTRA_LINE_ITEMS` (MEDIUM): Invoice items not on quote

### 8. Compliance Support

**Endpoint**: `POST /ai/explain-compliance`

**Input**:
```json
{
  "complianceType": "GAS_SAFETY",
  "audience": "TENANT"
}
```

**Output**:
```json
{
  "schemaVersion": "1.0",
  "plainEnglishExplanation": "A Gas Safety Certificate confirms that all gas appliances in your home have been checked by a qualified engineer and are safe to use. Your landlord must arrange this inspection every 12 months.",
  "requiredDocuments": [
    "Gas Safety Certificate (CP12)",
    "Engineer's Gas Safe ID"
  ],
  "frequency": "Annual",
  "legalBasis": "Gas Safety (Installation and Use) Regulations 1998",
  "consequences": "Without this certificate, gas appliances may be unsafe and your landlord could face penalties.",
  "nextSteps": [
    "Your landlord will contact you to arrange an inspection",
    "Please provide access on the scheduled date",
    "You'll receive a copy of the certificate within 28 days"
  ]
}
```

### 9. Reporting & Insights

**Endpoint**: `POST /ai/generate-insights`

**Input**:
```json
{
  "orgId": "uuid",
  "period": "WEEKLY",
  "startDate": "2025-12-24",
  "endDate": "2025-12-31",
  "metrics": {
    "ticketsCreated": 45,
    "ticketsClosed": 38,
    "avgResolutionTime": 52,
    "totalSpend": 8450.00,
    "contractorPerformance": [...]
  }
}
```

**Output**:
```json
{
  "schemaVersion": "1.0",
  "executiveSummary": "This week saw a 20% increase in tickets compared to last week, primarily due to cold weather-related heating issues. Resolution time improved by 10% thanks to faster contractor response. Total spend was within budget.",
  "spendHighlights": [
    "Heating repairs accounted for 45% of spend (£3,800)",
    "Three invoices exceeded quotes by >10% (flagged for review)"
  ],
  "contractorPerformance": [
    {
      "contractorName": "ABC Plumbing",
      "jobsCompleted": 8,
      "avgRating": 4.9,
      "insight": "Top performer this week with excellent tenant feedback"
    }
  ],
  "recommendations": [
    "Consider preventive boiler maintenance before winter peak",
    "Review contractors with quote overruns"
  ]
}
```

## Tenant Portal AI

### 10. Guided Issue Reporting (Intake Wizard)

**Endpoint**: `POST /ai/tenant/guided-intake`

**Flow**:
1. Tenant selects category (or AI detects from description)
2. AI asks 3-8 targeted questions based on category
3. AI requests specific photos/videos
4. AI produces triage output
5. Emergency override applied if needed
6. Ticket created with AI-structured data

**Example - Heating Issue**:
```
Q1: When did you last have heating?
Q2: Is the boiler showing any error codes? (Photo of display requested)
Q3: Can you hear the boiler trying to start?
Q4: What temperature is it inside? (Under 16°C triggers URGENT)
Q5: Are you vulnerable (elderly, children, health conditions)?
```

**Output**:
```json
{
  "schemaVersion": "1.0",
  "category": "HEATING",
  "priority": "URGENT",
  "structuredResponses": {
    "lastHeating": "Yesterday evening",
    "errorCode": "F28 (from photo)",
    "boilerAttemptingStart": true,
    "indoorTemp": 14,
    "vulnerableOccupants": true
  },
  "recommendedPhotos": ["Boiler display", "Thermostat setting"],
  "safetyAdvice": "If temperature drops below 10°C, consider temporary accommodation. Do not use portable gas heaters indoors."
}
```

### 11. Status Explanations

**Endpoint**: `POST /ai/tenant/explain-status`

**Input**:
```json
{
  "ticketId": "uuid",
  "status": "AWAITING_QUOTE_APPROVAL",
  "timeline": [...]
}
```

**Output**:
```json
{
  "schemaVersion": "1.0",
  "explanation": "Your repair has been assessed by a contractor who has provided a quote for the work. Our team is currently reviewing this quote to ensure it's reasonable. Once approved, we'll schedule the repair with you.",
  "estimatedNextUpdate": "Within 24 hours",
  "whatYouCanDo": "No action needed from you at this time. We'll be in touch once the quote is approved."
}
```

## Contractor Portal AI

### 12. Job Understanding Summary

**Endpoint**: `POST /ai/contractor/job-summary`

**Output**:
```json
{
  "schemaVersion": "1.0",
  "scope": "Repair leak under kitchen sink. Replace damaged P-trap and check for additional pipe corrosion.",
  "accessInstructions": "Use keysafe code to enter (provided separately). Tenant will not be home. Property is first floor flat.",
  "requiredEvidence": [
    "Photo of damaged pipe before repair",
    "Photo of completed repair",
    "Photo of any additional issues found"
  ],
  "estimatedDuration": "1-2 hours",
  "specialConsiderations": ["Water shutoff required", "Protect floor from water damage"]
}
```

### 13. Quote Structure Assistance

**Endpoint**: `POST /ai/contractor/quote-assist`

**Input**:
```json
{
  "workOrderId": "uuid",
  "category": "PLUMBING",
  "description": "Repair leak under kitchen sink"
}
```

**Output** (suggestions only, NO pricing):
```json
{
  "schemaVersion": "1.0",
  "suggestedLineItems": [
    {
      "category": "PARTS",
      "description": "Replacement P-trap pipe",
      "note": "Specify size and material"
    },
    {
      "category": "LABOUR",
      "description": "Labour time",
      "note": "Specify hours"
    },
    {
      "category": "MATERIALS",
      "description": "Sealant, fittings",
      "note": "List consumables used"
    }
  ],
  "completenessChecks": [
    "Have you included all parts required?",
    "Have you accounted for travel time if applicable?",
    "Is VAT calculated correctly at 20%?"
  ]
}
```

## Redaction Rules

### Data to Redact Before AI Processing

| Data Type | Pattern | Replacement |
|-----------|---------|-------------|
| Keysafe codes | `\b\d{4,6}\b` | `[REDACTED_ACCESS_CODE]` |
| Bank account numbers | `\b\d{8}\b` | `[REDACTED_BANK]` |
| Sort codes | `\b\d{2}-\d{2}-\d{2}\b` | `[REDACTED_SORT_CODE]` |
| National Insurance | `[A-Z]{2}\d{6}[A-Z]` | `[REDACTED_NI]` |
| Passport numbers | `\b\d{9}\b` | `[REDACTED_ID]` |
| Credit card numbers | `\b\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b` | `[REDACTED_CARD]` |
| Full addresses | Specific regex | `[ADDRESS - postcode area only]` |

**Audit Log**:
```json
{
  "action": "ai:redaction",
  "timestamp": "2025-12-31T10:00:00Z",
  "redactedFields": ["keysafe_code", "bank_account"],
  "inputHash": "sha256-hash-of-original"
}
```

## Testing & Evaluation

### Unit Tests

Test each AI capability with:
- Valid input → expected output structure
- Invalid AI response → schema validation fails
- Sensitive data → redaction applied

### Integration Tests

- End-to-end flow: API → BullMQ → AI provider → result
- Polling mechanism works
- Audit logs created

### AI Output Evaluation

**Metrics**:
- **Accuracy**: Does AI classification match human expert?
- **Hallucination Rate**: How often does AI invent facts?
- **Schema Compliance**: % of outputs that pass validation
- **Latency**: p50, p95, p99 response times

**Evaluation Dataset**:
- 100 labeled tickets (human-classified)
- Run AI triage on each
- Compare AI output to labels
- Target: >90% accuracy on category, >85% on priority

### A/B Testing

- 50% of users see AI suggestions
- 50% see manual flow
- Measure: time to complete, user satisfaction, accuracy

## Monitoring & Alerts

**Metrics to Track**:
- AI request rate (req/min)
- AI success rate (%)
- AI latency (p50, p95, p99)
- Schema validation failure rate (%)
- Cost per AI request (£)

**Alerts**:
- Schema validation failure rate > 5% (indicates AI degradation)
- AI latency > 30s (indicates provider issues)
- Cost spike > 2x baseline (indicates abuse or bug)

---

**Last Updated**: 2025-12-31
**Schema Version**: 1.0
**Evaluation Dataset**: v1 (100 samples)

