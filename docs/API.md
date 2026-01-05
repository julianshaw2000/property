# MaintainUK: API Reference

## Overview

MaintainUK provides a RESTful HTTP API with consistent request/response patterns, comprehensive error handling, and OpenAPI documentation.

**Base URL**: `https://api.maintainuk.com/api/v1` (production)

**Authentication**: JWT Bearer token in `Authorization` header

**Content-Type**: `application/json`

## API Conventions

### Response Envelope

All API responses use a consistent envelope:

**Success Response**:
```json
{
  "data": { ... },
  "error": null,
  "traceId": "abc123-def456-ghi789"
}
```

**Error Response**:
```json
{
  "data": null,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid input",
    "details": {
      "title": ["Title is required"],
      "priority": ["Invalid priority value"]
    }
  },
  "traceId": "abc123-def456-ghi789"
}
```

### HTTP Status Codes

| Code | Meaning | Usage |
|------|---------|-------|
| 200 | OK | Successful GET, PATCH, DELETE |
| 201 | Created | Successful POST (resource created) |
| 202 | Accepted | Async operation queued |
| 204 | No Content | Successful DELETE (no response body) |
| 400 | Bad Request | Validation error, malformed request |
| 401 | Unauthorized | Missing or invalid authentication |
| 403 | Forbidden | Insufficient permissions |
| 404 | Not Found | Resource not found (or not accessible) |
| 409 | Conflict | Resource already exists, state conflict |
| 422 | Unprocessable Entity | Business rule validation failed |
| 429 | Too Many Requests | Rate limit exceeded |
| 500 | Internal Server Error | Unexpected server error |
| 503 | Service Unavailable | Service temporarily down |

### Pagination

**Request**:
```
GET /api/v1/tickets?page=1&pageSize=20&sort=createdAt:desc
```

**Response**:
```json
{
  "data": {
    "items": [...],
    "pagination": {
      "page": 1,
      "pageSize": 20,
      "totalCount": 150,
      "totalPages": 8,
      "hasNext": true,
      "hasPrevious": false
    }
  }
}
```

### Filtering

```
GET /api/v1/tickets?status=OPEN&priority=URGENT&createdAfter=2025-01-01
```

### Sorting

```
GET /api/v1/tickets?sort=priority:desc,createdAt:desc
```

### Field Selection (Sparse Fieldsets)

```
GET /api/v1/tickets?fields=id,title,status,priority
```

### Timestamps

- **Format**: ISO 8601 with timezone: `2025-12-31T10:00:00Z`
- **Timezone**: UTC always

## Authentication Endpoints

### POST /auth/register

Register a new organisation and admin user.

**Request**:
```json
{
  "email": "admin@example.com",
  "password": "SecurePass123!",
  "orgName": "Example Property Management",
  "firstName": "John",
  "lastName": "Smith"
}
```

**Response** (201):
```json
{
  "data": {
    "userId": "uuid",
    "orgId": "uuid",
    "accessToken": "eyJhbGciOiJSUzI1NiIs...",
    "refreshToken": "uuid",
    "expiresIn": 900
  }
}
```

### POST /auth/login

Authenticate with email and password.

**Request**:
```json
{
  "email": "admin@example.com",
  "password": "SecurePass123!"
}
```

**Response** (200):
```json
{
  "data": {
    "userId": "uuid",
    "accessToken": "eyJhbGciOiJSUzI1NiIs...",
    "refreshToken": "uuid",
    "expiresIn": 900
  }
}
```

### POST /auth/refresh

Refresh access token using refresh token.

**Request**:
```json
{
  "refreshToken": "uuid"
}
```

**Response** (200):
```json
{
  "data": {
    "accessToken": "eyJhbGciOiJSUzI1NiIs...",
    "expiresIn": 900
  }
}
```

### POST /auth/logout

Revoke refresh token.

**Request**:
```json
{
  "refreshToken": "uuid"
}
```

**Response** (204): No content

### POST /auth/password-reset-request

Request password reset link via email.

**Request**:
```json
{
  "email": "admin@example.com"
}
```

**Response** (200):
```json
{
  "data": {
    "message": "If this email exists, a reset link has been sent"
  }
}
```

### POST /auth/password-reset-confirm

Confirm password reset with token.

**Request**:
```json
{
  "token": "reset-token-from-email",
  "newPassword": "NewSecurePass123!"
}
```

**Response** (200):
```json
{
  "data": {
    "message": "Password reset successful"
  }
}
```

## Ticket Endpoints

### POST /tickets

Create a new maintenance ticket.

**Permissions**: `tickets:create`

