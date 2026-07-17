@echo off
echo Starting UGC NET Prep development servers...

echo [1/2] Launching Backend Server (port 5000)...
start "UGC NET Server (Backend)" cmd /k "npm run dev --prefix server"

echo [2/2] Launching Frontend Client (port 5173)...
start "UGC NET Client (Frontend)" cmd /k "npm run dev --prefix client"

echo.
echo Both servers have been launched in separate terminal windows!
echo Keep those windows open while developing.
echo.
pause
