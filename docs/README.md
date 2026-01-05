# MaintainUK

**UK-focused Property Maintenance SaaS** - Production-grade multi-tenant system

## Overview

MaintainUK is a comprehensive property maintenance management platform designed specifically for UK property managers, landlords, contractors, and tenants. The system provides end-to-end workflow management from issue reporting to resolution, with AI-powered assistance, multi-channel communication, and compliance tracking.

## Key Features

### Core Functionality
- ✅ Multi-tenant organisation management
- ✅ Property, unit, and tenancy management
- ✅ Maintenance ticket lifecycle management
- ✅ Work order assignment and tracking
- ✅ Quote and invoice management with AI extraction
- ✅ Compliance tracking (Gas Safety, EPC, EICR, Fire Alarms)
- ✅ Multi-channel messaging (Portal, Email, SMS, WhatsApp)
- ✅ Contractor and tenant portals

### AI-Powered Features
- 🤖 Ticket intake and triage
- 🤖 Timeline summarisation
- 🤖 Message drafting (human-in-loop)
- 🤖 Contractor assignment suggestions
- 🤖 Duplicate issue detection
- 🤖 SLA and risk prediction
- 🤖 Invoice extraction and anomaly detection
- 🤖 Compliance explanations
- 🤖 Reporting insights

### Advanced Features
- 📊 Usage metering and SaaS billing
- 🔔 Intelligent notifications and alerts
- 📱 SMS and WhatsApp integration (feature-flagged)
- 🔒 RBAC with least privilege
- 📈 Reporting and analytics
- 🔄 Background job processing (BullMQ)

## Tech Stack

### Frontend
- **Angular** (latest, standalone components)
- **Angular Material** + **Tailwind CSS**
- **Angular Signals** (state management)
- **Reactive Forms**
- **TypeScript** (strict mode)

### Backend
- **.NET 8 Web API**
- **Entity Framework Core**
- **PostgreSQL 16**
- **JWT Authentication**
- **FluentValidation**

### Infrastructure
- **BullMQ** + **Redis** (job queue)
- **MinIO/S3** (file storage)
- **Docker Compose** (local dev)

### External Services
- **Resend/SendGrid** (email)
- **Twilio** (SMS/WhatsApp)
- **OpenAI** (AI provider)
- **Stripe** (billing)

## Quick Start

### Prerequisites

- [Node.js](https://nodejs.org/) 20+
- [.NET 8 SDK](https://dotnet.microsoft.com/download)
- [Docker Desktop](https://www.docker.com/products/docker-desktop)
- [Git](https://git-scm.com/)

### Local Setup

```bash
# Clone repository
git clone <repo-url>
cd maintainuk

# Copy environment template
cp .env.example .env
# Edit .env with your local configuration

# Start infrastructure (Postgres, Redis, MinIO)
docker-compose up -d

# Setup and start .NET API
cd apps/api
dotnet restore
dotnet ef database update
dotnet run --seed
# API runs on http://localhost:5000
# Swagger: http://localhost:5000/swagger

# Setup and start Angular
cd apps/web
npm install
npm start
# Web app runs on http://localhost:4200

# Setup and start Node jobs service
cd apps/jobs
npm install
npm run dev
# Jobs service logs show status
```

### Verify Installation

```bash
# Check API health
curl http://localhost:5000/health
# Expected: {"status":"Healthy"}

# Check Postgres
docker exec -it maintainuk-postgres psql -U postgres -c "SELECT 1"

# Check Redis
docker exec -it maintainuk-redis redis-cli ping
# Expected: PONG

# Check MinIO
curl http://localhost:9000/minio/health/live
# Expected: 200 OK
```

### Default Credentials (Development)

```
Email: admin@demo.maintainuk.com
Password: Demo123!
Organisation: Demo Property Management
```

## Project Structure

```
/maintainuk
├── /apps
│   ├── /api                .NET 8 Web API
│   │   ├── /Api            Minimal API endpoints
│   │   ├── /Application    Use cases, services
│   │   ├── /Contracts      DTOs, requests, responses
│   │   ├── /Domain         Entities, value objects
│   │   ├── /Infrastructure EF Core, external integrations
│   │   └── Program.cs      Entry point
│   ├── /jobs               Node BullMQ worker service
│   │   ├── /src
│   │   │   ├── /processors BullMQ job processors
│   │   │   ├── /schedulers Repeatable jobs
│   │   │   └── index.ts    Service entry
│   │   └── package.json
│   └── /web                Angular application
│       └── /src/app
│           ├── /core       Auth, guards, interceptors
│           ├── /shared     Reusable components
│           ├── /features   Domain features
│           └── /layouts    App shell
├── /packages
│   └── /shared             Shared types, schemas, contracts
│       ├── /schemas        JSON schemas (Zod)
│       ├── /types          TypeScript types
│       └── /contracts      C# DTOs
├── /docs                   Documentation
├── /scripts                Setup and utility scripts
├── docker-compose.yml      Local infrastructure
└── .env.example            Environment template
```

## Documentation

- [ASSUMPTIONS.md](./ASSUMPTIONS.md) - Business and technical assumptions
- [ARCHITECTURE.md](./ARCHITECTURE.md) - System architecture
- [SECURITY.md](./SECURITY.md) - Security model and controls
- [API.md](./API.md) - API reference
- [AI.md](./AI.md) - AI capabilities and guardrails
- [DB.md](./DB.md) - Database schema
- [UK_COMPLIANCE.md](./UK_COMPLIANCE.md) - UK legal compliance
- [RUNBOOK.md](./RUNBOOK.md) - Operations guide
- [ROADMAP.md](./ROADMAP.md) - Development roadmap
- [TESTING.md](./TESTING.md) - Test strategy
- [IMPLEMENTATION_PLAN.md](./IMPLEMENTATION_PLAN.md) - Implementation plan

## Development Workflow

### Branching Strategy

- `main` - production-ready code
- `develop` - integration branch
- `feat/<feature-name>` - feature branches
- `fix/<bug-name>` - bug fixes

### Commit Convention

We use [Conventional Commits](https://www.conventionalcommits.org/):

```
feat(tickets): add AI triage capability
fix(auth): resolve token refresh race condition
chore(deps): update Angular to v18
docs(readme): add local setup instructions
refactor(messaging): extract channel logic
test(tickets): add timeline event tests
```

### Pull Request Process

1. Create feature branch from `develop`
2. Implement changes with tests
3. Ensure linting passes
4. Create PR with clear description
5. Request code review
6. Address feedback
7. Merge after approval

## Testing

```bash
# .NET unit tests
cd apps/api
dotnet test

# .NET integration tests
dotnet test --filter "Category=Integration"

# Angular unit tests
cd apps/web
npm test

# Angular E2E tests
npm run e2e

# Node jobs service tests
cd apps/jobs
npm test
```

## Deployment

See [RUNBOOK.md](./RUNBOOK.md) for detailed deployment instructions.

### Environment Variables

Required environment variables are documented in `.env.example`.

**Never commit secrets to source control.**

## Contributing

1. Read [ARCHITECTURE.md](./ARCHITECTURE.md) and [SECURITY.md](./SECURITY.md)
2. Follow code style (ESLint, Prettier, dotnet format)
3. Write tests for new features
4. Update documentation
5. Submit PR with clear description

## License

Proprietary - All rights reserved

## Support

- **Issues**: GitHub Issues
- **Email**: support@maintainuk.com
- **Slack**: #maintainuk (internal)

---

**Built with ❤️ for UK property professionals**

