# MaintainUK - Start Application Without Docker
# This script starts the backend API, frontend, and jobs service
# assuming Postgres/Redis/MinIO (or equivalents) are already available.

param(
    [switch]$Api,
    [switch]$Web,
    [switch]$Jobs,
    [switch]$All
)

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $scriptDir

Write-Host "`n" -NoNewline
Write-Host "═══════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "      🚀 MaintainUK - Starting (No Docker Dependencies) 🚀" -ForegroundColor Green
Write-Host "═══════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""

if (-not ($Api -or $Web -or $Jobs -or $All)) {
    Write-Host "Starting all app services (API, Web, Jobs) without Docker..." -ForegroundColor Yellow
    $All = $true
}

# Delegate to dev.ps1 which handles process startup
$devScript = Join-Path $scriptDir "dev.ps1"
if (-not (Test-Path $devScript)) {
    Write-Host "❌ dev.ps1 not found at: $devScript" -ForegroundColor Red
    Write-Host "Make sure you are running this from the repository root." -ForegroundColor Yellow
    exit 1
}

Write-Host "Using dev.ps1 to start services..." -ForegroundColor Cyan

& $devScript @{
    Api  = $Api
    Web  = $Web
    Jobs = $Jobs
    All  = $All
}

Write-Host "`n✅ Application services are starting in separate windows (no Docker used)." -ForegroundColor Green
Write-Host "Frontend: http://localhost:4200" -ForegroundColor White
Write-Host "Backend:  http://localhost:5000" -ForegroundColor White
Write-Host "`nNote: Ensure your database/Redis/MinIO are reachable without Docker." -ForegroundColor Yellow
