# Quick Frontend Restart Script
# Use this if the frontend shows a blank screen

Write-Host "`n🔄 Restarting Frontend...`n" -ForegroundColor Cyan

# Stop any running Node processes
Write-Host "1️⃣  Stopping existing Node processes..." -ForegroundColor Yellow
$nodeProcesses = Get-Process | Where-Object {$_.ProcessName -eq "node"}
if ($nodeProcesses) {
    $nodeProcesses | Stop-Process -Force
    Write-Host "   ✅ Stopped $($nodeProcesses.Count) Node process(es)" -ForegroundColor Green
    Start-Sleep -Seconds 2
} else {
    Write-Host "   ℹ️  No Node processes found" -ForegroundColor Gray
}

# Clean build artifacts
Write-Host "`n2️⃣  Cleaning build artifacts..." -ForegroundColor Yellow
Set-Location C:\__property\apps\web
if (Test-Path ".angular") {
    Remove-Item -Recurse -Force .angular
    Write-Host "   ✅ Cleaned .angular cache" -ForegroundColor Green
}
if (Test-Path "dist") {
    Remove-Item -Recurse -Force dist
    Write-Host "   ✅ Cleaned dist folder" -ForegroundColor Green
}

# Verify node_modules
Write-Host "`n3️⃣  Checking dependencies..." -ForegroundColor Yellow
if (!(Test-Path "node_modules/@angular/core")) {
    Write-Host "   ⚠️  Angular packages missing, installing..." -ForegroundColor Yellow
    npm install
} else {
    Write-Host "   ✅ Dependencies OK" -ForegroundColor Green
}

# Start fresh
Write-Host "`n4️⃣  Starting Angular dev server...`n" -ForegroundColor Yellow
Write-Host "═══════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "   WATCH THIS TERMINAL FOR COMPILATION STATUS" -ForegroundColor Yellow
Write-Host "═══════════════════════════════════════════════════════════════`n" -ForegroundColor Cyan
Write-Host "Wait for these messages:" -ForegroundColor White
Write-Host "  ✔ Browser application bundle generation complete." -ForegroundColor Green
Write-Host "  ** Angular Live Development Server is listening on localhost:4200 **" -ForegroundColor Green
Write-Host "  ✔ Compiled successfully." -ForegroundColor Green
Write-Host "`nThis takes 20-30 seconds on first compile...`n" -ForegroundColor Gray
Write-Host "═══════════════════════════════════════════════════════════════`n" -ForegroundColor Cyan

# Start the server (don't open browser automatically)
npm start

# Script ends when server is stopped with Ctrl+C

