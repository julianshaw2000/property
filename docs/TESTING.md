# MaintainUK: Testing Strategy

## Overview

MaintainUK employs a comprehensive testing strategy covering unit, integration, E2E, and security testing across all layers.

## Test Pyramid

```
        ╱╲
       ╱E2E╲          ~10% of tests (slow, expensive)
      ╱──────╲
     ╱  Integ  ╲       ~30% of tests (moderate speed)
    ╱──────────╲
   ╱    Unit     ╲     ~60% of tests (fast, cheap)
  ╱──────────────╲
```

## Coverage Targets

| Layer | Target | Actual |
|-------|--------|--------|
| Backend (Unit) | 80% | TBD |
| Backend (Integration) | 60% | TBD |
| Frontend (Unit) | 70% | TBD |
| E2E (Critical Flows) | 100% | TBD |

## Backend Testing (.NET)

### Unit Tests

**Framework**: xUnit + Moq + FluentAssertions

**Location**: `apps/api/tests/Unit/`

**Test Structure** (AAA Pattern):
```csharp
[Fact]
public async Task CreateTicket_WithValidInput_ReturnsCreatedTicket()
{
    // Arrange
    var mockRepo = new Mock<ITicketRepository>();
    var service = new TicketService(mockRepo.Object, ...);
    var request = new CreateTicketRequest { ... };

    // Act
    var result = await service.CreateTicketAsync(request);

    // Assert
    result.Should().NotBeNull();
    result.Status.Should().Be(TicketStatus.NEW);
    mockRepo.Verify(r => r.AddAsync(It.IsAny<MaintenanceTicket>()), Times.Once);
}
```

**What to Test**:
- Business logic in service classes
- Domain model validation
- Value object behavior
- Enum conversions
- Utility functions

**What NOT to Test**:
- EF Core internals
- External service implementations (mock them)
- ASP.NET Core framework code

**Run Tests**:
```bash
cd apps/api
dotnet test

# Watch mode
dotnet watch test

# With coverage
dotnet test /p:CollectCoverage=true
```

### Integration Tests

**Framework**: xUnit + TestContainers + WebApplicationFactory

**Location**: `apps/api/tests/Integration/`

**Setup**:
```csharp
public class TicketApiTests : IClassFixture<WebApplicationFactory<Program>>
{
    private readonly HttpClient _client;

    public TicketApiTests(WebApplicationFactory<Program> factory)
    {
        _client = factory.WithWebHostBuilder(builder =>
        {
            builder.ConfigureTestContainer<PostgreSqlContainer>(container =>
            {
                container.WithImage("postgres:16");
            });
        }).CreateClient();
    }

    [Fact]
    public async Task POST_Tickets_ReturnsCreated()
    {
        // Arrange
        var token = await GetAuthTokenAsync();
        _client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);
        var request = new { title = "Test ticket", ... };

        // Act
        var response = await _client.PostAsJsonAsync("/api/v1/tickets", request);

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.Created);
        var ticket = await response.Content.ReadFromJsonAsync<TicketDto>();
        ticket.Title.Should().Be("Test ticket");
    }
}
```

**What to Test**:
- API endpoints (happy path + error cases)
- Database operations (CRUD)
- Multi-tenant isolation (cross-org queries return 404/403)
- Authentication/authorization
- Validation errors
- Transaction boundaries

**Run Tests**:
```bash
cd apps/api
dotnet test --filter "Category=Integration"
```

## Frontend Testing (Angular)

### Unit Tests

**Framework**: Jest + Angular Testing Library

**Location**: `apps/web/src/app/**/*.spec.ts`

**Test Structure**:
```typescript
describe('TicketListComponent', () => {
  let component: TicketListComponent;
  let mockTicketService: jest.Mocked<TicketService>;

  beforeEach(() => {
    mockTicketService = {
      getTickets: jest.fn().mockReturnValue(of({ items: [], pagination: {...} })),
    } as any;

    component = new TicketListComponent(mockTicketService);
  });

  it('should load tickets on init', () => {
    component.ngOnInit();

    expect(mockTicketService.getTickets).toHaveBeenCalled();
    expect(component.tickets()).toHaveLength(0);
  });

  it('should filter tickets by status', () => {
    component.statusFilter.set('OPEN');
    component.applyFilters();

    expect(mockTicketService.getTickets).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'OPEN' })
    );
  });
});
```

