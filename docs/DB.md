# MaintainUK: Database Schema

## Overview

**Database**: PostgreSQL 16
**ORM**: Entity Framework Core 8
**Migration Strategy**: Code-first with versioned migrations
**Multi-Tenancy**: OrgId column + global query filters

## Entity Relationship Diagram

```
┌──────────────┐
│ Organisation │ (Tenant root)
└──────┬───────┘
       │
       ├─────┬──────────────┐
       │     │              │
       ▼     ▼              ▼
    ┌────┐ ┌────────┐  ┌────────────┐
    │User│ │Property│  │Contractor  │
    └────┘ └───┬────┘  │Profile     │
               │       └────────────┘
               ▼
           ┌──────┐
           │ Unit │
           └───┬──┘
               │
               ▼
          ┌─────────┐
          │ Tenancy │
          └─────────┘

┌──────────────────┐
│MaintenanceTicket │
└────────┬─────────┘
         │
         ├───────────────┬────────────────┐
         │               │                │
         ▼               ▼                ▼
   ┌─────────┐   ┌─────────────┐  ┌────────────┐
   │WorkOrder│   │Timeline     │  │Conversation│
   └────┬────┘   │Event        │  └──────┬─────┘
        │        └─────────────┘         │
        │                                 ▼
        ├──────────┬────────────┐   ┌─────────┐
        │          │            │   │ Message │
        ▼          ▼            ▼   └─────────┘
    ┌──────┐  ┌────────┐  ┌────────┐
    │Quote │  │Invoice │  │Payment │
    └──────┘  └────────┘  └────────┘
```

## Core Entities

### Organisation

**Purpose**: Multi-tenant root entity

```sql
CREATE TABLE "Organisations" (
    "Id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "Name" VARCHAR(200) NOT NULL,
    "Slug" VARCHAR(100) NOT NULL UNIQUE,
    "Plan" VARCHAR(50) NOT NULL, -- Free, Starter, Professional, Enterprise
    "Status" VARCHAR(50) NOT NULL, -- Active, Suspended, Cancelled
    "BillingEmail" VARCHAR(200),
    "StripeCustomerId" VARCHAR(100),
    "SubscriptionStatus" VARCHAR(50),
    "SmsLimit" INT NOT NULL DEFAULT 0,
    "WhatsAppLimit" INT NOT NULL DEFAULT 0,
    "AiJobLimit" INT NOT NULL DEFAULT 0,
    "CreatedAt" TIMESTAMP NOT NULL DEFAULT NOW(),
    "UpdatedAt" TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX "IX_Organisations_Slug" ON "Organisations"("Slug");
CREATE INDEX "IX_Organisations_StripeCustomerId" ON "Organisations"("StripeCustomerId");
```

**EF Core Entity**:
```csharp
public class Organisation
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Slug { get; set; } = string.Empty;
    public SubscriptionPlan Plan { get; set; }
    public OrganisationStatus Status { get; set; }
    public string? BillingEmail { get; set; }
    public string? StripeCustomerId { get; set; }
    public string? SubscriptionStatus { get; set; }
    public int SmsLimit { get; set; }
    public int WhatsAppLimit { get; set; }
    public int AiJobLimit { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }

    // Navigation properties
    public ICollection<User> Users { get; set; } = new List<User>();
    public ICollection<Property> Properties { get; set; } = new List<Property>();
}
```

### User

**Purpose**: Staff, contractors, tenants

```sql
CREATE TABLE "Users" (
    "Id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "OrgId" UUID NOT NULL REFERENCES "Organisations"("Id"),
    "Email" VARCHAR(200) NOT NULL,
    "PasswordHash" VARCHAR(500),
    "Role" VARCHAR(50) NOT NULL, -- SuperAdmin, OrgAdmin, Coordinator, Viewer, Contractor, Tenant
    "Permissions" JSONB, -- Array of permission strings
    "FirstName" VARCHAR(100),
    "LastName" VARCHAR(100),
    "PhoneE164" VARCHAR(20),
    "IsActive" BOOLEAN NOT NULL DEFAULT TRUE,
    "LastLoginAt" TIMESTAMP,
    "CreatedAt" TIMESTAMP NOT NULL DEFAULT NOW(),
    "UpdatedAt" TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX "IX_Users_OrgId" ON "Users"("OrgId");
CREATE UNIQUE INDEX "IX_Users_Email_OrgId" ON "Users"("Email", "OrgId");
CREATE INDEX "IX_Users_Role" ON "Users"("Role");
```

