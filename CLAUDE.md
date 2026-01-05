# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

MaintainUK is a UK property maintenance SaaS platform with multi-tenant architecture. The system manages property maintenance tickets from issue reporting through resolution, with AI-powered assistance and multi-channel communication (Portal, Email, SMS, WhatsApp).

## Development Commands

### Quick Start
```bash
# Start infrastructure (Redis, MinIO - Postgres uses Neon cloud)
docker-compose up -d

# API (terminal 1)
cd apps/api && dotnet restore && dotnet ef database update && dotnet run --seed

# Web (terminal 2)
cd apps/web && npm install && npm start

# Jobs (terminal 3)
cd apps/jobs && npm install && npm run dev
```

### Testing
```bash
# .NET API tests
cd apps/api && dotnet test
cd apps/api && dotnet test --filter "FullyQualifiedName~TicketServiceTests"  # single test class

# Angular tests
cd apps/web && npm test                                        # watch mode
cd apps/web && npm run test:ci                                 # CI mode (headless)

# Node jobs tests
cd apps/jobs && npm test
cd apps/jobs && npm test -- --testPathPattern=email            # single file
```

### Test Coverage
```bash
# .NET API coverage (outputs to apps/api/Tests/*/TestResults/)
cd apps/api && dotnet test --collect:"XPlat Code Coverage"

# Angular coverage (outputs to apps/web/coverage/)
cd apps/web && npm run test:coverage

# Node jobs coverage (outputs to apps/jobs/coverage/)
cd apps/jobs && npm run test:coverage
```

### Database Migrations
```bash
cd apps/api
dotnet ef migrations add MigrationName
dotnet ef database update
```

### Linting
```bash
cd apps/web && npm run lint
cd apps/jobs && npm run lint
```

## Architecture

### Project Structure
- **apps/api** - .NET 8 Web API with Clean Architecture layers:
  - `Domain/` - Entities, value objects, enums
  - `Application/` - Use cases, services
  - `Contracts/` - DTOs, requests, responses
  - `Infrastructure/` - EF Core, external integrations (Persistence, Security, Services)
- **apps/web** - Angular 18 SPA with standalone components and signals
  - `core/` - Auth, guards, interceptors
  - `features/` - Domain feature modules
- **apps/jobs** - Node.js BullMQ worker service for background processing
- **packages/shared** - Shared TypeScript types and Zod schemas

### Data Flow
API uses Repository + Unit of Work patterns. Never inject DbContext directly into controllers or services. Repositories return materialized results (DTOs or IEnumerable), not IQueryable.

### Test Projects
- **apps/api/Tests/MaintainUk.Api.Tests** - xUnit tests with FluentAssertions, Moq, EF Core InMemory
  - `Domain/Entities/` - Entity unit tests
  - `Application/Services/` - Service tests with in-memory database
- **apps/web/src/** - Jasmine/Karma tests (*.spec.ts files co-located with source)
  - Component tests use `TestBed` with spy services
  - Mock signals with `signal()` in spy property bags
- **apps/jobs/src/** - Jest tests (*.test.ts files co-located with source)
  - Mock logger and external dependencies with `jest.mock()`
  - Processor tests use mock `Job` objects

## Code Conventions

### C# (.NET API)
- Fluent API only for EF Core configuration (no Data Annotations)
- All EF calls must be async (`ToListAsync`, `FirstOrDefaultAsync`, etc.)
- Use `.AsNoTracking()` for read-only queries
- Use `.Select()` projection to DTOs instead of fetching full entities
- FluentValidation for request validation
- Custom specific exceptions (not generic `Exception`)
- Allman-style braces (new line), 4-space indentation
- Test naming: `Method_Scenario_ExpectedResult`

### Angular (Web)
- Standalone components only (no NgModules)
- Use `httpResource` for data fetching, not HttpClient directly
- Use Signal Forms (`form()`, `field()`) for new forms, not Reactive Forms
- Use `input()` function, not `@Input()` decorator
- Component state via `signal()`, shared state via NgRx SignalStore
- Kebab-case file naming, co-located .ts/.html/.scss files

### TypeScript (Jobs)
- Zod for schema validation
- BullMQ processors in `src/processors/`
- Scheduled jobs in `src/schedulers/`

## Commit Convention

Use Conventional Commits:
```
feat(tickets): add AI triage capability
fix(auth): resolve token refresh race condition
refactor(messaging): extract channel logic
test(tickets): add timeline event tests
```

## Default Dev Credentials

- Email: `admin@demo.maintainuk.com`
- Password: `Demo123!`

## URLs

- Web: http://localhost:4200
- API: http://localhost:5000
- Swagger: http://localhost:5000/swagger
- MinIO Console: http://localhost:9001
