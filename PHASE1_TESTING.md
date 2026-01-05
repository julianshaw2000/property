# Phase 1: Repository Scaffolding - Testing Checklist

## Overview

Phase 1 has created the complete monorepo structure with all foundational pieces. This document guides you through testing each component.

## Prerequisites Check

Run these commands to verify your environment:

```powershell
# Check Node.js version (should be 20+)
node --version

# Check .NET version (should be 8.0+)
dotnet --version

# Check Docker (should be running)
docker --version
docker ps
```

## Test 1: Docker Infrastructure

### Start Infrastructure

```powershell
# Start Postgres, Redis, MinIO
docker-compose up -d

# Wait 30 seconds for services to initialize
Start-Sleep -Seconds 30
```

### Verify Postgres

```powershell
docker exec maintainuk-postgres pg_isready -U postgres
# Expected: "localhost:5432 - accepting connections"

docker exec -it maintainuk-postgres psql -U postgres -c "SELECT version();"
# Should show PostgreSQL 16.x
```

### Verify Redis

```powershell
docker exec maintainuk-redis redis-cli -a redis123 ping
# Expected: "PONG"
```

### Verify MinIO

```powershell
# Check health
curl http://localhost:9000/minio/health/live
# Should return 200 OK

# Open MinIO console in browser
# http://localhost:9001
# Login: minioadmin / minioadmin123
```

✅ **Pass Criteria**: All three services are running and responsive

---

## Test 2: Shared Package

### Install Dependencies

```powershell
cd packages/shared
npm install
```

### Build Shared Package

```powershell
npm run build
```

### Verify Output

```powershell
dir dist
# Should see: index.js, index.d.ts, types/, schemas/, constants/
```

✅ **Pass Criteria**: Package builds without errors, dist folder created

---

## Test 3: Node Jobs Service

### Install Dependencies

```powershell
cd ../../apps/jobs
npm install
```

### Start Jobs Service

```powershell
npm run dev
```

### Expected Output

You should see logs similar to:

```
🚀 MaintainUK Jobs Service starting...
Starting outbox dispatcher...
Outbox dispatcher started
Starting BullMQ processors...
Processors will be implemented in Phase 5
Starting scheduled jobs...
Schedulers will be implemented in Phase 5
✅ All services started successfully
```

### Verify Connections

The logs should show:
- ✅ Redis connected
- ✅ Database pool connected
- ✅ Dispatcher polling every 5 seconds

**Leave this running** and open a new terminal for next tests.

✅ **Pass Criteria**: Jobs service starts without errors, connects to Redis and Postgres

---

## Test 4: .NET API

### Restore Packages

```powershell
cd ../../apps/api
dotnet restore
```

### Build API

```powershell
dotnet build
```

### Run API

```powershell
dotnet run
```

### Expected Output

```
info: Microsoft.Hosting.Lifetime[14]
      Now listening on: http://localhost:5000
info: Microsoft.Hosting.Lifetime[0]
      Application started. Press Ctrl+C to shut down.
```

### Test Health Endpoint

In another terminal:

```powershell
curl http://localhost:5000/health
```

Expected response:

```json
{
  "status": "Healthy",
  "timestamp": "2025-12-31T..."
}
```

### Test Version Endpoint

```powershell
curl http://localhost:5000/api/v1/version
```

Expected response:

```json
{
  "version": "1.0.0",
  "environment": "Development",
  "timestamp": "2025-12-31T..."
}
```

### Test Swagger UI

Open browser: http://localhost:5000/swagger

You should see:
- ✅ Swagger UI loads
- ✅ Two endpoints visible: `/health` and `/api/v1/version`
- ✅ "Try it out" works for both endpoints

**Leave API running** and open a new terminal for next test.

✅ **Pass Criteria**: API starts, health check returns 200, Swagger UI loads

---

## Test 5: Angular Web App

### Install Dependencies

```powershell
cd ../../apps/web
npm install
```

### Start Development Server

```powershell
npm start
```

### Expected Output

```
✔ Browser application bundle generation complete.
Initial Chunk Files | Names   | Raw Size
main.js             | main    | ...
...
✔ Compiled successfully.
** Angular Live Development Server is listening on localhost:4200 **
```

### Test in Browser

Open: http://localhost:4200

You should see:

- ✅ Page title: "🏠 MaintainUK"
- ✅ "Phase 1 Complete" section with checkmarks
- ✅ **API Connection: ✅** (green box)
  - Shows API version, environment
- ✅ "Next Steps: Phase 2" section

### If API Connection Shows Error

Make sure:
1. .NET API is running on http://localhost:5000
2. CORS is configured (it is, in Program.cs)
3. No firewall blocking localhost:5000

✅ **Pass Criteria**: Angular app loads, connects to API successfully, displays Phase 1 completion status