### Property

```sql
CREATE TABLE "Properties" (
    "Id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "OrgId" UUID NOT NULL REFERENCES "Organisations"("Id"),
    "AddressLine1" VARCHAR(200) NOT NULL,
    "AddressLine2" VARCHAR(200),
    "City" VARCHAR(100) NOT NULL,
    "Postcode" VARCHAR(10) NOT NULL,
    "Country" VARCHAR(2) NOT NULL DEFAULT 'GB',
    "PropertyType" VARCHAR(50) NOT NULL, -- House, Flat, Studio, Commercial
    "Status" VARCHAR(50) NOT NULL, -- Active, Inactive
    "OwnerContactId" UUID REFERENCES "ContactPoints"("Id"),
    "CreatedAt" TIMESTAMP NOT NULL DEFAULT NOW(),
    "UpdatedAt" TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX "IX_Properties_OrgId" ON "Properties"("OrgId");
CREATE INDEX "IX_Properties_Postcode" ON "Properties"("Postcode");
CREATE INDEX "IX_Properties_Status" ON "Properties"("Status");
```

### Unit

```sql
CREATE TABLE "Units" (
    "Id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "OrgId" UUID NOT NULL REFERENCES "Organisations"("Id"),
    "PropertyId" UUID NOT NULL REFERENCES "Properties"("Id"),
    "UnitNumber" VARCHAR(50), -- e.g., "Flat 2A", NULL for single unit properties
    "Bedrooms" INT,
    "Bathrooms" INT,
    "FloorArea" DECIMAL(10,2),
    "Status" VARCHAR(50) NOT NULL, -- Available, Occupied, Maintenance
    "CreatedAt" TIMESTAMP NOT NULL DEFAULT NOW(),
    "UpdatedAt" TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX "IX_Units_OrgId" ON "Units"("OrgId");
CREATE INDEX "IX_Units_PropertyId" ON "Units"("PropertyId");
CREATE INDEX "IX_Units_Status" ON "Units"("Status");
```

### Tenancy

```sql
CREATE TABLE "Tenancies" (
    "Id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "OrgId" UUID NOT NULL REFERENCES "Organisations"("Id"),
    "UnitId" UUID NOT NULL REFERENCES "Units"("Id"),
    "TenantContactId" UUID NOT NULL REFERENCES "ContactPoints"("Id"),
    "StartDate" DATE NOT NULL,
    "EndDate" DATE,
    "RentAmountGBP" DECIMAL(10,2) NOT NULL,
    "DepositAmountGBP" DECIMAL(10,2),
    "Status" VARCHAR(50) NOT NULL, -- Active, Ended, Eviction
    "CreatedAt" TIMESTAMP NOT NULL DEFAULT NOW(),
    "UpdatedAt" TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX "IX_Tenancies_OrgId" ON "Tenancies"("OrgId");
CREATE INDEX "IX_Tenancies_UnitId" ON "Tenancies"("UnitId");
CREATE INDEX "IX_Tenancies_TenantContactId" ON "Tenancies"("TenantContactId");
CREATE INDEX "IX_Tenancies_Status" ON "Tenancies"("Status");
```

### ContactPoint

```sql
CREATE TABLE "ContactPoints" (
    "Id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "OrgId" UUID NOT NULL REFERENCES "Organisations"("Id"),
    "Type" VARCHAR(50) NOT NULL, -- Tenant, Owner, Contractor, Other
    "FirstName" VARCHAR(100),
    "LastName" VARCHAR(100),
    "Email" VARCHAR(200),
    "PhoneE164" VARCHAR(20),
    "PreferredChannel" VARCHAR(50), -- Portal, Email, SMS, WhatsApp
    "IsValid" BOOLEAN NOT NULL DEFAULT TRUE,
    "CreatedAt" TIMESTAMP NOT NULL DEFAULT NOW(),
    "UpdatedAt" TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX "IX_ContactPoints_OrgId" ON "ContactPoints"("OrgId");
CREATE INDEX "IX_ContactPoints_Type" ON "ContactPoints"("Type");
CREATE INDEX "IX_ContactPoints_Email" ON "ContactPoints"("Email");
CREATE INDEX "IX_ContactPoints_PhoneE164" ON "ContactPoints"("PhoneE164");
```