**Request**:
```json
{
  "unitId": "uuid",
  "reportedByContactId": "uuid",
  "category": "PLUMBING",
  "priority": "URGENT",
  "title": "Leak under kitchen sink",
  "description": "Water leaking from pipe under sink. Tenant reports it started this morning.",
  "attachments": [
    {
      "fileKey": "s3-key",
      "fileName": "leak-photo.jpg",
      "fileSize": 1024000,
      "mimeType": "image/jpeg"
    }
  ]
}
```

**Response** (201):
```json
{
  "data": {
    "id": "uuid",
    "ticketNumber": "TKT-001234",
    "unitId": "uuid",
    "status": "NEW",
    "priority": "URGENT",
    "category": "PLUMBING",
    "title": "Leak under kitchen sink",
    "description": "...",
    "createdAt": "2025-12-31T10:00:00Z",
    "updatedAt": "2025-12-31T10:00:00Z"
  }
}
```

### GET /tickets

List tickets with filtering and pagination.

**Permissions**: `tickets:read`

**Query Parameters**:
- `status` (enum): NEW, ASSIGNED, IN_PROGRESS, COMPLETED, CLOSED
- `priority` (enum): EMERGENCY, URGENT, ROUTINE, PLANNED
- `category` (enum): PLUMBING, ELECTRICAL, HEATING, GENERAL, etc.
- `propertyId` (uuid)
- `unitId` (uuid)
- `assignedContractorId` (uuid)
- `createdAfter` (ISO date)
- `createdBefore` (ISO date)
- `search` (string): Full-text search on title/description
- `page` (int, default 1)
- `pageSize` (int, default 20, max 100)
- `sort` (string, default "createdAt:desc")

**Response** (200):
```json
{
  "data": {
    "items": [
      {
        "id": "uuid",
        "ticketNumber": "TKT-001234",
        "status": "ASSIGNED",
        "priority": "URGENT",
        "category": "PLUMBING",
        "title": "Leak under kitchen sink",
        "propertyAddress": "123 Main St, London",
        "unitNumber": "Flat 2A",
        "assignedContractor": {
          "id": "uuid",
          "name": "ABC Plumbing"
        },
        "createdAt": "2025-12-31T10:00:00Z",
        "updatedAt": "2025-12-31T11:30:00Z"
      }
    ],
    "pagination": { ... }
  }
}
```

### GET /tickets/:id

Get ticket detail with timeline.

**Permissions**: `tickets:read`

**Response** (200):
```json
{
  "data": {
    "id": "uuid",
    "ticketNumber": "TKT-001234",
    "status": "ASSIGNED",
    "priority": "URGENT",
    "category": "PLUMBING",
    "title": "Leak under kitchen sink",
    "description": "...",
    "property": { ... },
    "unit": { ... },
    "reportedBy": { ... },
    "workOrder": { ... },
    "timeline": [
      {
        "id": "uuid",
        "eventType": "TICKET_CREATED",
        "actor": { "id": "uuid", "name": "John Smith" },
        "createdAt": "2025-12-31T10:00:00Z",
        "data": { ... }
      },
      {
        "eventType": "CONTRACTOR_ASSIGNED",
        "actor": { ... },
        "createdAt": "2025-12-31T11:30:00Z",
        "data": { "contractorId": "uuid", "contractorName": "ABC Plumbing" }
      }
    ],
    "attachments": [ ... ],
    "createdAt": "2025-12-31T10:00:00Z",
    "updatedAt": "2025-12-31T11:30:00Z"
  }
}
```

### PATCH /tickets/:id

Update ticket (status, priority, assignment).

**Permissions**: `tickets:update`

**Request**:
```json
{
  "priority": "EMERGENCY",
  "status": "IN_PROGRESS",
  "notes": "Escalated due to flooding risk"
}
```

**Response** (200):
```json
{
  "data": {
    "id": "uuid",
    "status": "IN_PROGRESS",
    "priority": "EMERGENCY",
    "updatedAt": "2025-12-31T12:00:00Z"
  }
}
```

### DELETE /tickets/:id

Soft delete a ticket.

**Permissions**: `tickets:delete`

**Response** (204): No content

## Work Order Endpoints

### POST /work-orders

Create work order from ticket.

**Permissions**: `workorders:create`

**Request**:
```json
{
  "ticketId": "uuid",
  "description": "Repair leak under kitchen sink",
  "estimatedDuration": 120
}
```

**Response** (201):
```json
{
  "data": {
    "id": "uuid",
    "ticketId": "uuid",
    "status": "CREATED",
    "description": "Repair leak under kitchen sink",
    "createdAt": "2025-12-31T10:00:00Z"
  }
}
```

### PATCH /work-orders/:id/assign

Assign contractor to work order.

**Permissions**: `workorders:assign`