**What to Test**:
- Component logic (signal updates, computed values)
- Service methods (HTTP calls mocked)
- Pipes and directives
- Guards (canActivate)
- Form validation

**What NOT to Test**:
- Angular framework internals
- Third-party library internals (Angular Material)
- Trivial getters/setters

**Run Tests**:
```bash
cd apps/web
npm test

# Watch mode
npm test -- --watch

# Coverage
npm test -- --coverage
```

### E2E Tests

**Framework**: Cypress

**Location**: `apps/web/cypress/e2e/`

**Test Structure**:
```typescript
describe('Ticket Management', () => {
  beforeEach(() => {
    // Seed database with test data
    cy.task('db:seed');

    // Login
    cy.visit('/login');
    cy.get('input[name="email"]').type('admin@demo.com');
    cy.get('input[name="password"]').type('Demo123!');
    cy.get('button[type="submit"]').click();
    cy.url().should('include', '/dashboard');
  });

  it('should create a new ticket', () => {
    cy.visit('/tickets');
    cy.get('[data-testid="create-ticket-btn"]').click();

    cy.get('input[name="title"]').type('Leak under sink');
    cy.get('select[name="priority"]').select('URGENT');
    cy.get('select[name="category"]').select('PLUMBING');
    cy.get('textarea[name="description"]').type('Water leaking from pipe');

    cy.get('button[type="submit"]').click();

    cy.url().should('match', /\/tickets\/[a-f0-9-]+/);
    cy.contains('Ticket created successfully').should('be.visible');
    cy.contains('Leak under sink').should('be.visible');
  });

  it('should update ticket priority', () => {
    cy.visit('/tickets');
    cy.get('[data-testid="ticket-row"]').first().click();

    cy.get('[data-testid="priority-select"]').select('EMERGENCY');
    cy.get('[data-testid="save-btn"]').click();

    cy.contains('Ticket updated').should('be.visible');
    cy.get('[data-testid="priority-badge"]').should('contain', 'Emergency');
  });
});
```

**Critical Flows to Test**:
- ✅ User registration and login
- ✅ Create ticket (all fields, validation)
- ✅ Update ticket status and priority
- ✅ Assign contractor to work order
- ✅ Submit quote (contractor portal)
- ✅ Approve quote (staff portal)
- ✅ Upload invoice
- ✅ Send message (draft → send flow)
- ✅ AI triage (trigger, poll, display result)
- ✅ Compliance reminder appears
- ✅ Notification bell updates

**Run Tests**:
```bash
cd apps/web
npm run e2e

# Headed mode (watch browser)
npm run e2e:open

# Specific spec
npm run e2e -- --spec cypress/e2e/tickets.cy.ts
```

## Jobs Service Testing (Node)

### Unit Tests

**Framework**: Jest

**Location**: `apps/jobs/src/**/*.test.ts`

**Test Structure**:
```typescript
describe('EmailProcessor', () => {
  let processor: EmailProcessor;
  let mockEmailProvider: jest.Mocked<IEmailProvider>;

  beforeEach(() => {
    mockEmailProvider = {
      sendEmail: jest.fn().mockResolvedValue({ success: true }),
    } as any;

    processor = new EmailProcessor(mockEmailProvider, mockDb);
  });

  it('should send email and update outbox status', async () => {
    const job = {
      id: 'job-id',
      data: {
        outboxMessageId: 'msg-id',
        to: 'test@example.com',
        subject: 'Test',
        body: 'Hello',
      },
    };

    await processor.process(job);

    expect(mockEmailProvider.sendEmail).toHaveBeenCalledWith({
      to: 'test@example.com',
      subject: 'Test',
      body: 'Hello',
    });

    // Verify outbox status updated
    const outbox = await mockDb.query('SELECT * FROM "OutboxMessages" WHERE "Id" = $1', ['msg-id']);
    expect(outbox.rows[0].Status).toBe('Completed');
  });

  it('should retry on failure', async () => {
    mockEmailProvider.sendEmail.mockRejectedValue(new Error('SMTP timeout'));

    const job = { id: 'job-id', data: { ... }, attemptsMade: 1 };

    await expect(processor.process(job)).rejects.toThrow('SMTP timeout');

    // BullMQ will retry automatically
  });
});
```