### ConsentRecord

```sql
CREATE TABLE "ConsentRecords" (
    "Id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "OrgId" UUID NOT NULL REFERENCES "Organisations"("Id"),
    "ContactId" UUID NOT NULL REFERENCES "ContactPoints"("Id"),
    "Channel" VARCHAR(50) NOT NULL, -- SMS, WhatsApp, Email
    "ConsentedAt" TIMESTAMP,
    "OptedOutAt" TIMESTAMP,
    "IpAddress" VARCHAR(50),
    "UserAgent" TEXT,
    "CreatedAt" TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX "IX_ConsentRecords_OrgId" ON "ConsentRecords"("OrgId");
CREATE INDEX "IX_ConsentRecords_ContactId_Channel" ON "ConsentRecords"("ContactId", "Channel");
```

### MaintenanceTicket

```sql
CREATE TABLE "MaintenanceTickets" (
    "Id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "OrgId" UUID NOT NULL REFERENCES "Organisations"("Id"),
    "TicketNumber" VARCHAR(50) NOT NULL,
    "UnitId" UUID NOT NULL REFERENCES "Units"("Id"),
    "ReportedByContactId" UUID REFERENCES "ContactPoints"("Id"),
    "Category" VARCHAR(50) NOT NULL,
    "Priority" VARCHAR(50) NOT NULL,
    "Status" VARCHAR(50) NOT NULL,
    "Title" VARCHAR(200) NOT NULL,
    "Description" TEXT,
    "ResolutionNotes" TEXT,
    "CreatedAt" TIMESTAMP NOT NULL DEFAULT NOW(),
    "UpdatedAt" TIMESTAMP NOT NULL DEFAULT NOW(),
    "ClosedAt" TIMESTAMP
);

CREATE INDEX "IX_MaintenanceTickets_OrgId" ON "MaintenanceTickets"("OrgId");
CREATE UNIQUE INDEX "IX_MaintenanceTickets_TicketNumber_OrgId" ON "MaintenanceTickets"("TicketNumber", "OrgId");
CREATE INDEX "IX_MaintenanceTickets_UnitId" ON "MaintenanceTickets"("UnitId");
CREATE INDEX "IX_MaintenanceTickets_Status_Priority" ON "MaintenanceTickets"("Status", "Priority");
CREATE INDEX "IX_MaintenanceTickets_CreatedAt" ON "MaintenanceTickets"("CreatedAt" DESC);

-- Full-text search
CREATE INDEX "IX_MaintenanceTickets_FullText" ON "MaintenanceTickets" USING GIN(to_tsvector('english', "Title" || ' ' || COALESCE("Description", '')));
```

### TicketTimelineEvent

```sql
CREATE TABLE "TicketTimelineEvents" (
    "Id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "OrgId" UUID NOT NULL REFERENCES "Organisations"("Id"),
    "TicketId" UUID NOT NULL REFERENCES "MaintenanceTickets"("Id") ON DELETE CASCADE,
    "EventType" VARCHAR(100) NOT NULL,
    "ActorUserId" UUID REFERENCES "Users"("Id"),
    "ActorContactId" UUID REFERENCES "ContactPoints"("Id"),
    "DataJson" JSONB,
    "CreatedAt" TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX "IX_TicketTimelineEvents_OrgId" ON "TicketTimelineEvents"("OrgId");
CREATE INDEX "IX_TicketTimelineEvents_TicketId_CreatedAt" ON "TicketTimelineEvents"("TicketId", "CreatedAt" DESC);
CREATE INDEX "IX_TicketTimelineEvents_EventType" ON "TicketTimelineEvents"("EventType");
```

### WorkOrder

