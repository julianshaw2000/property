# ========================================
# MAINTAINUK AUTHENTICATION TEST SUITE
# ========================================

$ErrorActionPreference = "Stop"
$baseUrl = "http://localhost:5000/api/v1"

Write-Host "`n=========================================" -ForegroundColor Cyan
Write-Host "  MAINTAINUK AUTH TESTING" -ForegroundColor Cyan
Write-Host "=========================================`n" -ForegroundColor Cyan

$testsPassed = 0
$testsFailed = 0

# TEST 1: Register a new user
Write-Host "=== TEST 1: Register New Organization ===" -ForegroundColor Yellow
$timestamp = (Get-Date).Ticks
$testEmail = "test$timestamp@example.co.uk"
$testPassword = "SecurePass123!"
$body = @{
    email = $testEmail
    password = $testPassword
    firstName = "Test"
    lastName = "User"
    orgName = "Test Org $timestamp"
}

try {
    $response = Invoke-RestMethod -Uri "$baseUrl/auth/register" -Method POST -Body ($body | ConvertTo-Json) -ContentType "application/json"
    Write-Host "✅ PASS - Registration successful" -ForegroundColor Green
    Write-Host "User ID: $($response.data.userId)"
    Write-Host "Org ID: $($response.data.orgId)"

    $userId = $response.data.userId
    $orgId = $response.data.orgId
    $accessToken = $response.data.accessToken
    $refreshToken = $response.data.refreshToken
    $testsPassed++
} catch {
    Write-Host "❌ FAIL - $($_.Exception.Message)" -ForegroundColor Red
    $testsFailed++
}

# TEST 2: Login with the same user
Write-Host "`n=== TEST 2: Login with Registered User ===" -ForegroundColor Yellow
$body = @{
    email = $testEmail
    password = $testPassword
}

try {
    $response = Invoke-RestMethod -Uri "$baseUrl/auth/login" -Method POST -Body ($body | ConvertTo-Json) -ContentType "application/json"
    Write-Host "✅ PASS - Login successful" -ForegroundColor Green
    Write-Host "User ID: $($response.data.userId)"
    Write-Host "Org ID: $($response.data.orgId)"

    $accessToken = $response.data.accessToken
    $refreshToken = $response.data.refreshToken
    $testsPassed++
} catch {
    Write-Host "❌ FAIL - $($_.Exception.Message)" -ForegroundColor Red
    if ($_.ErrorDetails) {
        Write-Host "Details: $($_.ErrorDetails.Message)"
    }
    $testsFailed++
}

# TEST 3: Login with wrong password
Write-Host "`n=== TEST 3: Login with Wrong Password ===" -ForegroundColor Yellow
$body = @{
    email = $testEmail
    password = "WrongPassword123!"
}

try {
    $response = Invoke-RestMethod -Uri "$baseUrl/auth/login" -Method POST -Body ($body | ConvertTo-Json) -ContentType "application/json"
    Write-Host "❌ FAIL - Should have been unauthorized" -ForegroundColor Red
    $testsFailed++
} catch {
    if ($_.Exception.Response.StatusCode.value__ -eq 401) {
        Write-Host "✅ PASS - Correctly rejected wrong password" -ForegroundColor Green
        $testsPassed++
    } else {
        Write-Host "❌ FAIL - Wrong error code: $($_.Exception.Response.StatusCode.value__)" -ForegroundColor Red
        $testsFailed++
    }
}

# TEST 4: Refresh token
Write-Host "`n=== TEST 4: Refresh Token ===" -ForegroundColor Yellow
$body = @{
    refreshToken = $refreshToken
}

try {
    $response = Invoke-RestMethod -Uri "$baseUrl/auth/refresh" -Method POST -Body ($body | ConvertTo-Json) -ContentType "application/json"
    Write-Host "✅ PASS - Token refresh successful" -ForegroundColor Green
    Write-Host "New Access Token generated"

    $oldRefreshToken = $refreshToken
    $accessToken = $response.data.accessToken
    $refreshToken = $response.data.refreshToken
    $testsPassed++
} catch {
    Write-Host "❌ FAIL - $($_.Exception.Message)" -ForegroundColor Red
    if ($_.ErrorDetails) {
        Write-Host "Details: $($_.ErrorDetails.Message)"
    }
    $testsFailed++
}

