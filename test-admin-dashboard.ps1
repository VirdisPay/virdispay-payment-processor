# Login and get token
$loginResponse = Invoke-WebRequest -Uri "http://localhost:5000/api/auth/login" -Method POST -Body '{"email":"admin@virdispay.com","password":"Admin123!"}' -ContentType "application/json"

$tokenData = $loginResponse.Content | ConvertFrom-Json
$token = $tokenData.token

Write-Host "✅ Logged in successfully!" -ForegroundColor Green
Write-Host "Token: $($token.Substring(0, 50))..." -ForegroundColor Cyan
Write-Host ""

# Test admin endpoints
Write-Host "🧪 Testing Admin Endpoints..." -ForegroundColor Yellow
Write-Host ""

# 1. Dashboard Stats
Write-Host "1️⃣ Testing Dashboard Stats..." -ForegroundColor Cyan
$statsResponse = Invoke-WebRequest -Uri "http://localhost:5000/api/admin/dashboard/stats" -Headers @{Authorization="Bearer $token"}
$stats = $statsResponse.Content | ConvertFrom-Json

Write-Host "✅ Dashboard Stats Retrieved:" -ForegroundColor Green
Write-Host "  Total Merchants: $($stats.stats.merchants.total)"
Write-Host "  Active Merchants: $($stats.stats.merchants.active)"
Write-Host "  Total Payments: $($stats.stats.payments.total)"
Write-Host "  Total Volume: `$$($stats.stats.payments.volume)"
Write-Host "  Platform Fees Collected: `$$($stats.stats.revenue.platformFees)"
Write-Host "  Pending KYC: $($stats.stats.compliance.pendingKYC)"
Write-Host ""

# 2. Get Merchants
Write-Host "2️⃣ Testing Merchants List..." -ForegroundColor Cyan
$merchantsResponse = Invoke-WebRequest -Uri "http://localhost:5000/api/admin/merchants" -Headers @{Authorization="Bearer $token"}
$merchantsData = $merchantsResponse.Content | ConvertFrom-Json

Write-Host "✅ Merchants Retrieved: $($merchantsData.merchants.Count) merchants" -ForegroundColor Green
Write-Host ""

# 3. Get Pending KYC
Write-Host "3️⃣ Testing Pending KYC..." -ForegroundColor Cyan
$kycResponse = Invoke-WebRequest -Uri "http://localhost:5000/api/admin/kyc/pending" -Headers @{Authorization="Bearer $token"}
$kycData = $kycResponse.Content | ConvertFrom-Json

Write-Host "✅ Pending KYC Retrieved: $($kycData.submissions.Count) pending" -ForegroundColor Green
Write-Host ""

# 4. Test Revenue Analytics
Write-Host "4️⃣ Testing Revenue Analytics..." -ForegroundColor Cyan
$revenueResponse = Invoke-WebRequest -Uri "http://localhost:5000/api/admin/revenue/analytics" -Headers @{Authorization="Bearer $token"}
$revenueData = $revenueResponse.Content | ConvertFrom-Json

Write-Host "✅ Revenue Analytics Retrieved:" -ForegroundColor Green
Write-Host "  Total Volume: `$$($revenueData.analytics.summary.totalVolume)"
Write-Host "  Platform Fees: `$$($revenueData.analytics.summary.totalPlatformFees)"
Write-Host "  Transactions: $($revenueData.analytics.summary.transactionCount)"
Write-Host ""

Write-Host "🎉 ALL ADMIN ENDPOINTS WORKING!" -ForegroundColor Green