```sql
CREATE TABLE "WorkOrders" (
    "Id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "OrgId" UUID NOT NULL REFERENCES "Organisations"("Id"),
    "TicketId" UUID NOT NULL REFERENCES "MaintenanceTickets"("Id"),
    "AssignedContractorId" UUID REFERENCES "ContractorProfiles"("Id"),
    "Status" VARCHAR(50) NOT NULL,
    "Description" TEXT,
    "ScheduledStartAt" TIMESTAMP,
    "ScheduledEndAt" TIMESTAMP,
    "ActualStartAt" TIMESTAMP,
    "ActualEndAt" TIMESTAMP,
    "AccessInstructions" TEXT,
    "CreatedAt" TIMESTAMP NOT NULL DEFAULT NOW(),
    "UpdatedAt" TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX "IX_WorkOrders_OrgId" ON "WorkOrders"("OrgId");
CREATE INDEX "IX_WorkOrders_TicketId" ON "WorkOrders"("TicketId");
CREATE INDEX "IX_WorkOrders_AssignedContractorId" ON "WorkOrders"("AssignedContractorId");
CREATE INDEX "IX_WorkOrders_Status" ON "WorkOrders"("Status");
CREATE INDEX "IX_WorkOrders_ScheduledStartAt" ON "WorkOrders"("ScheduledStartAt");
```

### Quote

```sql
CREATE TABLE "Quotes" (
    "Id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "OrgId" UUID NOT NULL REFERENCES "Organisations"("Id"),
    "WorkOrderId" UUID NOT NULL REFERENCES "WorkOrders"("Id"),
    "ContractorId" UUID NOT NULL REFERENCES "ContractorProfiles"("Id"),
    "LineItemsJson" JSONB NOT NULL,
    "SubtotalGBP" DECIMAL(10,2) NOT NULL,
    "VatGBP" DECIMAL(10,2) NOT NULL,
    "TotalGBP" DECIMAL(10,2) NOT NULL,
    "Status" VARCHAR(50) NOT NULL, -- Draft, Submitted, Approved, Rejected
    "ValidUntil" TIMESTAMP,
    "ApprovedBy" UUID REFERENCES "Users"("Id"),
    "ApprovedAt" TIMESTAMP,
    "Notes" TEXT,
    "CreatedAt" TIMESTAMP NOT NULL DEFAULT NOW(),
    "UpdatedAt" TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX "IX_Quotes_OrgId" ON "Quotes"("OrgId");
CREATE INDEX "IX_Quotes_WorkOrderId" ON "Quotes"("WorkOrderId");
CREATE INDEX "IX_Quotes_ContractorId" ON "Quotes"("ContractorId");
CREATE INDEX "IX_Quotes_Status" ON "Quotes"("Status");
```

### Invoice

```sql
CREATE TABLE "Invoices" (
    "Id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "OrgId" UUID NOT NULL REFERENCES "Organisations"("Id"),
    "WorkOrderId" UUID NOT NULL REFERENCES "WorkOrders"("Id"),
    "ContractorId" UUID NOT NULL REFERENCES "ContractorProfiles"("Id"),
    "InvoiceNumber" VARCHAR(100) NOT NULL,
    "InvoiceDate" DATE NOT NULL,
    "DueDate" DATE NOT NULL,
    "LineItemsJson" JSONB NOT NULL,
    "SubtotalGBP" DECIMAL(10,2) NOT NULL,
    "VatGBP" DECIMAL(10,2) NOT NULL,
    "TotalGBP" DECIMAL(10,2) NOT NULL,
    "Status" VARCHAR(50) NOT NULL, -- Uploaded, Reviewed, Approved, Paid, Disputed
    "FileKey" VARCHAR(500),
    "ApprovedBy" UUID REFERENCES "Users"("Id"),
    "ApprovedAt" TIMESTAMP,
    "PaidAt" TIMESTAMP,
    "CreatedAt" TIMESTAMP NOT NULL DEFAULT NOW(),
    "UpdatedAt" TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX "IX_Invoices_OrgId" ON "Invoices"("OrgId");
CREATE INDEX "IX_Invoices_WorkOrderId" ON "Invoices"("WorkOrderId");
CREATE INDEX "IX_Invoices_ContractorId" ON "Invoices"("ContractorId");
CREATE UNIQUE INDEX "IX_Invoices_InvoiceNumber_ContractorId" ON "Invoices"("InvoiceNumber", "ContractorId");
CREATE INDEX "IX_Invoices_Status" ON "Invoices"("Status");
CREATE INDEX "IX_Invoices_DueDate" ON "Invoices"("DueDate");
```

