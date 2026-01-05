# MaintainUK - Quick Start ⚡

## Start Everything (4 Commands)

### 1. Infrastructure
```powershell
cd C:\__property
docker-compose up -d
```

### 2. Backend API
```powershell
cd C:\__property\apps\api
dotnet run --urls "http://localhost:5000"
```

### 3. Jobs Service (Optional)
```powershell
cd C:\__property\apps\jobs
npm start
```

### 4. Frontend
```powershell
cd C:\__property\apps\web
npm start
```

## Access Application

```
Frontend: http://localhost:4200
Backend:  http://localhost:5000
```

## First Time Setup

1. **Register** at `http://localhost:4200/auth/register`
2. Create your organization and admin account
3. **Login** and start creating tickets!

## Common Commands

### Backend
```powershell
# Rebuild
cd C:\__property\apps\api
dotnet build

# New migration
dotnet ef migrations add MigrationName

# Apply migration
dotnet ef database update

# Clean build
dotnet clean
dotnet build
```

### Frontend
```powershell
# Reinstall packages
cd C:\__property\apps\web
rm -r node_modules
npm install

# Build for production
npm run build:prod

# Serve production build
npm install -g serve
serve -s dist/maintainuk-web
```

### Docker
```powershell
# View running containers
docker ps

# Stop all
docker-compose down

# Restart
docker-compose restart

# View logs
docker-compose logs -f redis
```

## Verify Services

```powershell
# Check API
curl http://localhost:5000/api/v1/tickets

# Check Redis
docker exec -it property-redis redis-cli ping

# Check MinIO
curl http://localhost:9000/minio/health/live
```

## Default Ports

| Service  | Port |
|----------|------|
| Frontend | 4200 |
| Backend  | 5000 |
| Redis    | 6379 |
| MinIO    | 9000 |
| MinIO UI | 9001 |

## Troubleshooting

### Port Already in Use
```powershell
# Find process
netstat -ano | findstr :5000

# Kill process
taskkill /PID <PID> /F
```

### API Connection Error
1. Verify API is running: `curl http://localhost:5000`
2. Check `apps/web/src/environments/environment.ts`
3. Ensure no CORS errors in browser console

### Build Errors
```powershell
# Frontend
cd apps/web
rm -r node_modules
npm install
npm start

# Backend
cd apps/api
dotnet clean
dotnet restore
dotnet build
```

## Test User Flow

1. **Register** → `http://localhost:4200/auth/register`
2. **Create Ticket** → Dashboard → "New Ticket"
3. **View Tickets** → Sidebar → "Tickets"
4. **Update Ticket** → Click ticket → Update form
5. **Logout** → User menu → "Logout"

## Production Build

```powershell
# Frontend
cd apps/web
npm run build:prod
# Output: dist/maintainuk-web/

# Backend
cd apps/api
dotnet publish -c Release -o publish
# Output: publish/
```

## Environment Files

- `apps/api/appsettings.json` - Backend config
- `apps/web/src/environments/environment.ts` - Frontend dev config
- `apps/web/src/environments/environment.prod.ts` - Frontend prod config
- `apps/jobs/.env` - Jobs service config
- `.env` - Docker Compose variables

## Documentation

- **Full Guide**: `COMPLETE_SYSTEM_GUIDE.md`
- **Implementation Plan**: `docs/IMPLEMENTATION_PLAN.md`
- **Frontend Details**: `FRONTEND_COMPLETE.md`
- **Phase 3 Complete**: `PHASE3_COMPLETE.md`
- **Phase 4 Complete**: `PHASE4_COMPLETE.md`

## Architecture

```
Angular Frontend (4200)
    ↓
.NET API (5000)
    ↓
Neon PostgreSQL
    ↓
Node Jobs Service
    ↓
Redis (6379)
```

## Status: READY ✅

All systems operational and ready for development/testing!

---

**Need help?** See `COMPLETE_SYSTEM_GUIDE.md` for detailed instructions.

