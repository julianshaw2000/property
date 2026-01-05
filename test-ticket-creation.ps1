# Complete Ticket Creation Test Script
# This tests the entire flow: Register -> Seed -> List Units -> Create Ticket

Write-Host "`n══════════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "          🧪 COMPLETE TICKET CREATION TEST" -ForegroundColor Yellow
Write-Host "══════════════════════════════════════════════════════════════════`n" -ForegroundColor Cyan

$baseUrl = "http://localhost:5000/api/v1"

# Step 1: Register/Login
Write-Host "1️⃣  Authenticating..." -ForegroundColor Cyan
$email = "tickettest@test.com"
$password = "Test123!"

try {
    $registerData = @{
        email = $email
        password = $password
        orgName = "Test Property Co"
        firstName = "Test"
        lastName = "User"
    } | ConvertTo-Json

    $auth = Invoke-RestMethod -Uri "$baseUrl/auth/register" `
        -Method POST -Body $registerData -ContentType "application/json"

    Write-Host "   ✅ Registered new user" -ForegroundColor Green
} catch {
    $loginData = @{
        email = $email
        password = $password
    } | ConvertTo-Json

    $auth = Invoke-RestMethod -Uri "$baseUrl/auth/login" `
        -Method POST -Body $loginData -ContentType "application/json"

    Write-Host "   ✅ Logged in" -ForegroundColor Green
}

$token = $auth.data.accessToken
$headers = @{
    "Authorization" = "Bearer $token"
    "Content-Type" = "application/json"
}

# Step 2: Seed test data
Write-Host "`n2️⃣  Seeding test units..." -ForegroundColor Cyan
try {
    $seedResponse = Invoke-RestMethod -Uri "http://localhost:5000/api/dev/seed" `
        -Method POST -Headers $headers

    Write-Host "   ✅ Seeded: $($seedResponse.data.unitsCount) units" -ForegroundColor Green
} catch {
    Write-Host "   ⚠️  Seed failed (might already exist): $($_.Exception.Message)" -ForegroundColor Yellow
}

# Step 3: List units
Write-Host "`n3️⃣  Fetching available units..." -ForegroundColor Cyan
$unitsResponse = Invoke-RestMethod -Uri "$baseUrl/units" `
    -Method GET -Headers $headers

Write-Host "   ✅ Found $($unitsResponse.data.Count) units" -ForegroundColor Green

if ($unitsResponse.data.Count -eq 0) {
    Write-Host "   ❌ No units available! Cannot create ticket." -ForegroundColor Red
    exit 1
}

$firstUnit = $unitsResponse.data[0]
Write-Host "   📍 Using: $($firstUnit.unitNumber) - $($firstUnit.name)" -ForegroundColor Cyan

# Step 4: Create ticket
Write-Host "`n4️⃣  Creating ticket..." -ForegroundColor Cyan
$ticketData = @{
    unitId = $firstUnit.id
    title = "Leaking Kitchen Tap"
    category = "PLUMBING"
    priority = "ROUTINE"
    description = "The kitchen tap has been dripping constantly for 3 days"
    reportedByName = "John Smith"
    reportedByPhone = "+447700900123"
    reportedByEmail = "john@example.com"
} | ConvertTo-Json

try {
    $ticketResponse = Invoke-RestMethod -Uri "$baseUrl/tickets" `
        -Method POST -Body $ticketData -Headers $headers

    Write-Host "`n══════════════════════════════════════════════════════════════════" -ForegroundColor Green
    Write-Host "              ✅ TICKET CREATED SUCCESSFULLY! ✅" -ForegroundColor Green
    Write-Host "══════════════════════════════════════════════════════════════════`n" -ForegroundColor Green

    Write-Host "Ticket Number:  $($ticketResponse.data.ticketNumber)" -ForegroundColor Cyan
    Write-Host "Title:          $($ticketResponse.data.title)" -ForegroundColor White
    Write-Host "Unit:           $($ticketResponse.data.unitName)" -ForegroundColor White
    Write-Host "Property:       $($ticketResponse.data.propertyAddress)" -ForegroundColor White
    Write-Host "Status:         $($ticketResponse.data.status)" -ForegroundColor White
    Write-Host "Priority:       $($ticketResponse.data.priority)" -ForegroundColor White
    Write-Host "Category:       $($ticketResponse.data.category)" -ForegroundColor White
    Write-Host "Ticket ID:      $($ticketResponse.data.id)" -ForegroundColor Gray

    Write-Host "`n✅ ALL TESTS PASSED! Ticket creation is working!`n" -ForegroundColor Green

} catch {
    Write-Host "`n❌ TICKET CREATION FAILED!" -ForegroundColor Red
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Yellow

    if ($_.ErrorDetails) {
        Write-Host "`nDetails:" -ForegroundColor Yellow
        Write-Host $_.ErrorDetails.Message -ForegroundColor Gray
    }

    exit 1
}

Write-Host "══════════════════════════════════════════════════════════════════`n" -ForegroundColor Cyan
