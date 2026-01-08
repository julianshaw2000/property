<#
  MaintainUK - Simple runner (no Docker)
  Runs all app services (API, Web, Jobs) without starting Docker/compose.
#>

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $scriptDir

$noDockerScript = Join-Path $scriptDir "start-app-nodocker.ps1"

if (-not (Test-Path $noDockerScript)) {
    Write-Host "❌ start-app-nodocker.ps1 not found at: $noDockerScript" -ForegroundColor Red
    Write-Host "Run this from the repository root (C:\__property)." -ForegroundColor Yellow
    exit 1
}

Write-Host "`n🚀 Running all apps without Docker (API, Web, Jobs)..." -ForegroundColor Cyan

# Delegate to the existing no-docker startup script, forcing -All
& $noDockerScript -All

Write-Host "`n✅ All services have been started in separate windows." -ForegroundColor Green