### ContractorProfile

```sql
CREATE TABLE "ContractorProfiles" (
    "Id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "OrgId" UUID NOT NULL REFERENCES "Organisations"("Id"),
    "ContactId" UUID NOT NULL REFERENCES "ContactPoints"("Id"),
    "CompanyName" VARCHAR(200),
    "TradeLicenses" JSONB, -- Array of license objects
    "ServiceCategories" JSONB NOT NULL, -- Array of categories
    "Rating" DECIMAL(3,2),
    "CompletionRate" DECIMAL(5,4),
    "AvgResponseTimeHours" DECIMAL(10,2),
    "Status" VARCHAR(50) NOT NULL, -- Active, Suspended, Inactive
    "CreatedAt" TIMESTAMP NOT NULL DEFAULT NOW(),
    "UpdatedAt" TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX "IX_ContractorProfiles_OrgId" ON "ContractorProfiles"("OrgId");
CREATE INDEX "IX_ContractorProfiles_ContactId" ON "ContractorProfiles"("ContactId");
CREATE INDEX "IX_ContractorProfiles_Status" ON "ContractorProfiles"("Status");
```

### ComplianceItem

```sql
CREATE TABLE "ComplianceItems" (
    "Id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "OrgId" UUID NOT NULL REFERENCES "Organisations"("Id"),
    "PropertyId" UUID NOT NULL REFERENCES "Properties"("Id"),
    "Type" VARCHAR(100) NOT NULL, -- GasSafety, EPC, EICR, FireAlarm, LegionellaRisk, etc.
    "DueDate" DATE NOT NULL,
    "CompletedDate" DATE,
    "CertificateStorageKey" VARCHAR(500),
    "Status" VARCHAR(50) NOT NULL, -- Pending, Completed, Overdue, NotApplicable
    "Notes" TEXT,
    "CreatedAt" TIMESTAMP NOT NULL DEFAULT NOW(),
    "UpdatedAt" TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX "IX_ComplianceItems_OrgId" ON "ComplianceItems"("OrgId");
CREATE INDEX "IX_ComplianceItems_PropertyId" ON "ComplianceItems"("PropertyId");
CREATE INDEX "IX_ComplianceItems_Type_Status" ON "ComplianceItems"("Type", "Status");
CREATE INDEX "IX_ComplianceItems_DueDate" ON "ComplianceItems"("DueDate");
```

### Conversation & Message

```sql
CREATE TABLE "Conversations" (
    "Id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "OrgId" UUID NOT NULL REFERENCES "Organisations"("Id"),
    "TicketId" UUID REFERENCES "MaintenanceTickets"("Id"),
    "ParticipantContactIds" JSONB NOT NULL, -- Array of UUIDs
    "CreatedAt" TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX "IX_Conversations_OrgId" ON "Conversations"("OrgId");
CREATE INDEX "IX_Conversations_TicketId" ON "Conversations"("TicketId");

CREATE TABLE "Messages" (
    "Id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "OrgId" UUID NOT NULL REFERENCES "Organisations"("Id"),
    "ConversationId" UUID NOT NULL REFERENCES "Conversations"("Id"),
    "FromUserId" UUID REFERENCES "Users"("Id"),
    "FromContactId" UUID REFERENCES "ContactPoints"("Id"),
    "ToContactId" UUID REFERENCES "ContactPoints"("Id"),
    "Channel" VARCHAR(50) NOT NULL, -- Portal, Email, SMS, WhatsApp
    "Subject" VARCHAR(200),
    "Body" TEXT NOT NULL,
    "Status" VARCHAR(50) NOT NULL, -- Draft, Queued, Sent, Delivered, Failed
    "SentAt" TIMESTAMP,
    "DeliveredAt" TIMESTAMP,
    "ReadAt" TIMESTAMP,
    "ExternalId" VARCHAR(200), -- Twilio MessageSid, email provider ID
    "CreatedAt" TIMESTAMP NOT NULL DEFAULT NOW(),
    "UpdatedAt" TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX "IX_Messages_OrgId" ON "Messages"("OrgId");
CREATE INDEX "IX_Messages_ConversationId_CreatedAt" ON "Messages"("ConversationId", "CreatedAt" DESC);
CREATE INDEX "IX_Messages_Status" ON "Messages"("Status");
CREATE INDEX "IX_Messages_Channel" ON "Messages"("Channel");
```

