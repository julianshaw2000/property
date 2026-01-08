# MaintainUK - Application Startup Script
# This script starts all required services for the application

Write-Host "`n" -NoNewline
Write-Host "═══════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "              🚀 MaintainUK - Starting Application 🚀" -ForegroundColor Green
Write-Host "═══════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""

$ErrorActionPreference = "Continue"

# Get the script directory
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $scriptDir

# Check if Docker Desktop is running
Write-Host "🔍 Checking Docker Desktop..." -ForegroundColor Yellow
$dockerRunning = $false
try {
    docker ps | Out-Null
    $dockerRunning = $true
    Write-Host "✅ Docker is running" -ForegroundColor Green
} catch {
    Write-Host "⚠️  Docker is not running. Starting services without Docker..." -ForegroundColor Yellow
    Write-Host "   (Redis and MinIO will not be available)" -ForegroundColor Gray
}

# Start Docker Compose services if Docker is running
if ($dockerRunning) {
    Write-Host "`n📦 Starting Docker services (Redis, MinIO)..." -ForegroundColor Yellow
    docker-compose up -d
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Docker services started" -ForegroundColor Green
    } else {
        Write-Host "⚠️  Failed to start Docker services" -ForegroundColor Yellow
    }
    Start-Sleep -Seconds 2
}

# Start Backend API in a new window
Write-Host "`n🔧 Starting Backend API..." -ForegroundColor Yellow
$apiPath = Join-Path $scriptDir "apps\api"
if (Test-Path $apiPath) {
    Start-Process pwsh -ArgumentList @(
        "-NoExit",
        "-Command",
        "Set-Location '$apiPath'; Write-Host '🔧 Backend API Starting...' -ForegroundColor Cyan; dotnet run --urls 'http://localhost:5000'"
    ) -WindowStyle Normal
    Write-Host "✅ Backend API starting in new window (Port 5000)" -ForegroundColor Green
} else {
    Write-Host "❌ Backend API path not found: $apiPath" -ForegroundColor Red
}

Start-Sleep -Seconds 3

# Start Jobs Service in a new window (optional)
Write-Host "`n⚙️  Starting Jobs Service..." -ForegroundColor Yellow
$jobsPath = Join-Path $scriptDir "apps\jobs"
if (Test-Path $jobsPath) {
    $startJobs = Read-Host "Start Jobs Service? (Y/n)"
    if ($startJobs -ne "n" -and $startJobs -ne "N") {
        Start-Process pwsh -ArgumentList @(
            "-NoExit",
            "-Command",
            "Set-Location '$jobsPath'; Write-Host '⚙️  Jobs Service Starting...' -ForegroundColor Cyan; npm start"
        ) -WindowStyle Normal
        Write-Host "✅ Jobs Service starting in new window" -ForegroundColor Green
        Start-Sleep -Seconds 2
    } else {
        Write-Host "⏭️  Skipping Jobs Service" -ForegroundColor Gray
    }
} else {
    Write-Host "⚠️  Jobs Service path not found: $jobsPath" -ForegroundColor Yellow
}

# Start Frontend (web-new) in a new window
Write-Host "`n🎨 Starting Frontend (web-new)..." -ForegroundColor Yellow
$webPath = Join-Path $scriptDir "apps\web-new"
if (Test-Path $webPath) {
    Start-Process pwsh -ArgumentList @(
        "-NoExit",
        "-Command",
        "Set-Location '$webPath'; Write-Host '🎨 web-new Starting...' -ForegroundColor Cyan; npm start"
    ) -WindowStyle Normal
    Write-Host "✅ web-new starting in new window (Port 4200)" -ForegroundColor Green
} else {
    Write-Host "❌ web-new path not found: $webPath" -ForegroundColor Red
}

Write-Host "`n" -NoNewline
Write-Host "═══════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "                  ✅ Application Starting! ✅" -ForegroundColor Green
Write-Host "═══════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""
Write-Host "📍 ACCESS POINTS:" -ForegroundColor Yellow
Write-Host "   Frontend:  http://localhost:4200" -ForegroundColor White
Write-Host "   Backend:   http://localhost:5000" -ForegroundColor White
Write-Host "   API Docs:  http://localhost:5000/swagger (if enabled)" -ForegroundColor Gray
Write-Host ""
Write-Host "⏱️  WAIT TIME:" -ForegroundColor Yellow
Write-Host "   Backend:   ~5-10 seconds" -ForegroundColor White
Write-Host "   Frontend:  ~20-30 seconds" -ForegroundColor White
Write-Host ""
Write-Host "💡 TIP: Check the new terminal windows for startup logs" -ForegroundColor Cyan
Write-Host "💡 TIP: Press Ctrl+C in each window to stop services" -ForegroundColor Cyan
Write-Host ""
Write-Host "📚 DOCUMENTATION:" -ForegroundColor Yellow
Write-Host "   QUICK_START.md              - Quick reference" -ForegroundColor White
Write-Host "   COMPLETE_SYSTEM_GUIDE.md    - Full guide" -ForegroundColor White
Write-Host ""

# Wait a bit for services to start
Write-Host "⏳ Waiting for services to initialize..." -ForegroundColor Yellow
Start-Sleep -Seconds 10

# Try to open browser
Write-Host "🌐 Opening browser..." -ForegroundColor Yellow
Start-Sleep -Seconds 5
try {
    Start-Process "http://localhost:4200"
    Write-Host "✅ Browser opened" -ForegroundColor Green
} catch {
    Write-Host "⚠️  Could not open browser automatically" -ForegroundColor Yellow
    Write-Host "   Please open http://localhost:4200 manually" -ForegroundColor White
}

Write-Host "`n🎉 Setup complete! Happy coding! 🎉`n" -ForegroundColor Green
Write-Host "Press any key to exit this window..." -ForegroundColor Gray
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")

