# ======================
# MaintainUK Local Setup Script (Windows PowerShell)
# ======================

$ErrorActionPreference = "Stop"

Write-Host "🚀 MaintainUK Local Setup" -ForegroundColor Cyan
Write-Host "==========================" -ForegroundColor Cyan
Write-Host ""

# Check prerequisites
Write-Host "📋 Checking prerequisites..." -ForegroundColor Yellow

try {
    $nodeVersion = node -v
    $dotnetVersion = dotnet --version
    $dockerVersion = docker --version
} catch {
    Write-Host "❌ Missing prerequisites. Ensure Node.js, .NET SDK, and Docker are installed." -ForegroundColor Red
    exit 1
}

$nodeVersionNum = [int]($nodeVersion -replace 'v(\d+)\..*','$1')
if ($nodeVersionNum -lt 20) {
    Write-Host "❌ Node.js 20+ required (found $nodeVersion)" -ForegroundColor Red
    exit 1
}

$dotnetVersionNum = [int]($dotnetVersion.Split('.')[0])
if ($dotnetVersionNum -lt 8) {
    Write-Host "❌ .NET 8+ required (found $dotnetVersion)" -ForegroundColor Red
    exit 1
}

Write-Host "✅ Node.js $nodeVersion" -ForegroundColor Green
Write-Host "✅ .NET $dotnetVersion" -ForegroundColor Green
Write-Host "✅ Docker $dockerVersion" -ForegroundColor Green
Write-Host ""

# Setup environment
if (!(Test-Path .env)) {
    Write-Host "📝 Creating .env from template..." -ForegroundColor Yellow
    Copy-Item .env.example .env
    Write-Host "✅ .env created. Edit with your configuration." -ForegroundColor Green
    Write-Host ""
} else {
    Write-Host "⚠️  .env already exists, skipping..." -ForegroundColor Yellow
    Write-Host ""
}

# Start infrastructure
Write-Host "🐳 Starting infrastructure (Postgres, Redis, MinIO)..." -ForegroundColor Yellow
docker-compose up -d

Write-Host "⏳ Waiting for Postgres to be ready..." -ForegroundColor Yellow
do {
    Start-Sleep -Seconds 1
    $pgReady = docker exec maintainuk-postgres pg_isready -U postgres 2>$null
} until ($pgReady -match "accepting connections")

Write-Host "⏳ Waiting for Redis to be ready..." -ForegroundColor Yellow
do {
    Start-Sleep -Seconds 1
    $redisReady = docker exec maintainuk-redis redis-cli ping 2>$null
} until ($redisReady -eq "PONG")

Write-Host "✅ Infrastructure ready" -ForegroundColor Green
Write-Host ""

# Setup .NET API
Write-Host "🔧 Setting up .NET API..." -ForegroundColor Yellow
Push-Location apps/api
dotnet restore
dotnet tool install --global dotnet-ef --version 8.* 2>$null
dotnet ef database update
Pop-Location
Write-Host "✅ .NET API ready" -ForegroundColor Green
Write-Host ""

# Setup Angular
Write-Host "🔧 Setting up Angular..." -ForegroundColor Yellow
Push-Location apps/web
npm install
Pop-Location
Write-Host "✅ Angular ready" -ForegroundColor Green
Write-Host ""

# Setup Node jobs service
Write-Host "🔧 Setting up Node jobs service..." -ForegroundColor Yellow
Push-Location apps/jobs
npm install
Pop-Location
Write-Host "✅ Node jobs service ready" -ForegroundColor Green
Write-Host ""

# Seed database
Write-Host "🌱 Seeding database with demo data..." -ForegroundColor Yellow
Push-Location apps/api
dotnet run --seed
Pop-Location
Write-Host "✅ Database seeded" -ForegroundColor Green
Write-Host ""

Write-Host "✅ Setup complete!" -ForegroundColor Green
Write-Host ""
Write-Host "To start the application:" -ForegroundColor Cyan
Write-Host ""
Write-Host "  Terminal 1: cd apps/api && dotnet run" -ForegroundColor White
Write-Host "  Terminal 2: cd apps/web && npm start" -ForegroundColor White
Write-Host "  Terminal 3: cd apps/jobs && npm run dev" -ForegroundColor White
Write-Host ""
Write-Host "Then visit:" -ForegroundColor Cyan
Write-Host "  Web App: http://localhost:4200" -ForegroundColor White
Write-Host "  API: http://localhost:5000" -ForegroundColor White
Write-Host "  Swagger: http://localhost:5000/swagger" -ForegroundColor White
Write-Host ""
Write-Host "Default credentials: admin@demo.maintainuk.com / Demo123!" -ForegroundColor Yellow
Write-Host ""