### Notification

```sql
CREATE TABLE "Notifications" (
    "Id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "OrgId" UUID NOT NULL REFERENCES "Organisations"("Id"),
    "UserId" UUID REFERENCES "Users"("Id"),
    "ContactId" UUID REFERENCES "ContactPoints"("Id"),
    "Type" VARCHAR(100) NOT NULL,
    "Title" VARCHAR(200) NOT NULL,
    "Body" TEXT,
    "Channel" VARCHAR(50) NOT NULL,
    "Status" VARCHAR(50) NOT NULL, -- Unread, Read, Dismissed
    "LinkUrl" VARCHAR(500),
    "SentAt" TIMESTAMP,
    "ReadAt" TIMESTAMP,
    "CreatedAt" TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX "IX_Notifications_OrgId" ON "Notifications"("OrgId");
CREATE INDEX "IX_Notifications_UserId_Status" ON "Notifications"("UserId", "Status");
CREATE INDEX "IX_Notifications_CreatedAt" ON "Notifications"("CreatedAt" DESC);
```

### AuditLog

```sql
CREATE TABLE "AuditLogs" (
    "Id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "OrgId" UUID REFERENCES "Organisations"("Id"), -- NULL for cross-org actions (SuperAdmin)
    "UserId" UUID REFERENCES "Users"("Id"),
    "Action" VARCHAR(100) NOT NULL,
    "EntityType" VARCHAR(100),
    "EntityId" UUID,
    "OldValueJson" JSONB,
    "NewValueJson" JSONB,
    "IpAddress" VARCHAR(50),
    "UserAgent" TEXT,
    "Timestamp" TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX "IX_AuditLogs_OrgId_Timestamp" ON "AuditLogs"("OrgId", "Timestamp" DESC);
CREATE INDEX "IX_AuditLogs_UserId" ON "AuditLogs"("UserId");
CREATE INDEX "IX_AuditLogs_Action" ON "AuditLogs"("Action");
CREATE INDEX "IX_AuditLogs_EntityType_EntityId" ON "AuditLogs"("EntityType", "EntityId");

-- Retention: Partition by month for efficient purging
-- ALTER TABLE "AuditLogs" PARTITION BY RANGE ("Timestamp");
```

### AiJob

```sql
CREATE TABLE "AiJobs" (
    "Id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "OrgId" UUID NOT NULL REFERENCES "Organisations"("Id"),
    "Capability" VARCHAR(100) NOT NULL,
    "InputJson" JSONB NOT NULL,
    "OutputJson" JSONB,
    "SchemaVersion" VARCHAR(20) NOT NULL,
    "Status" VARCHAR(50) NOT NULL, -- Pending, Completed, Failed
    "ErrorMessage" TEXT,
    "RequestedByUserId" UUID REFERENCES "Users"("Id"),
    "CreatedAt" TIMESTAMP NOT NULL DEFAULT NOW(),
    "CompletedAt" TIMESTAMP
);

CREATE INDEX "IX_AiJobs_OrgId" ON "AiJobs"("OrgId");
CREATE INDEX "IX_AiJobs_Status" ON "AiJobs"("Status");
CREATE INDEX "IX_AiJobs_Capability" ON "AiJobs"("Capability");
CREATE INDEX "IX_AiJobs_CreatedAt" ON "AiJobs"("CreatedAt" DESC);
```

### OutboxMessage

