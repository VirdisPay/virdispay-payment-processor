# Start Development Servers
# This script starts both the backend and frontend servers

Write-Host "🚀 Starting VirdisPay Development Environment" -ForegroundColor Green
Write-Host "=============================================" -ForegroundColor Green

# Check if .env file exists
if (-not (Test-Path ".env")) {
    Write-Host "❌ .env file not found!" -ForegroundColor Red
    Write-Host "Please copy env.example to .env and configure your settings" -ForegroundColor Yellow
    exit 1
}

Write-Host "✅ .env file found" -ForegroundColor Green

# Start backend server
Write-Host "`n🔧 Starting Backend Server (Port 5000)..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PWD'; npm start" -WindowStyle Normal

# Wait a moment for backend to start
Start-Sleep 3

# Start frontend server
Write-Host "🎨 Starting Frontend Server (Port 3000)..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PWD\client'; npm start" -WindowStyle Normal

Write-Host "`n🎉 Development servers starting!" -ForegroundColor Green
Write-Host "=================================" -ForegroundColor Green
Write-Host "Backend:  http://localhost:5000" -ForegroundColor Cyan
Write-Host "Frontend: http://localhost:3000" -ForegroundColor Cyan
Write-Host "`n📋 To test the onboarding flow:" -ForegroundColor White
Write-Host "1. Wait for both servers to fully start (30-60 seconds)" -ForegroundColor White
Write-Host "2. Open http://localhost:3000 in your browser" -ForegroundColor White
Write-Host "3. Click 'Sign Up' to register a new merchant" -ForegroundColor White
Write-Host "4. Complete the onboarding flow" -ForegroundColor White
Write-Host "`n💡 The onboarding flow includes:" -ForegroundColor White
Write-Host "• Subscription tier selection (Free/Starter/Professional/Enterprise)" -ForegroundColor White
Write-Host "• Wallet connection (Trust Wallet prioritized)" -ForegroundColor White
Write-Host "• Setup completion with summary" -ForegroundColor White

Write-Host "`n⏳ Please wait for both servers to start..." -ForegroundColor Yellow

