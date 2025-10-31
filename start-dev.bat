@echo off
echo 🚀 Starting VirdisPay Development Environment
echo =============================================

REM Check if .env file exists
if not exist ".env" (
    echo ❌ .env file not found!
    echo Please copy env.example to .env and configure your settings
    pause
    exit /b 1
)

echo ✅ .env file found

echo.
echo 🔧 Starting Backend Server (Port 5000)...
start "Backend Server" cmd /k "npm start"

timeout /t 3 /nobreak >nul

echo 🎨 Starting Frontend Server (Port 3000)...
start "Frontend Server" cmd /k "cd client && npm start"

echo.
echo 🎉 Development servers starting!
echo =================================
echo Backend:  http://localhost:5000
echo Frontend: http://localhost:3000
echo.
echo 📋 To test the onboarding flow:
echo 1. Wait for both servers to fully start (30-60 seconds)
echo 2. Open http://localhost:3000 in your browser
echo 3. Click 'Sign Up' to register a new merchant
echo 4. Complete the onboarding flow
echo.
echo 💡 The onboarding flow includes:
echo • Subscription tier selection (Free/Starter/Professional/Enterprise)
echo • Wallet connection (Trust Wallet prioritized)
echo • Setup completion with summary
echo.
echo ⏳ Please wait for both servers to start...
pause

