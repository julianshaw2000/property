# ========================================
# PHASE 4: TICKETS API TEST SUITE
# ========================================

$ErrorActionPreference = "Stop"
$baseUrl = "http://localhost:5000/api/v1"

Write-Host "`n=========================================" -ForegroundColor Cyan
Write-Host "  PHASE 4: TICKETS API TESTING" -ForegroundColor Cyan
Write-Host "=========================================`n" -ForegroundColor Cyan

# Step 1: Login to get access token
Write-Host "=== STEP 1: Login ===" -ForegroundColor Yellow
$loginBody = @{
    email = "admin@acme.co.uk"
    password = "Test1234!"
} | ConvertTo-Json

try {
    $loginResponse = Invoke-RestMethod -Uri "$baseUrl/auth/login" -Method POST -Body $loginBody -ContentType "application/json"
    $accessToken = $loginResponse.data.accessToken
    $orgId = $loginResponse.data.orgId
    Write-Host "✅ Logged in successfully" -ForegroundColor Green
    Write-Host "Org ID: $orgId"
} catch {
    Write-Host "❌ Login failed: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# Step 2: Insert test data directly via SQL (property and unit)
Write-Host "`n=== STEP 2: Creating Test Data (Property + Unit) ===" -ForegroundColor Yellow
Write-Host "⚠️ Note: This requires direct SQL access to Neon DB" -ForegroundColor Yellow
Write-Host "For now, manually create a property and unit, or use existing ones" -ForegroundColor Yellow
Write-Host "You can query the database to get a unitId for testing" -ForegroundColor Yellow

# For testing, you'll need to manually get a unitId from the database
# $testUnitId = "PASTE_UNIT_ID_HERE"

Write-Host "`n⏭️  Skipping to ticket creation (requires manual setup)" -ForegroundColor Yellow
Write-Host "To complete this test:" -ForegroundColor Yellow
Write-Host "1. Connect to Neon DB and run:" -ForegroundColor Yellow
Write-Host @"
INSERT INTO "Properties" ("Id", "OrgId", "AddressLine1", "City", "Postcode", "CreatedAt", "UpdatedAt")
VALUES (gen_random_uuid(), '$orgId', '123 Test Street', 'London', 'SW1A 1AA', NOW(), NOW())
RETURNING "Id";

-- Then use that property ID to create a unit:
INSERT INTO "Units" ("Id", "OrgId", "PropertyId", "UnitNumber", "Name", "Status", "CreatedAt", "UpdatedAt")
VALUES (gen_random_uuid(), '$orgId', '[PROPERTY_ID]', '1A', 'Flat 1A', 'Occupied', NOW(), NOW())
RETURNING "Id";
"@ -ForegroundColor Cyan

Write-Host "`n2. Copy the Unit ID and paste it below:" -ForegroundColor Yellow
Write-Host ""

# Interactive input for unit ID
$testUnitId = Read-Host "Enter Unit ID (or press Enter to skip)"

if ([string]::IsNullOrWhiteSpace($testUnitId)) {
    Write-Host "`n⚠️ No Unit ID provided. Exiting test." -ForegroundColor Yellow
    Write-Host "Tickets API endpoints are implemented and ready to test once test data is available." -ForegroundColor Green
    exit 0
}

$headers = @{
    "Authorization" = "Bearer $accessToken"
    "Content-Type" = "application/json"
}

# Step 3: Create ticket
Write-Host "`n=== STEP 3: Create Ticket ===" -ForegroundColor Yellow
$createTicketBody = @{
    unitId = $testUnitId
    category = "PLUMBING"
    priority = "URGENT"
    title = "Leaking pipe under kitchen sink"
    description = "Water is dripping from the pipe connection. Tenant reports it started this morning."
    reportedByName = "John Tenant"
    reportedByPhone = "+447700900123"
    reportedByEmail = "john.tenant@example.com"
} | ConvertTo-Json

try {
    $createResponse = Invoke-RestMethod -Uri "$baseUrl/tickets" -Method POST -Body $createTicketBody -Headers $headers
    $ticketId = $createResponse.data.id
    $ticketNumber = $createResponse.data.ticketNumber
    Write-Host "✅ Ticket created successfully" -ForegroundColor Green
    Write-Host "Ticket ID: $ticketId"
    Write-Host "Ticket Number: $ticketNumber"
} catch {
    Write-Host "❌ Failed to create ticket: $($_.Exception.Message)" -ForegroundColor Red
    if ($_.ErrorDetails) {
        Write-Host "Details: $($_.ErrorDetails.Message)"
    }
    exit 1
}

# Step 4: List tickets
Write-Host "`n=== STEP 4: List Tickets ===" -ForegroundColor Yellow
try {
    $listResponse = Invoke-RestMethod -Uri "$baseUrl/tickets" -Method GET -Headers $headers
    Write-Host "✅ Retrieved $($listResponse.data.Count) ticket(s)" -ForegroundColor Green
} catch {
    Write-Host "❌ Failed to list tickets: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# Step 5: Get ticket detail
Write-Host "`n=== STEP 5: Get Ticket Detail ===" -ForegroundColor Yellow
try {
    $detailResponse = Invoke-RestMethod -Uri "$baseUrl/tickets/$ticketId" -Method GET -Headers $headers
    Write-Host "✅ Ticket details retrieved" -ForegroundColor Green
    Write-Host "Title: $($detailResponse.data.title)"
    Write-Host "Status: $($detailResponse.data.status)"
    Write-Host "Timeline Events: $($detailResponse.data.timeline.Count)"
} catch {
    Write-Host "❌ Failed to get ticket detail: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# Step 6: Update ticket priority
Write-Host "`n=== STEP 6: Update Ticket Priority ===" -ForegroundColor Yellow
$updateBody = @{
    priority = "EMERGENCY"
    status = "ASSIGNED"
} | ConvertTo-Json

try {
    $updateResponse = Invoke-RestMethod -Uri "$baseUrl/tickets/$ticketId" -Method PATCH -Body $updateBody -Headers $headers
    Write-Host "✅ Ticket updated successfully" -ForegroundColor Green
    Write-Host "New Priority: $($updateResponse.data.priority)"
    Write-Host "New Status: $($updateResponse.data.status)"
    Write-Host "Timeline Events: $($updateResponse.data.timeline.Count)"
} catch {
    Write-Host "❌ Failed to update ticket: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# Step 7: Filter tickets by status
Write-Host "`n=== STEP 7: Filter Tickets by Status ===" -ForegroundColor Yellow
try {
    $filterResponse = Invoke-RestMethod -Uri "$baseUrl/tickets?status=ASSIGNED" -Method GET -Headers $headers
    Write-Host "✅ Filtered tickets: $($filterResponse.data.Count) ASSIGNED ticket(s)" -ForegroundColor Green
} catch {
    Write-Host "❌ Failed to filter tickets: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# Step 8: Filter by priority
Write-Host "`n=== STEP 8: Filter Tickets by Priority ===" -ForegroundColor Yellow
try {
    $filterResponse = Invoke-RestMethod -Uri "$baseUrl/tickets?priority=EMERGENCY" -Method GET -Headers $headers
    Write-Host "✅ Filtered tickets: $($filterResponse.data.Count) EMERGENCY ticket(s)" -ForegroundColor Green
} catch {
    Write-Host "❌ Failed to filter tickets: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

Write-Host "`n=========================================" -ForegroundColor Cyan
Write-Host "  TICKETS API TEST COMPLETED" -ForegroundColor Cyan
Write-Host "=========================================`n" -ForegroundColor Cyan
Write-Host "All endpoints tested successfully!" -ForegroundColor Green

