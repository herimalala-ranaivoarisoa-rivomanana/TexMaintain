@echo off
echo ========================================
echo   TexMaintain - Demarrage Developpement
echo ========================================
echo.

echo [1/3] Installation des dependances...
cd server
call npm install
if %errorlevel% neq 0 (
    echo ERREUR: Installation des dependances serveur echouee
    pause
    exit /b 1
)

echo.
echo [2/3] Demarrage du serveur backend avec nodemon...
start "TexMaintain Backend" cmd /k "cd /d %~dp0server && npm run dev"

timeout /t 3 /nobreak >nul

echo.
echo [3/3] Demarrage du frontend...
cd ..\client
start "TexMaintain Frontend" cmd /k "cd /d %~dp0client && npm run dev"

echo.
echo ========================================
echo   Serveurs demarres !
echo ========================================
echo   Backend:  http://localhost:5000
echo   Frontend: http://localhost:5173
echo ========================================
echo.
echo Appuyez sur une touche pour fermer cette fenetre...
pause >nul