---

## Test 6: Environment Configuration

### Verify .env File

```powershell
cd ../../..
cat .env.example
```

✅ **Pass Criteria**: .env.example contains all required variables

### Create .env (if not exists)

```powershell
Copy-Item .env.example .env
```

---

## Test 7: Documentation Verification

### List Documentation Files

```powershell
dir docs
```

Expected files (11 + 1):
1. README.md
2. ASSUMPTIONS.md
3. ARCHITECTURE.md
4. SECURITY.md
5. API.md
6. AI.md
7. DB.md
8. UK_COMPLIANCE.md
9. RUNBOOK.md
10. ROADMAP.md
11. TESTING.md
12. IMPLEMENTATION_PLAN.md (master plan)

✅ **Pass Criteria**: All 12 documentation files exist

---

## Test 8: File Structure Verification

### Verify Folder Structure

```powershell
tree /F /A
```

Expected structure:

```
C:\__property
├── docs\                     (12 files)
├── scripts\
│   ├── setup.sh              (Unix setup script)
│   └── setup.ps1             (Windows setup script)
├── apps\
│   ├── api\                  (.NET Web API)
│   │   ├── Program.cs
│   │   ├── MaintainUk.Api.csproj
│   │   └── appsettings.json
│   ├── web\                  (Angular app)
│   │   ├── src\
│   │   │   ├── app\
│   │   │   ├── index.html
│   │   │   └── main.ts
│   │   ├── angular.json
│   │   └── package.json
│   └── jobs\                 (Node BullMQ worker)
│       ├── src\
│       │   ├── index.ts
│       │   ├── lib\
│       │   ├── processors\
│       │   └── schedulers\
│       └── package.json
├── packages\
│   └── shared\               (Shared types/schemas)
│       ├── src\
│       │   ├── types\
│       │   ├── schemas\
│       │   └── constants\
│       └── package.json
├── docker-compose.yml
├── .env.example
├── .gitignore
└── README.md
```

✅ **Pass Criteria**: All key folders and files exist

---

## Test 9: End-to-End Smoke Test

With all services running (Docker, Jobs, API, Web), perform this test:

1. ✅ Open http://localhost:4200
2. ✅ Verify "API Connection: ✅" is green
3. ✅ Open http://localhost:5000/swagger
4. ✅ Try "GET /health" → Returns 200
5. ✅ Try "GET /api/v1/version" → Returns version object
6. ✅ Check Jobs service terminal → See "Dispatcher" logs every 5 seconds
7. ✅ Open http://localhost:9001 (MinIO console)
8. ✅ Login with minioadmin / minioadmin123

✅ **Pass Criteria**: All 8 checks pass

---

## Test 10: Clean Stop

### Stop All Services Gracefully

1. Stop Angular (Ctrl+C in web terminal)
2. Stop .NET API (Ctrl+C in API terminal)
3. Stop Jobs service (Ctrl+C in jobs terminal)
4. Stop Docker infrastructure:

```powershell
docker-compose down
```

### Verify Cleanup

```powershell
docker ps
# Should show no maintainuk containers

docker volume ls
# maintainuk volumes still exist (data persisted)
```

✅ **Pass Criteria**: All services stop cleanly without errors

---

## Phase 1 Acceptance Criteria

Mark each item when verified:

- [ ] Docker Compose configuration valid
- [ ] All 3 infrastructure services start (Postgres, Redis, MinIO)
- [ ] Shared package builds successfully
- [ ] Node jobs service starts and connects to Redis + Postgres
- [ ] .NET API starts, health check returns 200, Swagger UI loads
- [ ] Angular app starts and successfully calls API
- [ ] All 12 documentation files exist
- [ ] Folder structure matches expected layout
- [ ] End-to-end smoke test passes
- [ ] Clean shutdown works

---

## Troubleshooting

### Docker Won't Start

```powershell
# Reset Docker
docker-compose down -v  # WARNING: Deletes data
docker-compose up -d
```

### Port Conflicts

If port 5000, 5432, 6379, or 4200 is in use:

```powershell
# Find process using port (Windows)
netstat -ano | findstr :5000

# Kill process
taskkill /PID <process-id> /F
```

### Node Modules Issues

```powershell
# Clean install
Remove-Item -Recurse -Force node_modules
Remove-Item package-lock.json
npm install
```

### .NET Build Fails

```powershell
# Clean and rebuild
dotnet clean
dotnet restore
dotnet build
```

---

## Next Steps

Once all tests pass, **Phase 1 is complete** ✅

**Move to Phase 2**: Database Schema & Migrations

See: `docs/IMPLEMENTATION_PLAN.md` (Phase 2 section)

---

**Last Updated**: 2025-12-31
**Phase**: 1 of 9