**Request**:
```json
{
  "contractorId": "uuid",
  "scheduledStartAt": "2026-01-02T09:00:00Z",
  "scheduledEndAt": "2026-01-02T11:00:00Z",
  "accessInstructions": "Use keysafe code to enter. Tenant will not be home."
}
```

**Response** (200):
```json
{
  "data": {
    "id": "uuid",
    "status": "SCHEDULED",
    "assignedContractor": { ... },
    "scheduledStartAt": "2026-01-02T09:00:00Z",
    "scheduledEndAt": "2026-01-02T11:00:00Z"
  }
}
```

## Quote Endpoints

### POST /quotes

Contractor submits quote for work order.

**Permissions**: `quotes:create`

**Request**:
```json
{
  "workOrderId": "uuid",
  "lineItems": [
    {
      "description": "Replace P-trap pipe",
      "quantity": 1,
      "unitPriceGBP": 45.00
    },
    {
      "description": "Labour (2 hours)",
      "quantity": 2,
      "unitPriceGBP": 65.00
    }
  ],
  "subtotalGBP": 175.00,
  "vatGBP": 35.00,
  "totalGBP": 210.00,
  "validUntil": "2026-01-31T23:59:59Z",
  "notes": "Parts available, can complete within 1 week"
}
```

**Response** (201):
```json
{
  "data": {
    "id": "uuid",
    "workOrderId": "uuid",
    "status": "SUBMITTED",
    "totalGBP": 210.00,
    "createdAt": "2025-12-31T14:00:00Z"
  }
}
```

### PATCH /quotes/:id/approve

Approve submitted quote.

**Permissions**: `quotes:approve`

**Response** (200):
```json
{
  "data": {
    "id": "uuid",
    "status": "APPROVED",
    "approvedBy": { ... },
    "approvedAt": "2025-12-31T15:00:00Z"
  }
}
```

## AI Endpoints

All AI endpoints return 202 Accepted and queue a background job. Poll `/ai-jobs/:id` for results.

### POST /ai/intake

AI-powered ticket triage and classification.

**Permissions**: `ai:use`

**Request**:
```json
{
  "ticketId": "uuid",
  "description": "Kitchen sink leaking near electrical socket",
  "attachments": []
}
```

**Response** (202):
```json
{
  "data": {
    "aiJobId": "uuid",
    "status": "PENDING",
    "pollUrl": "/api/v1/ai-jobs/uuid"
  }
}
```

**Poll Result** (GET /ai-jobs/:id):
```json
{
  "data": {
    "id": "uuid",
    "status": "COMPLETED",
    "output": {
      "schemaVersion": "1.0",
      "category": "PLUMBING",
      "priority": "URGENT",
      "missingInfo": ["Photo of leak source", "Tenant availability for access"],
      "safetyFlags": ["WATER_NEAR_ELECTRICAL"],
      "summary": "Plumbing leak with electrical hazard. Requires immediate attention to prevent shock risk."
    },
    "completedAt": "2025-12-31T10:00:05Z"
  }
}
```

### POST /ai/draft-message

Generate message draft with AI.

**Permissions**: `ai:use`

**Request**:
```json
{
  "ticketId": "uuid",
  "recipient": "TENANT",
  "channel": "PORTAL",
  "intent": "REQUEST_PHOTOS"
}
```

**Response** (202):
```json
{
  "data": {
    "aiJobId": "uuid"
  }
}
```

**Poll Result**:
```json
{
  "data": {
    "output": {
      "requiresHumanSend": true,
      "subject": "Additional photos needed for your repair request",
      "body": "Hi, thank you for reporting the kitchen sink leak. To help our contractor assess the issue, could you please provide photos of:\n\n1. The area under the sink where the leak originates\n2. Any water damage to surrounding areas\n\nThis will help us schedule the repair more efficiently.\n\nRegards,\nMaintenance Team"
    }
  }
}
```

### POST /ai/extract-invoice

Extract invoice data from uploaded file.

**Permissions**: `ai:use`

**Request**:
```json
{
  "invoiceFileKey": "s3-key-to-pdf"
}
```

**Response** (202):
```json
{
  "data": {
    "aiJobId": "uuid"
  }
}
```

**Poll Result**:
```json
{
  "data": {
    "output": {
      "invoiceNumber": "INV-2025-001",
      "invoiceDate": "2026-01-05",
      "dueDate": "2026-02-04",
      "lineItems": [
        {
          "description": "Sink repair - parts and labour",
          "quantity": 1,
          "unitPriceGBP": 175.00,
          "totalGBP": 175.00
        }
      ],
      "subtotalGBP": 175.00,
      "vatGBP": 35.00,
      "totalGBP": 210.00,
      "anomalies": [
        {
          "type": "TOTAL_MATCHES_QUOTE",
          "severity": "INFO",
          "description": "Invoice total matches approved quote"
        }
      ]
    }
  }
}
```

