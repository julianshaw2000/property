# MaintainUK - Startup Scripts

## Available Scripts

### 🚀 Main Startup Scripts

#### Windows (PowerShell)
```powershell
.\start-app.ps1
```
**What it does:**
- ✅ Checks Docker Desktop status
- ✅ Starts Redis + MinIO (if Docker running)
- ✅ Starts Backend API in new window (Port 5000)
- ✅ Prompts to start Jobs Service (optional)
- ✅ Starts Frontend in new window (Port 4200)
- ✅ Automatically opens browser to http://localhost:4200

**Usage:**
1. Open PowerShell in project root
2. Run `.\start-app.ps1`
3. Wait ~30 seconds for everything to start
4. Browser opens automatically

---

#### Linux/Mac (Bash)
```bash
./start-app.sh
```
**What it does:**
- Same as Windows version but for Unix systems
- Opens new terminal windows for each service

**First time setup:**
```bash
chmod +x start-app.sh
./start-app.sh
```

---

### 🛑 Stop Script

#### Windows (PowerShell)
```powershell
.\stop-app.ps1
```
**What it does:**
- ✅ Stops Backend API processes
- ✅ Stops Frontend and Jobs Service (with confirmation)
- ✅ Stops Docker services (with confirmation)

**Usage:**
```powershell
.\stop-app.ps1
# Follow the prompts
```

---

### ⚡ Quick Dev Script (Windows)

For faster development when you only need specific services:

```powershell
# Start backend only
.\dev.ps1 -Api

# Start frontend only
.\dev.ps1 -Web

# Start jobs service only
.\dev.ps1 -Jobs

# Start everything
.\dev.ps1 -All
```

**Examples:**
```powershell
# Working on backend - start API only
.\dev.ps1 -Api

# Working on frontend - start web only (assumes API already running)
.\dev.ps1 -Web

# Full startup
.\dev.ps1 -All
```

---

## Manual Commands (Alternative)

If you prefer to run commands manually:

### 1. Start Infrastructure
```powershell
docker-compose up -d
```

### 2. Start Backend
```powershell
cd apps/api
dotnet run --urls "http://localhost:5000"
```

### 3. Start Jobs Service (Optional)
```powershell
cd apps/jobs
npm start
```

### 4. Start Frontend
```powershell
cd apps/web
npm start
```

---

## Troubleshooting

### Script Execution Policy Error (Windows)
If you get "cannot be loaded because running scripts is disabled":

```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

### Permission Denied (Linux/Mac)
```bash
chmod +x start-app.sh
```

### Port Already in Use
```powershell
# Find process using port
netstat -ano | findstr :5000

# Kill process
taskkill /PID <PID> /F
```

### Docker Not Running
The script will detect and skip Docker services. You can:
1. Start Docker Desktop manually
2. Run script again, or
3. Continue without Redis/MinIO (some features may not work)

---

## What Each Service Does

### Backend API (Port 5000)
- RESTful API endpoints
- Authentication (JWT)
- Database operations (Neon PostgreSQL)
- Business logic

### Frontend (Port 4200)
- Angular application
- User interface
- Communicates with Backend API

### Jobs Service (Optional)
- Background job processing
- BullMQ queue processing
- Email sending (stub)
- AI processing (stub)

### Docker Services
- **Redis** (Port 6379): Queue backend for BullMQ
- **MinIO** (Ports 9000, 9001): S3-compatible file storage

---

## Service Startup Times

| Service | Time | Ready When |
|---------|------|------------|
| Docker | ~2s | `docker ps` shows containers |
| Backend API | ~5-10s | "Now listening on: http://localhost:5000" |
| Frontend | ~20-30s | "Angular Live Development Server..." |
| Jobs Service | ~5s | "Jobs service started" |

---

## Verification Checklist

After running startup script:

- [ ] Docker containers running: `docker ps`
- [ ] Backend responding: `curl http://localhost:5000`
- [ ] Frontend accessible: Open `http://localhost:4200`
- [ ] No port conflicts
- [ ] All terminal windows show successful startup

---

## Recommended Workflow

### Daily Development
1. Morning: `.\start-app.ps1` - Start everything
2. Coding: Make changes, hot-reload works
3. End of day: `.\stop-app.ps1` - Stop everything

### Backend-Only Development
```powershell
.\dev.ps1 -Api
# Make backend changes, API hot-reloads
```

### Frontend-Only Development
```powershell
# Start API first (once)
.\dev.ps1 -Api

# Then start frontend (in another terminal)
.\dev.ps1 -Web
# Make frontend changes, Angular hot-reloads
```

---

## Environment Variables

Scripts use default values from:
- `apps/api/appsettings.json` - Backend config
- `apps/web/src/environments/environment.ts` - Frontend config
- `.env` - Docker Compose variables

---

## Tips

💡 **Tip 1**: Keep terminal windows open to see live logs
💡 **Tip 2**: Press `Ctrl+C` in each window to stop that service
💡 **Tip 3**: Frontend takes longest to start (~30 seconds)
💡 **Tip 4**: Use `.\dev.ps1` for faster individual service restarts
💡 **Tip 5**: Check `QUICK_START.md` for more commands

---

## Support

If scripts don't work:
1. Check `COMPLETE_SYSTEM_GUIDE.md` for manual steps
2. Verify prerequisites installed (Node.js, .NET 8, Docker)
3. Check port availability (5000, 4200, 6379, 9000)
4. Review terminal output for specific errors

---

## Script Customization

Want to modify startup behavior? Edit scripts:
- `start-app.ps1` - Main Windows startup
- `stop-app.ps1` - Windows shutdown
- `dev.ps1` - Quick dev switches
- `start-app.sh` - Linux/Mac startup

Common customizations:
- Change ports
- Skip certain services
- Add additional startup checks
- Customize wait times

---

**Happy coding! 🚀**