**Run Tests**:
```bash
cd apps/jobs
npm test

# Watch mode
npm test -- --watch
```

### Integration Tests

Test against real Redis + Postgres (TestContainers):

```typescript
describe('Outbox Dispatcher (Integration)', () => {
  let redis: RedisContainer;
  let postgres: PostgreSqlContainer;
  let dispatcher: OutboxDispatcher;

  beforeAll(async () => {
    redis = await new RedisContainer().start();
    postgres = await new PostgreSqlContainer().start();
    dispatcher = new OutboxDispatcher(redis.getConnectionString(), postgres.getConnectionString());
  });

  it('should poll outbox and enqueue jobs', async () => {
    // Insert test outbox message
    await db.query(`
      INSERT INTO "OutboxMessages" (...)
      VALUES (...)
    `);

    // Run dispatcher
    await dispatcher.run();

    // Verify job enqueued to BullMQ
    const queue = new Queue('send-email', { connection: redis.getConnectionString() });
    const jobs = await queue.getJobs(['waiting']);
    expect(jobs).toHaveLength(1);
  });
});
```

## AI Testing

### Schema Validation Tests

**Purpose**: Ensure AI outputs conform to JSON schemas

```typescript
describe('AI Intake Schema', () => {
  const schema = IntakeOutputSchema;

  it('should accept valid output', () => {
    const valid = {
      schemaVersion: '1.0',
      category: 'PLUMBING',
      priority: 'URGENT',
      safetyFlags: ['WATER_NEAR_ELECTRICAL'],
      missingInfo: ['Photo of leak'],
      summary: 'Leak with electrical hazard',
    };

    const result = schema.safeParse(valid);
    expect(result.success).toBe(true);
  });

  it('should reject invalid priority', () => {
    const invalid = { ...valid, priority: 'SUPER_URGENT' };

    const result = schema.safeParse(invalid);
    expect(result.success).toBe(false);
  });
});
```

### AI Provider Mock Tests

```typescript
describe('MockAiProvider', () => {
  const provider = new MockAiProvider();

  it('should return valid intake output', async () => {
    const response = await provider.callAsync({
      capability: 'intake',
      input: { description: 'Leak under sink' },
    });

    expect(response.output.category).toBe('PLUMBING');
    expect(response.output.schemaVersion).toBe('1.0');
  });
});
```

### AI Accuracy Evaluation

**Dataset**: 100 labeled tickets

**Process**:
1. Run AI triage on each ticket
2. Compare AI output to human label
3. Calculate accuracy

```typescript
describe('AI Triage Accuracy', () => {
  it('should achieve >90% category accuracy', async () => {
    const dataset = await loadEvaluationDataset();
    let correct = 0;

    for (const sample of dataset) {
      const result = await aiProvider.callAsync({
        capability: 'intake',
        input: { description: sample.description },
      });

      if (result.output.category === sample.expectedCategory) {
        correct++;
      }
    }

    const accuracy = correct / dataset.length;
    expect(accuracy).toBeGreaterThan(0.9);
  });
});
```

## Security Testing

### Penetration Testing