## Messaging Endpoints

### POST /conversations

Create conversation (linked to ticket).

**Permissions**: `messages:create`

**Request**:
```json
{
  "ticketId": "uuid",
  "participantContactIds": ["uuid1", "uuid2"]
}
```

**Response** (201):
```json
{
  "data": {
    "id": "uuid",
    "ticketId": "uuid",
    "participants": [ ... ],
    "createdAt": "2025-12-31T10:00:00Z"
  }
}
```

### POST /messages

Create message draft.

**Permissions**: `messages:create`

**Request**:
```json
{
  "conversationId": "uuid",
  "toContactId": "uuid",
  "channel": "PORTAL",
  "subject": "Update on your repair",
  "body": "Your repair has been scheduled for 2nd January at 9am."
}
```

**Response** (201):
```json
{
  "data": {
    "id": "uuid",
    "status": "DRAFT",
    "channel": "PORTAL",
    "createdAt": "2025-12-31T10:00:00Z"
  }
}
```

### POST /messages/:id/send

Explicitly send draft message (human-in-loop).

**Permissions**: `messages:send`

**Response** (200):
```json
{
  "data": {
    "id": "uuid",
    "status": "QUEUED",
    "queuedAt": "2025-12-31T10:00:10Z"
  }
}
```

## Notification Endpoints

### GET /notifications

Get current user's notifications.

**Response** (200):
```json
{
  "data": {
    "items": [
      {
        "id": "uuid",
        "type": "TICKET_ASSIGNED",
        "title": "New ticket assigned to you",
        "body": "TKT-001234: Leak under kitchen sink",
        "channel": "INAPP",
        "status": "UNREAD",
        "createdAt": "2025-12-31T10:00:00Z",
        "linkUrl": "/tickets/uuid"
      }
    ]
  }
}
```

### PATCH /notifications/:id/read

Mark notification as read.

**Response** (200):
```json
{
  "data": {
    "id": "uuid",
    "status": "READ",
    "readAt": "2025-12-31T10:05:00Z"
  }
}
```

## Admin Endpoints

### GET /admin/dead-letters

View dead letter queue (failed jobs after max retries).

**Permissions**: `admin:jobs`

**Response** (200):
```json
{
  "data": {
    "items": [
      {
        "id": "uuid",
        "type": "send-email",
        "status": "DEAD",
        "attempts": 5,
        "lastError": "SMTP connection timeout",
        "createdAt": "2025-12-31T09:00:00Z",
        "lastAttemptAt": "2025-12-31T09:45:00Z"
      }
    ]
  }
}
```

### POST /admin/dead-letters/:id/reprocess

Retry dead letter job.

**Permissions**: `admin:jobs`

**Response** (200):
```json
{
  "data": {
    "id": "uuid",
    "status": "PENDING",
    "retriedAt": "2025-12-31T10:00:00Z"
  }
}
```

## Webhook Endpoints

### POST /webhooks/twilio/inbound

Receive inbound SMS/WhatsApp messages.

**Authentication**: Twilio signature validation

**Request** (Twilio format):
```
From=+447700900123
To=+447700900456
Body=I'll be available tomorrow at 2pm
MessageSid=SM1234567890abcdef
```

**Response** (200):
```xml
<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Message>Thank you. Your message has been received and added to ticket TKT-001234.</Message>
</Response>
```

### POST /webhooks/stripe

Receive Stripe webhook events.

**Authentication**: Stripe signature validation

**Events Handled**:
- `customer.subscription.created`
- `customer.subscription.updated`
- `customer.subscription.deleted`
- `invoice.paid`
- `invoice.payment_failed`

**Response** (200):
```json
{
  "received": true
}
```

## Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `VALIDATION_ERROR` | 400 | Request validation failed |
| `AUTHENTICATION_REQUIRED` | 401 | Missing or invalid token |
| `FORBIDDEN` | 403 | Insufficient permissions |
| `NOT_FOUND` | 404 | Resource not found |
| `CONFLICT` | 409 | Resource already exists |
| `BUSINESS_RULE_VIOLATION` | 422 | Business logic constraint failed |
| `RATE_LIMIT_EXCEEDED` | 429 | Too many requests |
| `INTERNAL_ERROR` | 500 | Unexpected server error |
| `SERVICE_UNAVAILABLE` | 503 | Service temporarily down |

---

**API Version**: v1
**OpenAPI Spec**: Available at `/swagger` (development)
**Last Updated**: 2025-12-31