# TEST 5: Try to reuse old refresh token (should fail)
Write-Host "`n=== TEST 5: Reuse Old Refresh Token (Should Fail) ===" -ForegroundColor Yellow
$body = @{
    refreshToken = $oldRefreshToken  # Old token, already used
}

try {
    $response = Invoke-RestMethod -Uri "$baseUrl/auth/refresh" -Method POST -Body ($body | ConvertTo-Json) -ContentType "application/json"
    Write-Host "❌ FAIL - Should have been unauthorized (token already used)" -ForegroundColor Red
    $testsFailed++
} catch {
    if ($_.Exception.Response.StatusCode.value__ -eq 401) {
        Write-Host "✅ PASS - Correctly rejected reused refresh token" -ForegroundColor Green
        $testsPassed++
    } else {
        Write-Host "❌ FAIL - Wrong error code: $($_.Exception.Response.StatusCode.value__)" -ForegroundColor Red
        $testsFailed++
    }
}

# TEST 6: Register with duplicate email (should fail)
Write-Host "`n=== TEST 6: Register with Duplicate Email (Should Fail) ===" -ForegroundColor Yellow
$body = @{
    email = $testEmail  # Same email as TEST 1
    password = "AnotherPass123!"
    firstName = "Another"
    lastName = "User"
    orgName = "Another Org"
}

try {
    $response = Invoke-RestMethod -Uri "$baseUrl/auth/register" -Method POST -Body ($body | ConvertTo-Json) -ContentType "application/json"
    Write-Host "❌ FAIL - Should have been rejected (duplicate email)" -ForegroundColor Red
    $testsFailed++
} catch {
    if ($_.Exception.Response.StatusCode.value__ -eq 400) {
        $error = $_.ErrorDetails.Message | ConvertFrom-Json
        if ($error.error.code -eq "USER_EXISTS") {
            Write-Host "✅ PASS - Correctly rejected duplicate email" -ForegroundColor Green
            $testsPassed++
        } else {
            Write-Host "❌ FAIL - Wrong error code: $($error.error.code)" -ForegroundColor Red
            $testsFailed++
        }
    } else {
        Write-Host "❌ FAIL - Wrong status code: $($_.Exception.Response.StatusCode.value__)" -ForegroundColor Red
        $testsFailed++
    }
}

# TEST 7: Login with non-existent user
Write-Host "`n=== TEST 7: Login with Non-Existent User ===" -ForegroundColor Yellow
$body = @{
    email = "nonexistent@example.com"
    password = "SomePassword123!"
}

try {
    $response = Invoke-RestMethod -Uri "$baseUrl/auth/login" -Method POST -Body ($body | ConvertTo-Json) -ContentType "application/json"
    Write-Host "❌ FAIL - Should have been unauthorized" -ForegroundColor Red
    $testsFailed++
} catch {
    if ($_.Exception.Response.StatusCode.value__ -eq 401) {
        Write-Host "✅ PASS - Correctly rejected non-existent user" -ForegroundColor Green
        $testsPassed++
    } else {
        Write-Host "❌ FAIL - Wrong error code: $($_.Exception.Response.StatusCode.value__)" -ForegroundColor Red
        $testsFailed++
    }
}

# Summary
Write-Host "`n=========================================" -ForegroundColor Cyan
Write-Host "  TEST SUITE COMPLETED" -ForegroundColor Cyan
Write-Host "=========================================`n" -ForegroundColor Cyan
Write-Host "Tests Passed: $testsPassed" -ForegroundColor Green
Write-Host "Tests Failed: $testsFailed" -ForegroundColor $(if ($testsFailed -eq 0) { "Green" } else { "Red" })
Write-Host ""

if ($testsFailed -gt 0) {
    exit 1
}

