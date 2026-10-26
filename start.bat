@echo off
setlocal
title HomeHue Launcher

echo ============================================================
echo   Starting HomeHue: Master AI Architectural Studio
echo ============================================================
echo.

cd /d "%~dp0"

:: Check if Python is installed
where python >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo [ERROR] Python was not found in your system PATH.
    echo Please install Python 3 or add it to PATH and try again.
    echo.
    pause
    exit /b 1
)

:: Ensure previous instances and port 8000 are cleanly stopped
echo [1/3] Ensuring clean environment...
call stop.bat >nul 2>&1

:: Launch the server in a dedicated visible terminal window
echo [2/3] Launching HomeHue Studio server...
start "HomeHue_Server" cmd /c "title HomeHue_Server && python app.py"

:: Allow server a moment to bind and open browser
echo [3/3] Waiting for server on http://localhost:8000...
timeout /t 2 /nobreak >nul 2>&1

echo.
echo ============================================================
echo   HomeHue is now RUNNING!
echo   Live Studio URL: http://localhost:8000/HomeHue_MasterAI.html
echo   To stop all servers and terminals, run stop.bat
echo ============================================================
echo.

exit /b 0
