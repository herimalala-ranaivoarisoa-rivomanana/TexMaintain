@echo off
echo ========================================
echo   Redemarrage du Backend
echo ========================================
echo.

echo Arret des processus Node existants...
taskkill /F /IM node.exe 2>nul
if %errorlevel% equ 0 (
    echo Processus Node arretes.
) else (
    echo Aucun processus Node en cours.
)

timeout /t 2 /nobreak >nul

echo.
echo Installation des dependances...
cd server
call npm install

echo.
echo Demarrage du serveur backend avec nodemon...
start "TexMaintain Backend" cmd /k "cd /d %~dp0server && npm run dev"

echo.
echo ========================================
echo   Backend redemarre !
echo ========================================
echo   URL: http://localhost:5000
echo ========================================
echo.
pause
