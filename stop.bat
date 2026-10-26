@echo off
setlocal
title HomeHue Shutdown

echo ============================================================
echo   Stopping HomeHue: Master AI Architectural Studio
echo ============================================================
echo.

echo [1/2] Closing HomeHue terminal windows...
taskkill /FI "WINDOWTITLE eq HomeHue_Server*" /T /F >nul 2>&1

echo [2/2] Stopping HomeHue processes and freeing port 8000...
powershell -NoProfile -Command "Get-CimInstance Win32_Process | Where-Object { $_.CommandLine -like '*app.py*' } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }" >nul 2>&1
powershell -NoProfile -Command "try { Get-NetTCPConnection -LocalPort 8000 -ErrorAction Stop | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue } } catch {}" >nul 2>&1

echo.
echo ============================================================
echo   All HomeHue servers and terminals have been STOPPED.
echo ============================================================
echo.
exit /b 0
