# MaintainUK - Application Stop Script
# This script stops all running services

Write-Host "`n" -NoNewline
Write-Host "═══════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "              🛑 MaintainUK - Stopping Application 🛑" -ForegroundColor Red
Write-Host "═══════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""

$ErrorActionPreference = "Continue"

# Get the script directory
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $scriptDir

# Stop .NET processes
Write-Host "🔧 Stopping Backend API..." -ForegroundColor Yellow
$dotnetProcesses = Get-Process | Where-Object { $_.ProcessName -like "*MaintainUk*" -or $_.ProcessName -eq "dotnet" }
if ($dotnetProcesses) {
    $dotnetProcesses | Stop-Process -Force
    Write-Host "✅ Backend API processes stopped" -ForegroundColor Green
} else {
    Write-Host "ℹ️  No Backend API processes found" -ForegroundColor Gray
}

# Stop Node processes (be careful - this might stop other Node apps)
Write-Host "`n🎨 Stopping Frontend and Jobs Service..." -ForegroundColor Yellow
$confirm = Read-Host "Stop all Node.js processes? This will stop ALL Node apps (Y/n)"
if ($confirm -ne "n" -and $confirm -ne "N") {
    $nodeProcesses = Get-Process | Where-Object { $_.ProcessName -eq "node" }
    if ($nodeProcesses) {
        $nodeProcesses | Stop-Process -Force
        Write-Host "✅ Node.js processes stopped" -ForegroundColor Green
    } else {
        Write-Host "ℹ️  No Node.js processes found" -ForegroundColor Gray
    }
} else {
    Write-Host "⏭️  Skipped Node.js processes" -ForegroundColor Gray
}

# Stop Docker services
Write-Host "`n📦 Stopping Docker services..." -ForegroundColor Yellow
$stopDocker = Read-Host "Stop Docker Compose services? (Y/n)"
if ($stopDocker -ne "n" -and $stopDocker -ne "N") {
    try {
        docker-compose down
        Write-Host "✅ Docker services stopped" -ForegroundColor Green
    } catch {
        Write-Host "⚠️  Could not stop Docker services (may not be running)" -ForegroundColor Yellow
    }
} else {
    Write-Host "⏭️  Skipped Docker services" -ForegroundColor Gray
}

Write-Host "`n" -NoNewline
Write-Host "═══════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "                  ✅ Application Stopped! ✅" -ForegroundColor Green
Write-Host "═══════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""
Write-Host "💡 TIP: Run .\start-app.ps1 to start again" -ForegroundColor Cyan
Write-Host ""
Write-Host "Press any key to exit..." -ForegroundColor Gray
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")