```sql
CREATE TABLE "OutboxMessages" (
    "Id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "OrgId" UUID NOT NULL REFERENCES "Organisations"("Id"),
    "Type" VARCHAR(100) NOT NULL, -- send-email, send-sms, send-whatsapp, ai-job
    "PayloadJson" JSONB NOT NULL,
    "Status" VARCHAR(50) NOT NULL, -- Pending, Dispatched, Completed, Failed, Dead
    "AvailableAt" TIMESTAMP NOT NULL DEFAULT NOW(),
    "Attempts" INT NOT NULL DEFAULT 0,
    "LastError" TEXT,
    "CorrelationId" VARCHAR(100),
    "CreatedAt" TIMESTAMP NOT NULL DEFAULT NOW(),
    "UpdatedAt" TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX "IX_OutboxMessages_Status_AvailableAt" ON "OutboxMessages"("Status", "AvailableAt");
CREATE INDEX "IX_OutboxMessages_Type" ON "OutboxMessages"("Type");
CREATE INDEX "IX_OutboxMessages_CorrelationId" ON "OutboxMessages"("CorrelationId");
```

### UsageMeter

```sql
CREATE TABLE "UsageMeters" (
    "Id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "OrgId" UUID NOT NULL REFERENCES "Organisations"("Id"),
    "ResourceType" VARCHAR(50) NOT NULL, -- SMS, WhatsApp, AiJob
    "Count" INT NOT NULL DEFAULT 0,
    "PeriodStart" TIMESTAMP NOT NULL,
    "PeriodEnd" TIMESTAMP NOT NULL,
    "CreatedAt" TIMESTAMP NOT NULL DEFAULT NOW(),
    "UpdatedAt" TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX "IX_UsageMeters_OrgId_ResourceType_Period" ON "UsageMeters"("OrgId", "ResourceType", "PeriodStart", "PeriodEnd");
```

## Multi-Tenancy Implementation

### Global Query Filter

```csharp
protected override void OnModelCreating(ModelBuilder modelBuilder)
{
    var orgIdProperty = typeof(IHasOrgId).GetProperty(nameof(IHasOrgId.OrgId));

    foreach (var entityType in modelBuilder.Model.GetEntityTypes())
    {
        if (typeof(IHasOrgId).IsAssignableFrom(entityType.ClrType))
        {
            var parameter = Expression.Parameter(entityType.ClrType, "e");
            var property = Expression.Property(parameter, orgIdProperty!);
            var currentOrgId = Expression.Constant(_httpContextAccessor.HttpContext?.User.GetOrgId());
            var filter = Expression.Lambda(Expression.Equal(property, currentOrgId), parameter);

            entityType.SetQueryFilter(filter);
        }
    }
}
```

### Setting OrgId on Save

```csharp
public override async Task<int> SaveChangesAsync(CancellationToken cancellationToken = default)
{
    var currentOrgId = _httpContextAccessor.HttpContext?.User.GetOrgId();

    foreach (var entry in ChangeTracker.Entries<IHasOrgId>())
    {
        if (entry.State == EntityState.Added)
        {
            entry.Entity.OrgId = currentOrgId ?? throw new InvalidOperationException("OrgId required");
        }
    }

    foreach (var entry in ChangeTracker.Entries<IHasTimestamps>())
    {
        if (entry.State == EntityState.Added)
        {
            entry.Entity.CreatedAt = DateTime.UtcNow;
        }

        if (entry.State == EntityState.Modified)
        {
            entry.Entity.UpdatedAt = DateTime.UtcNow;
        }
    }

    return await base.SaveChangesAsync(cancellationToken);
}
```

## Migrations

### Create Migration

```bash
cd apps/api
dotnet ef migrations add InitialSchema --output-dir Infrastructure/Persistence/Migrations
```

### Apply Migration

```bash
dotnet ef database update
```

### Seed Data

```bash
dotnet run --seed
```

## Performance Considerations

### Indexes

- **OrgId**: On all multi-tenant tables (automatic with global filter)
- **Composite**: (OrgId, Status, CreatedAt) for filtered lists
- **Foreign keys**: Automatic indexes
- **Full-text search**: GIN index on ticket title/description

### Connection Pooling

```json
{
  "ConnectionStrings": {
    "DefaultConnection": "Host=localhost;Database=maintainuk_dev;Username=postgres;Password=***;Minimum Pool Size=10;Maximum Pool Size=100;Connection Idle Lifetime=300"
  }
}
```

### Query Optimization

- Use projections (`.Select()`) instead of loading full entities
- Eager load navigation properties with `.Include()` when needed
- Use `.AsNoTracking()` for read-only queries
- Paginate large result sets

---

**Last Updated**: 2025-12-31
**Schema Version**: 1.0
**Total Tables**: 23

