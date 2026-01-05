# MaintainUK

**UK Property Maintenance SaaS** - Full-featured multi-tenant system

## Quick Start

```bash
# 1. Start infrastructure
docker-compose up -d

# 2. Setup .NET API (terminal 1)
cd apps/api
dotnet restore
dotnet ef database update
dotnet run --seed

# 3. Setup Angular (terminal 2)
cd apps/web
npm install
npm start

# 4. Setup Node jobs service (terminal 3)
cd apps/jobs
npm install
npm run dev
```

Visit:
- **Web App**: http://localhost:4200
- **API**: http://localhost:5000
- **Swagger**: http://localhost:5000/swagger

**Default credentials**: `admin@demo.maintainuk.com` / `Demo123!`

## Documentation

Full documentation is in `/docs`:

- [README.md](./docs/README.md) - System overview
- [IMPLEMENTATION_PLAN.md](./docs/IMPLEMENTATION_PLAN.md) - Phase-by-phase implementation
- [ARCHITECTURE.md](./docs/ARCHITECTURE.md) - System architecture
- [API.md](./docs/API.md) - API reference
- [SECURITY.md](./docs/SECURITY.md) - Security model
- [RUNBOOK.md](./docs/RUNBOOK.md) - Operations guide

## Project Structure

```
/maintainuk
├── /apps
│   ├── /api                .NET 8 Web API
│   ├── /jobs               Node BullMQ worker service
│   └── /web                Angular application
├── /packages
│   └── /shared             Shared types, schemas, contracts
├── /docs                   Documentation
├── /scripts                Setup and utility scripts
├── docker-compose.yml      Local infrastructure
└── .env.example            Environment template
```

## Tech Stack

- **Frontend**: Angular (standalone components, signals)
- **Backend**: .NET 8 Web API + EF Core + PostgreSQL
- **Jobs**: Node.js + BullMQ + Redis
- **Storage**: MinIO (S3-compatible)
- **AI**: OpenAI (configurable provider)
- **Email**: Resend/SendGrid
- **SMS/WhatsApp**: Twilio
- **Billing**: Stripe

## Development

```bash
# Run tests
cd apps/api && dotnet test
cd apps/web && npm test
cd apps/jobs && npm test

# Create database migration
cd apps/api
dotnet ef migrations add MigrationName

# Apply migrations
dotnet ef database update
```

## License

Proprietary - All rights reserved

---

**For detailed setup instructions, see** [docs/README.md](./docs/README.md)