**Manual Testing**:
- SQL injection attempts
- XSS attempts
- CSRF bypasses
- Auth bypasses
- Multi-tenancy violations (access other org's data)

**Automated Testing**:
- **OWASP ZAP**: Baseline scan weekly
- **Snyk**: Dependency vulnerability scan on every PR
- **GitGuardian**: Secret scanning on every commit

### Multi-Tenancy Tests

```csharp
[Fact]
public async Task GetTickets_OnlyReturnsCurrentOrgTickets()
{
    // Arrange: Create tickets in Org1 and Org2
    var org1Ticket = await CreateTicketAsync(org1Id);
    var org2Ticket = await CreateTicketAsync(org2Id);

    // Act: Login as Org1 user, query tickets
    var token = await GetTokenAsync(org1UserId);
    _client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);
    var response = await _client.GetAsync("/api/v1/tickets");

    // Assert: Only Org1 ticket returned
    var tickets = await response.Content.ReadFromJsonAsync<PagedResult<TicketDto>>();
    tickets.Items.Should().ContainSingle();
    tickets.Items[0].Id.Should().Be(org1Ticket.Id);
}

[Fact]
public async Task GetTicket_FromOtherOrg_Returns404()
{
    // Arrange: Create ticket in Org2
    var org2Ticket = await CreateTicketAsync(org2Id);

    // Act: Login as Org1 user, try to access Org2 ticket
    var token = await GetTokenAsync(org1UserId);
    _client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);
    var response = await _client.GetAsync($"/api/v1/tickets/{org2Ticket.Id}");

    // Assert: 404 Not Found (not 403, to avoid leaking existence)
    response.StatusCode.Should().Be(HttpStatusCode.NotFound);
}
```

## Performance Testing

### Load Testing (k6)

**Location**: `tests/performance/`

**Scenario**: Simulate 100 concurrent users

```javascript
import http from 'k6/http';
import { check, sleep } from 'k6';

export let options = {
  vus: 100,
  duration: '5m',
};

export default function () {
  const token = __ENV.AUTH_TOKEN;

  // List tickets
  let res = http.get('https://api.maintainuk.com/api/v1/tickets', {
    headers: { 'Authorization': `Bearer ${token}` },
  });

  check(res, {
    'status is 200': (r) => r.status === 200,
    'response time < 500ms': (r) => r.timings.duration < 500,
  });

  sleep(1);
}
```

**Run**:
```bash
k6 run tests/performance/tickets.js
```

**Targets**:
- p95 response time: <500ms
- Error rate: <1%
- Throughput: 1000 req/sec

## Test Data Management

### Seed Data (Development)

```bash
dotnet run --seed
```

Creates:
- 1 demo organisation
- 5 users (admin, coordinator, viewer, contractor, tenant)
- 3 properties with 5 units
- 10 tickets (various statuses)
- 5 work orders
- 3 quotes
- 2 invoices

### Test Fixtures

**Backend**:
```csharp
public class TestDataBuilder
{
    public static MaintenanceTicket CreateTicket(
        string title = "Test ticket",
        TicketPriority priority = TicketPriority.ROUTINE)
    {
        return new MaintenanceTicket
        {
            Id = Guid.NewGuid(),
            OrgId = Guid.NewGuid(),
            Title = title,
            Priority = priority,
            Status = TicketStatus.NEW,
            CreatedAt = DateTime.UtcNow,
        };
    }
}
```

**Frontend**:
```typescript
export const mockTicket: Ticket = {
  id: 'uuid',
  ticketNumber: 'TKT-001',
  title: 'Leak under sink',
  status: 'OPEN',
  priority: 'URGENT',
  category: 'PLUMBING',
  createdAt: '2025-12-31T10:00:00Z',
};
```

## Continuous Integration

**GitHub Actions Workflow**:

```yaml
name: CI

on: [push, pull_request]

jobs:
  test-backend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-dotnet@v3
        with:
          dotnet-version: '8.0'
      - run: dotnet test apps/api --configuration Release

  test-frontend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '20'
      - run: npm ci
        working-directory: apps/web
      - run: npm test
        working-directory: apps/web

  test-jobs:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '20'
      - run: npm ci
        working-directory: apps/jobs
      - run: npm test
        working-directory: apps/jobs

  e2e:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - run: docker-compose up -d
      - run: npm run e2e
        working-directory: apps/web
```

## Test Maintenance

**Flaky Tests**:
- Investigate and fix immediately
- If unfixable, quarantine with `@Ignore` or `it.skip` and file issue

**Test Hygiene**:
- Delete obsolete tests when features removed
- Update tests when requirements change
- Refactor duplicated test code into helpers

**Review Checklist** (PR):
- [ ] All tests pass
- [ ] New features have tests
- [ ] Coverage not decreased
- [ ] No flaky tests introduced

---

**Last Updated**: 2025-12-31
**Test Coverage Dashboard**: (link to coverage report)
**CI Status**: (link to GitHub Actions)

