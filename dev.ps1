# MaintainUK - Quick Dev Script
# Minimal script for quick development startup (assumes services are already running)

param(
    [switch]$Api,
    [switch]$Web,
    [switch]$Jobs,
    [switch]$All
)

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path

function Show-Usage {
    Write-Host "`nMaintainUK Quick Dev Script" -ForegroundColor Cyan
    Write-Host "Usage: .\dev.ps1 [-Api] [-Web] [-Jobs] [-All]`n" -ForegroundColor Yellow
    Write-Host "Options:" -ForegroundColor Yellow
    Write-Host "  -Api   Start Backend API only" -ForegroundColor White
    Write-Host "  -Web   Start Frontend only" -ForegroundColor White
    Write-Host "  -Jobs  Start Jobs Service only" -ForegroundColor White
    Write-Host "  -All   Start all services`n" -ForegroundColor White
    Write-Host "Examples:" -ForegroundColor Yellow
    Write-Host "  .\dev.ps1 -Api        # Start backend only" -ForegroundColor Gray
    Write-Host "  .\dev.ps1 -Web        # Start frontend only" -ForegroundColor Gray
    Write-Host "  .\dev.ps1 -All        # Start everything`n" -ForegroundColor Gray
}

if (-not ($Api -or $Web -or $Jobs -or $All)) {
    Show-Usage
    exit
}

Write-Host "`n🚀 MaintainUK Quick Dev Start`n" -ForegroundColor Cyan

if ($Api -or $All) {
    Write-Host "🔧 Starting Backend API..." -ForegroundColor Yellow
    Set-Location "$scriptDir\apps\api"
    Start-Process pwsh -ArgumentList "-NoExit", "-Command", "dotnet run --urls 'http://localhost:5000'"
    Set-Location $scriptDir
}

if ($Jobs -or $All) {
    Write-Host "⚙️  Starting Jobs Service..." -ForegroundColor Yellow
    Set-Location "$scriptDir\apps\jobs"
    Start-Process pwsh -ArgumentList "-NoExit", "-Command", "npm start"
    Set-Location $scriptDir
}

if ($Web -or $All) {
    Write-Host "🎨 Starting Frontend..." -ForegroundColor Yellow
    Set-Location "$scriptDir\apps\web-new"
    Start-Process pwsh -ArgumentList "-NoExit", "-Command", "npm start"
    Set-Location $scriptDir
}

Write-Host "`n✅ Services starting in new windows!`n" -ForegroundColor Green
Write-Host "Frontend: http://localhost:4200" -ForegroundColor White
Write-Host "Backend:  http://localhost:5000`n" -ForegroundColor White

