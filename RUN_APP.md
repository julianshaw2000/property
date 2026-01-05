# 🚀 How to Run MaintainUK

## Easiest Way - One Command! ⚡

### Windows
```powershell
.\start-app.ps1
```

### Linux/Mac
```bash
./start-app.sh
```

That's it! The script will:
1. ✅ Start Docker services (Redis, MinIO)
2. ✅ Start Backend API (Port 5000)
3. ✅ Start Frontend (Port 4200)
4. ✅ Open your browser automatically

**Wait ~30 seconds** and you're ready to go!

---

## Access the Application

Once started, open your browser to:
```
http://localhost:4200
```

### First Time?
1. Click **"Register here"**
2. Create your organization
3. Start managing properties!

---

## Stop the Application

### Windows
```powershell
.\stop-app.ps1
```

Or press `Ctrl+C` in each terminal window.

---

## Quick Commands

### Start Specific Services

**Backend only:**
```powershell
.\dev.ps1 -Api
```

**Frontend only:**
```powershell
.\dev.ps1 -Web
```

**Everything:**
```powershell
.\dev.ps1 -All
```

---

## Manual Start (Alternative)

If scripts don't work, run these commands in separate terminals:

**Terminal 1 - Infrastructure:**
```powershell
docker-compose up -d
```

**Terminal 2 - Backend:**
```powershell
cd apps/api
dotnet run --urls "http://localhost:5000"
```

**Terminal 3 - Frontend:**
```powershell
cd apps/web
npm start
```

Then open `http://localhost:4200`

---

## Troubleshooting

### "Script cannot be loaded" (Windows)
```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

### Port already in use
```powershell
# Find what's using port 5000
netstat -ano | findstr :5000

# Kill that process
taskkill /PID <PID> /F
```

### Docker not running
1. Start Docker Desktop
2. Wait for it to fully start (green icon)
3. Run startup script again

---

## Documentation

- **SCRIPTS_README.md** - Detailed script documentation
- **QUICK_START.md** - Quick reference commands
- **COMPLETE_SYSTEM_GUIDE.md** - Full setup guide

---

## Need Help?

Check the comprehensive guides in the root folder or see `COMPLETE_SYSTEM_GUIDE.md` for detailed troubleshooting.

**Happy property managing! 🏠**

