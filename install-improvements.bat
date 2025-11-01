@echo off
echo ========================================
echo  TexMaintain - Installation Improvements
echo ========================================
echo.

cd server

echo [1/4] Installing new dependencies...
call npm install

echo.
echo [2/4] Checking .env file...
if not exist .env (
    echo .env file not found. Creating from .env.example...
    copy .env.example .env
    echo.
    echo ⚠️  IMPORTANT: Please edit server\.env and configure:
    echo    - DATABASE_URL
    echo    - JWT_SECRET (minimum 32 characters)
    echo    - SESSION_SECRET
    echo    - FRONTEND_URL
    echo.
    pause
) else (
    echo ✅ .env file already exists
)

echo.
echo [3/4] Validating environment...
node -e "require('dotenv').config(); const { validateEnv } = require('./config/validateEnv'); validateEnv();"

if errorlevel 1 (
    echo.
    echo ❌ Environment validation failed!
    echo Please check your .env file and ensure all required variables are set.
    pause
    exit /b 1
)

echo.
echo [4/4] Testing server startup...
echo Starting server for 5 seconds to verify configuration...
timeout /t 2 /nobreak >nul
start /b npm run dev
timeout /t 5 /nobreak >nul
taskkill /f /im node.exe >nul 2>&1

echo.
echo ========================================
echo  ✅ Installation Complete!
echo ========================================
echo.
echo Next steps:
echo 1. Review server\.env configuration
echo 2. Start the server: cd server ^&^& npm run dev
echo 3. Test health check: curl http://localhost:3000/api/health
echo.
echo For more information, see INSTALLATION_AMELIORATIONS.md
echo.
pause
